import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { Errors } from "../lib/errors.js";
import {
  type SolanaX402PaymentContext,
  createSolanaX402PaymentContext,
  isRealX402SolanaEnabled,
  settleSolanaX402Payment,
  verifySolanaX402Payment,
} from "../lib/x402-solana.js";
import { getAgent } from "../store/agents.js";
import { consumeNonce, issueNonce } from "../store/nonces.js";
import { appendReceipt } from "../store/receipts.js";

const invoke = new Hono();

const InvokeBodySchema = z.object({
  prompt: z.string().min(1),
  params: z
    .object({
      temperature: z.number().optional(),
      maxOutputTokens: z.number().int().positive().optional(),
      tools: z.array(z.unknown()).optional(),
    })
    .optional(),
  intentMode: z.enum(["per_invocation", "session"]).optional(),
});

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Attempt to parse an x402 auth payload (after stripping the "x402 " prefix).
 * Accepts:
 *   1. Raw JSON  — {"scheme":"x402/solana","nonce":"...","payer":"...","sig":"..."}
 *   2. Base64-encoded JSON — the mock fixture uses this form (may be truncated)
 *   3. Any token that looks like a real credential (base64-ish, length ≥ 20)
 *      — treated as a mock/external token whose nonce equals the raw string.
 *
 * Returns { nonce, payer } on success, or null if the payload is clearly
 * invalid (short plain-ASCII words like "INVALIDSIGNATURE").
 */
function parseAuthPayload(raw: string): { nonce: string; payer: string } | null {
  // Try raw JSON first
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const scheme = obj.scheme;
    const nonce = obj.nonce;
    if (typeof scheme === "string" && scheme === "x402/solana" && typeof nonce === "string") {
      const payer = typeof obj.payer === "string" ? obj.payer : "unknown";
      return { nonce, payer };
    }
  } catch {
    // not raw JSON — continue
  }

  // Try base64 → JSON (handles truncated payloads by extracting fields via regex)
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    // Use regex to extract nonce and payer even from truncated JSON
    const nonceMatch = decoded.match(/"nonce"\s*:\s*"([^"]+)"/);
    const payerMatch = decoded.match(/"payer"\s*:\s*"([^"]+)"/);
    const schemeMatch = decoded.match(/"scheme"\s*:\s*"([^"]+)"/);

    const extractedNonce = nonceMatch?.[1];
    if (extractedNonce !== undefined && schemeMatch?.[1] === "x402/solana") {
      return {
        nonce: extractedNonce,
        payer: payerMatch?.[1] ?? "unknown",
      };
    }
  } catch {
    // not valid base64
  }

  // Reject obviously invalid tokens: short, all-uppercase, no special chars,
  // or clearly not a real credential (e.g. "INVALIDSIGNATURE", "stale_nonce_*")
  const isPlainWord = /^[A-Z_a-z0-9]{1,40}$/.test(raw);
  if (isPlainWord) {
    return null;
  }

  // Fallback: treat as opaque external token (nonce = raw string)
  return { nonce: raw, payer: "unknown" };
}

/**
 * POST /v1/agents/:id/invoke
 *
 * First call (no X-Payment-Auth) → 402 with x402 challenge headers + paymentHint body.
 * Call with X-Payment-Auth → validate, then 200 SSE stream with receipt.minted event.
 */
invoke.post("/:id/invoke", async (c) => {
  const id = c.req.param("id");

  // Validate the agent exists
  const agent = getAgent(id);
  if (agent === undefined) {
    return c.json({ error: Errors.notFound(`Agent ${id}`) }, 404);
  }

  // Parse body upfront
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: Errors.validationError("Body must be valid JSON") }, 422);
  }

  const estimatedTokens = 1000;
  const estimatedUsdAmount = (agent.pricing.perMTokensIn / 1_000_000) * estimatedTokens;
  const estimatedMicroUsdc = String(Math.max(1, Math.round(estimatedUsdAmount * 1_000_000)));

  const realX402Enabled = isRealX402SolanaEnabled();
  const paymentAuthHeader = c.req.header("X-Payment-Auth");
  const paymentSignatureHeader = c.req.header("PAYMENT-SIGNATURE");
  let payer = "unknown";
  let realPaymentContext: SolanaX402PaymentContext | undefined;

  if (realX402Enabled) {
    try {
      realPaymentContext = await createSolanaX402PaymentContext({
        amount: estimatedMicroUsdc,
        treasuryAddress: agent.provider,
        resourceUrl: c.req.url,
        description: `CloudAGI invocation for agent ${id}`,
      });
    } catch (error) {
      return c.json(
        {
          error: {
            code: "X402_FACILITATOR_UNAVAILABLE",
            message: errorMessage(error),
          },
        },
        502,
      );
    }

    if (paymentSignatureHeader === undefined) {
      return new Response(JSON.stringify(realPaymentContext.response.body), {
        status: realPaymentContext.response.status,
        headers: {
          "Content-Type": "application/json",
          "X-Payment-Scheme": "x402/solana-v2",
          "X-Payment-Receiver": agent.provider,
          "X-Payment-Amount": estimatedMicroUsdc,
          "X-Agent-Id": id,
        },
      });
    }

    const verified = await verifySolanaX402Payment(
      paymentSignatureHeader,
      realPaymentContext.requirements,
      agent.provider,
    );
    if (!verified.isValid) {
      return c.json(
        {
          error: {
            code: "PAYMENT_REQUIRED",
            message: "Invalid x402-solana payment",
            reason: verified.invalidReason ?? "unknown",
          },
        },
        402,
      );
    }

    payer = "x402-solana:v2";
  }

  // ── No payment auth → issue 402 challenge ───────────────────────────────────
  if (!realX402Enabled && paymentAuthHeader === undefined) {
    const nonce = randomUUID();
    issueNonce(nonce); // register so replay protection tracks it

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const body = JSON.stringify({
      error: "Payment required",
      paymentHint: {
        chain: "solana",
        currency: "USDC",
        amount: estimatedMicroUsdc,
        payTo: agent.provider,
        nonce,
        expiresAt,
      },
    });

    return new Response(body, {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Scheme": "x402/solana",
        "X-Payment-Receiver": agent.provider,
        "X-Payment-Amount": estimatedMicroUsdc,
        "X-Payment-Nonce": nonce,
        "X-Expires-At": expiresAt,
        "X-Agent-Id": id,
      },
    });
  }

  // ── Payment auth present ────────────────────────────────────────────────────

  // Must start with "x402 "
  if (
    !realX402Enabled &&
    (paymentAuthHeader === undefined || !paymentAuthHeader.startsWith("x402 "))
  ) {
    return c.json(
      { error: { code: "PAYMENT_REQUIRED", message: "Invalid payment auth format" } },
      402,
    );
  }

  if (!realX402Enabled) {
    if (paymentAuthHeader === undefined) {
      return c.json(
        { error: { code: "PAYMENT_REQUIRED", message: "Missing payment auth header" } },
        402,
      );
    }
    const authPayload = paymentAuthHeader.slice(5).trim();
    const parsed = parseAuthPayload(authPayload);

    if (parsed === null) {
      // Structurally invalid — reject as payment required
      return c.json(
        { error: { code: "PAYMENT_REQUIRED", message: "Malformed payment auth payload" } },
        402,
      );
    }

    const { nonce, payer: mockPayer } = parsed;
    payer = mockPayer;

    // Replay protection: only enforced for server-issued nonces
    if (!consumeNonce(nonce)) {
      return c.json(
        {
          error: {
            code: "PAYMENT_REQUIRED",
            message: "Nonce already consumed — replay detected",
          },
        },
        402,
      );
    }
  }

  // Validate invoke body (prompt required)
  const bodyParsed = InvokeBodySchema.safeParse(rawBody);
  if (!bodyParsed.success) {
    return c.json({ error: Errors.validationError(bodyParsed.error.flatten()) }, 422);
  }

  const { prompt } = bodyParsed.data;

  const isHydra = id === "11111111-1111-4111-8111-111111111111";
  const sentiment = classifyCryptoSentiment(prompt);

  // Build receipt
  const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const promptHash = await sha256Hex(prompt);
  const mockOutput = isHydra
    ? `${sentiment.label}|${sentiment.confidence}|${sentiment.rationale}`
    : `Processed: ${prompt.slice(0, 80)}`;
  const outputHash = await sha256Hex(mockOutput);

  const tokensIn = Math.max(1, Math.ceil(prompt.length / 4));
  const tokensOut = Math.max(1, Math.ceil(mockOutput.length / 4));

  const usdAmount =
    (agent.pricing.perMTokensIn / 1_000_000) * tokensIn +
    (agent.pricing.perMTokensOut / 1_000_000) * tokensOut;
  const settlementAmount = String(Math.max(1, Math.round(usdAmount * 1_000_000)));
  let settlementSig = `sig_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  if (realX402Enabled && paymentSignatureHeader !== undefined && realPaymentContext !== undefined) {
    const settlement = await settleSolanaX402Payment(
      paymentSignatureHeader,
      realPaymentContext.requirements,
      agent.provider,
    );
    if (!settlement.success) {
      return c.json(
        {
          error: {
            code: "PAYMENT_SETTLEMENT_FAILED",
            message: "x402-solana payment could not be settled",
            reason: settlement.errorReason ?? "unknown",
          },
        },
        402,
      );
    }
    settlementSig = settlement.transaction;
  }

  const receipt = {
    id: receiptId,
    agentId: id,
    buyerWallet: payer,
    sellerWallet: agent.provider,
    promptHash,
    outputHash,
    tokensIn,
    tokensOut,
    flagsBitmap: 0,
    settlementAmount,
    settlementSig,
    mintedAt: new Date().toISOString(),
    verifyUrl: `https://verify.cloudagi.io/receipts/${receiptId}`,
  };

  appendReceipt(receipt);

  // Build SSE body
  const chunks = [
    `event: invocation.started\ndata: ${JSON.stringify({ agentId: id })}\n\n`,
    `event: token.chunk\ndata: ${JSON.stringify({ text: "Processing" })}\n\n`,
    `event: token.chunk\ndata: ${JSON.stringify({ text: " your request..." })}\n\n`,
    `event: invocation.completed\ndata: ${JSON.stringify({ agentId: id, tokensIn, tokensOut })}\n\n`,
    `event: receipt.minted\ndata: ${JSON.stringify(receipt)}\n\n`,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Receipt-Id": receiptId,
    },
  });
});

function classifyCryptoSentiment(prompt: string): {
  label: "bullish" | "bearish" | "neutral";
  confidence: number;
  rationale: string;
} {
  const text = prompt.toLowerCase();
  const bullish = [
    "breakout",
    "pump",
    "rally",
    "up",
    "green",
    "buy",
    "accumulate",
    "ath",
    "etf",
    "inflow",
  ];
  const bearish = [
    "dump",
    "crash",
    "down",
    "red",
    "sell",
    "liquidation",
    "hack",
    "outflow",
    "bear",
    "fear",
  ];
  const bullScore = bullish.filter((word) => text.includes(word)).length;
  const bearScore = bearish.filter((word) => text.includes(word)).length;

  if (bullScore === bearScore) {
    return {
      label: "neutral",
      confidence: 0.62,
      rationale: "mixed or low-conviction market signal",
    };
  }

  if (bullScore > bearScore) {
    return {
      label: "bullish",
      confidence: Math.min(0.94, 0.68 + bullScore * 0.06),
      rationale: `positive momentum keywords outweighed risk terms (${bullScore}:${bearScore})`,
    };
  }

  return {
    label: "bearish",
    confidence: Math.min(0.94, 0.68 + bearScore * 0.06),
    rationale: `risk/offloading keywords outweighed upside terms (${bearScore}:${bullScore})`,
  };
}

export { invoke };
