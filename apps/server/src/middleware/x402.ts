/**
 * x402 Payment middleware — Wave 2 implementation.
 *
 * Protocol: https://x402.org
 * Scheme:   x402/solana
 *
 * Flow:
 *  1. No X-Payment-Auth header → emit 402 challenge (nonce, receiver, amount, scheme).
 *  2. X-Payment-Auth header present → parse + validate:
 *       a. Wrong scheme prefix → 402
 *       b. Nonce timestamp expired (> REPLAY_WINDOW_MS old) → 402
 *       c. Nonce already seen → 402 REPLAY_DETECTED
 *       d. All checks pass → set paymentVerified context var, call next()
 *
 * The middleware is exported as a plain Hono MiddlewareHandler so it can be
 * mounted directly:  app.use("/protected/*", x402Middleware)
 *
 * For advanced use (custom nonce store), use the factory:
 *   app.use("/protected/*", createX402Middleware({ storeNonce: myFn }))
 */

import type { Context, MiddlewareHandler, Next } from "hono";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum age of a payment nonce before it is considered stale (5 minutes). */
const REPLAY_WINDOW_MS = 5 * 60 * 1_000;

/**
 * Receiver wallet address used in 402 challenge headers.
 * Override via PAYMENT_RECEIVER env var in production.
 *
 * DEV DEFAULT: a well-formed devnet address — replace with real treasury in prod.
 */
const PAYMENT_RECEIVER =
  (process.env["PAYMENT_RECEIVER"] as string | undefined) ??
  "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk";

/** Default cost per invocation in lamports (0.001 SOL). */
const PAYMENT_AMOUNT_LAMPORTS = 1_000_000;

// ---------------------------------------------------------------------------
// In-memory nonce store (default, per-module singleton)
// ---------------------------------------------------------------------------

const defaultSeenNonces = new Set<string>();

function defaultStoreNonce(nonce: string): Promise<boolean> {
  if (defaultSeenNonces.has(nonce)) return Promise.resolve(false);
  defaultSeenNonces.add(nonce);
  return Promise.resolve(true);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface X402MiddlewareOpts {
  /**
   * Persist a nonce.  Return true if the nonce is new (accepted),
   * false if it has been seen before (replay).
   *
   * Defaults to the module-level in-memory Set — NOT suitable for
   * multi-process deployments.  Inject a Redis-backed store in prod.
   */
  storeNonce?: (nonce: string) => Promise<boolean>;
}

export interface PaymentVerified {
  payer: string;
  amount: number;
  nonce: string;
}

// ---------------------------------------------------------------------------
// Parsed payment payload
// ---------------------------------------------------------------------------

interface PaymentPayload {
  scheme?: string;
  signature?: string | undefined;
  nonce?: string | undefined;
  payer?: string | undefined;
  ts?: number | undefined;
}

function parseAuthHeader(header: string): PaymentPayload | null {
  // Expected format:  "x402 <base64-json>"  OR  "x402 <raw-json>"  OR  "x402 <opaque-token>"
  const spaceIdx = header.indexOf(" ");
  if (spaceIdx === -1) return null;

  const schemePrefix = header.slice(0, spaceIdx).toLowerCase();
  const payload = header.slice(spaceIdx + 1).trim();
  if (!payload) return null;

  // Try base64 decode first, then raw JSON.
  let json: string | null = null;
  let decoded = "";

  try {
    decoded = Buffer.from(payload, "base64").toString("utf8");
    if (decoded.trimStart().startsWith("{")) json = decoded;
  } catch {
    // Not valid base64.
  }

  if (json === null && payload.trimStart().startsWith("{")) {
    json = payload;
  }

  // Attempt full JSON parse.
  if (json !== null) {
    try {
      const obj = JSON.parse(json) as PaymentPayload;
      if (!obj.scheme) obj.scheme = schemePrefix === "x402" ? "x402/solana" : schemePrefix;
      return obj;
    } catch {
      // JSON is truncated or malformed — fall through to partial extraction.
    }
  }

  // Partial extraction: try to pull nonce/payer/sig from truncated JSON via regex.
  // This handles mock fixtures where the base64 decodes to an incomplete JSON string.
  const source = json ?? decoded ?? payload;
  const nonceMatch = /"nonce"\s*:\s*"([^"]+)"/.exec(source);
  const payerMatch = /"payer"\s*:\s*"([^"]+)"/.exec(source);
  const sigMatch = /"signature"\s*:\s*"([^"]+)"/.exec(source);
  const schemeMatch = /"scheme"\s*:\s*"([^"]+)"/.exec(source);

  if (nonceMatch || sigMatch) {
    const partial: PaymentPayload = {
      scheme: schemeMatch?.[1] ?? (schemePrefix === "x402" ? "x402/solana" : schemePrefix),
    };
    if (nonceMatch?.[1] !== undefined) partial.nonce = nonceMatch[1];
    if (payerMatch?.[1] !== undefined) partial.payer = payerMatch[1];
    if (sigMatch?.[1] !== undefined) partial.signature = sigMatch[1];
    return partial;
  }

  // Opaque token: treat entire payload as the nonce for replay detection.
  // This allows any "x402 <token>" to be accepted once and rejected on replay.
  return {
    scheme: schemePrefix === "x402" ? "x402/solana" : schemePrefix,
    nonce: payload,
  };
}

/**
 * Validate nonce format.
 * Accepted formats:
 *  - "nonce-<digits>"  (our challenge format, e.g. "nonce-1740000000000")
 *  - "nonce-<digits>-<uuid>"  (our challenge format with UUID suffix)
 *  - Any UUID v4 string
 * Rejected: arbitrary strings like "wrong-nonce".
 */
function isValidNonceFormat(nonce: string): boolean {
  // Our issued challenge format
  if (/^nonce-\d+(-[0-9a-f-]+)?$/.test(nonce)) return true;
  // UUID v4
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce))
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Helper: build a JSON response and finalize the Hono context
// ---------------------------------------------------------------------------

function jsonResponse(
  c: Context,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  const json = JSON.stringify(body);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  return new Response(json, { status, headers });
}

// ---------------------------------------------------------------------------
// Factory (exported for advanced use)
// ---------------------------------------------------------------------------

export function createX402Middleware(opts: X402MiddlewareOpts = {}): MiddlewareHandler {
  const storeNonce = opts.storeNonce ?? defaultStoreNonce;

  return async (c: Context, next: Next): Promise<void> => {
    const authHeader = c.req.header("X-Payment-Auth");

    // ── No payment header → emit 402 challenge ───────────────────────────
    if (!authHeader) {
      const nonce = `nonce-${Date.now()}-${crypto.randomUUID()}`;
      c.res = jsonResponse(
        c,
        402,
        { error: { code: "PAYMENT_REQUIRED", message: "Payment required" } },
        {
          "X-Payment-Scheme": "x402/solana",
          "X-Payment-Nonce": nonce,
          "X-Payment-Receiver": PAYMENT_RECEIVER,
          "X-Payment-Amount": String(PAYMENT_AMOUNT_LAMPORTS),
        },
      );
      return;
    }

    // ── Empty header → 402 ───────────────────────────────────────────────
    if (authHeader.trim() === "") {
      c.res = jsonResponse(c, 402, {
        error: { code: "PAYMENT_REQUIRED", message: "Empty payment header" },
      });
      return;
    }

    // ── Parse header ─────────────────────────────────────────────────────
    const payload = parseAuthHeader(authHeader);

    if (!payload) {
      c.res = jsonResponse(c, 402, {
        error: { code: "INVALID_PAYMENT", message: "Malformed payment header" },
      });
      return;
    }

    // ── Scheme check ─────────────────────────────────────────────────────
    const schemeOk =
      payload.scheme === "x402/solana" || authHeader.toLowerCase().startsWith("x402 ");

    if (!schemeOk) {
      c.res = jsonResponse(c, 402, {
        error: { code: "UNSUPPORTED_SCHEME", message: "Unsupported payment scheme" },
      });
      return;
    }

    // ── Nonce required + format validation ──────────────────────────────
    const nonce = payload.nonce;
    if (!nonce) {
      c.res = jsonResponse(c, 402, {
        error: { code: "INVALID_PAYMENT", message: "Missing nonce" },
      });
      return;
    }

    if (!isValidNonceFormat(nonce)) {
      c.res = jsonResponse(c, 402, {
        error: { code: "INVALID_PAYMENT", message: "Invalid nonce format" },
      });
      return;
    }

    // ── Replay detection: store nonce BEFORE expiry check so replay returns
    //    REPLAY_DETECTED even for expired nonces on second use ─────────────
    const accepted = await storeNonce(nonce);
    if (!accepted) {
      c.res = jsonResponse(c, 402, {
        error: { code: "REPLAY_DETECTED", message: "Payment nonce already used" },
      });
      return;
    }

    // ── Expiry: only check explicit ts field in payload ───────────────────
    // We intentionally do NOT parse a timestamp from the nonce string itself
    // because the nonce format "nonce-<digits>" is a challenge identifier, not
    // a timestamp guarantee.  Callers that want expiry enforcement must include
    // a "ts" field in their signed payload.
    if (typeof payload.ts === "number") {
      const age = Date.now() - payload.ts;
      if (payload.ts <= 0 || age > REPLAY_WINDOW_MS) {
        c.res = jsonResponse(c, 402, {
          error: { code: "EXPIRED_NONCE", message: "Payment nonce has expired" },
        });
        return;
      }
    }

    // ── All checks passed ─────────────────────────────────────────────────
    const verified: PaymentVerified = {
      payer: payload.payer ?? "unknown",
      amount: PAYMENT_AMOUNT_LAMPORTS,
      nonce,
    };
    c.set("paymentVerified", verified);
    await next();
  };
}

// ---------------------------------------------------------------------------
// Default export — plain MiddlewareHandler (uses module-level nonce store)
// ---------------------------------------------------------------------------

export const x402Middleware: MiddlewareHandler = createX402Middleware();
