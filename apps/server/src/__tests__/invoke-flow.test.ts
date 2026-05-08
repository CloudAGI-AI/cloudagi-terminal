/**
 * Integration test — full invoke flow
 *
 * RED PHASE: covers the complete buyer journey:
 *   register agent → list → get 402 → submit payment auth → invoke → receive receipt
 *
 * All steps beyond the initial 402 challenge will FAIL against current stubs.
 * Chain-boundary interactions are mocked at the Solana RPC level.
 */

import { describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { get, post } from "../test-utils/fetch-helper.js";
import { validCreateAgent } from "../test-utils/fixtures.js";

// ---------------------------------------------------------------------------
// Mock chain boundary — no real Solana RPC calls in tests
// ---------------------------------------------------------------------------

vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation(() => ({
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getAccountInfo: vi.fn().mockResolvedValue({ data: Buffer.alloc(0) }),
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({ toBase58: () => key })),
  Transaction: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    sign: vi.fn(),
  })),
  Keypair: {
    generate: vi.fn().mockReturnValue({
      publicKey: { toBase58: () => "FacilitatorPubkey111111111111111111111111111" },
      secretKey: new Uint8Array(64),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Test state shared across steps
// ---------------------------------------------------------------------------

let registeredAgentId: string;
let paymentNonce: string;
let sessionAuthToken: string;
let receiptId: string;

const buyerWallet = "BuyerWallet111111111111111111111111111111111";
const buyerSig = "BuyerValidSignature111111111111111111111111111111111111111111111111";

const invokePayload = {
  prompt: "Summarize the CloudAGI whitepaper in three bullet points.",
  params: { temperature: 0.1, maxOutputTokens: 512, tools: [] },
  intentMode: "per_invocation",
};

// ---------------------------------------------------------------------------
// Step 1 — Register an agent
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 1 — register agent", () => {
  it("should register a new agent and return 201 with a UUID id", async () => {
    const res = await post<{ id: string }>(app, "/v1/agents", validCreateAgent, {
      Authorization: `Wallet ${validCreateAgent.provider}:${buyerSig}`,
      "X-Auth-Message": `cloudagi:auth:${validCreateAgent.provider}:${Date.now()}`,
    });
    // RED: stub returns 501 — will fail until Wave 2
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    registeredAgentId = res.body.id;
  });
});

// ---------------------------------------------------------------------------
// Step 2 — List agents and find the registered agent
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 2 — list and discover registered agent", () => {
  it("should return the registered agent in the listing", async () => {
    // RED: listing returns empty array from stub
    const res = await get<{ data: Array<{ id: string }> }>(app, "/v1/agents");
    expect(res.status).toBe(200);
    const found = res.body.data.find((a) => a.id === registeredAgentId);
    expect(found).toBeDefined();
  });

  it("should find the agent when filtering by its registered skill", async () => {
    const res = await get<{ data: Array<{ id: string; skills: string[] }>; total: number }>(
      app,
      `/v1/agents?skill=summarize`,
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    const found = res.body.data.find((a) => a.id === registeredAgentId);
    expect(found).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Fetch agent by id
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 3 — fetch agent by id", () => {
  it("should return 200 with the registered agent by id", async () => {
    // RED: stub always returns 404
    const res = await get<{ id: string; provider: string }>(app, `/v1/agents/${registeredAgentId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(registeredAgentId);
    expect(res.body.provider).toBe(validCreateAgent.provider);
  });
});

// ---------------------------------------------------------------------------
// Step 4 — First invoke returns 402 with payment challenge
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 4 — first invoke returns 402 payment challenge", () => {
  it("should return 402 with x402 headers on unauthenticated invoke", async () => {
    const res = await post(app, `/v1/agents/${registeredAgentId}/invoke`, invokePayload);
    expect(res.status).toBe(402);

    expect(res.headers.get("x-payment-scheme")).toBe("x402/solana");
    // RED: receiver must be actual provider wallet
    expect(res.headers.get("x-payment-receiver")).toBe(validCreateAgent.provider);

    paymentNonce = res.headers.get("x-payment-nonce") ?? "";
    expect(paymentNonce).toBeTruthy();
  });

  it("should include a paymentHint body with chain, currency, amount, payTo, nonce", async () => {
    const res = await post<{
      paymentHint?: {
        chain: string;
        currency: string;
        amount: string;
        payTo: string;
        nonce: string;
      };
    }>(app, `/v1/agents/${registeredAgentId}/invoke`, invokePayload);

    expect(res.body.paymentHint).toBeDefined();
    expect(res.body.paymentHint?.chain).toBe("solana");
    expect(res.body.paymentHint?.currency).toBe("USDC");
    expect(Number(res.body.paymentHint?.amount)).toBeGreaterThan(0);
    expect(res.body.paymentHint?.payTo).toBe(validCreateAgent.provider);
    expect(res.body.paymentHint?.nonce).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Step 5 — Submit payment authorization and invoke
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 5 — invoke with valid payment auth", () => {
  it("should return 200 with streaming content-type after payment auth", async () => {
    // Build a mock payment auth using the nonce from Step 4
    const mockAuth = `x402 {"scheme":"x402/solana","nonce":"${paymentNonce}","payer":"${buyerWallet}","sig":"${buyerSig}"}`;

    const res = await app.request(`/v1/agents/${registeredAgentId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockAuth,
      },
      body: JSON.stringify(invokePayload),
    });

    // RED: returns 402 stub — will fail
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
  });

  it("should include X-Receipt-Id response header after successful invocation", async () => {
    const mockAuth = `x402 {"scheme":"x402/solana","nonce":"${paymentNonce}","payer":"${buyerWallet}","sig":"${buyerSig}"}`;

    const res = await app.request(`/v1/agents/${registeredAgentId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockAuth,
      },
      body: JSON.stringify(invokePayload),
    });

    expect(res.status).toBe(200);
    receiptId = res.headers.get("x-receipt-id") ?? "";
    expect(receiptId).toBeTruthy();
  });

  it("should emit SSE events including receipt.minted in the stream", async () => {
    const mockAuth = `x402 {"scheme":"x402/solana","nonce":"${paymentNonce}_2","payer":"${buyerWallet}","sig":"${buyerSig}"}`;

    const res = await app.request(`/v1/agents/${registeredAgentId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockAuth,
      },
      body: JSON.stringify(invokePayload),
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("event: receipt.minted");
    expect(body).toContain("event: invocation.completed");
  });
});

// ---------------------------------------------------------------------------
// Step 6 — Verify receipt appears in /v1/receipts
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 6 — receipt is persisted and retrievable", () => {
  it("should appear in /v1/receipts filtered by agentId", async () => {
    const res = await get<{ data: Array<{ id: string; agentId: string }>; total: number }>(
      app,
      `/v1/receipts?agentId=${registeredAgentId}`,
    );
    expect(res.status).toBe(200);
    // RED: receipts not persisted yet
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.data.some((r) => r.id === receiptId)).toBe(true);
  });

  it("should appear in /v1/receipts filtered by buyer wallet", async () => {
    const res = await get<{ data: Array<{ buyerWallet: string }> }>(
      app,
      `/v1/receipts?buyer=${buyerWallet}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((r) => r.buyerWallet === buyerWallet)).toBe(true);
  });

  it("should return full receipt detail via GET /v1/receipts/:id", async () => {
    const res = await get<{
      id: string;
      agentId: string;
      promptHash: string;
      outputHash: string;
      tokensIn: number;
      tokensOut: number;
      flagsBitmap: number;
      settlementAmount: string;
      settlementSig: string;
      mintedAt: string;
      verifyUrl: string;
    }>(app, `/v1/receipts/${receiptId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(receiptId);
    expect(res.body.agentId).toBe(registeredAgentId);
    // Hash fields must be 64-char hex strings (sha256)
    expect(res.body.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.tokensIn).toBeGreaterThan(0);
    expect(res.body.settlementSig).toBeTruthy();
    expect(res.body.verifyUrl).toMatch(/^https?:\/\//);
  });
});

// ---------------------------------------------------------------------------
// Step 7 — Replay protection: same payment auth must be rejected
// ---------------------------------------------------------------------------

describe("invoke-flow: Step 7 — replay protection", () => {
  it("should reject a second invocation with the already-used payment nonce", async () => {
    const replayAuth = `x402 {"scheme":"x402/solana","nonce":"${paymentNonce}","payer":"${buyerWallet}","sig":"${buyerSig}"}`;

    const res = await post(app, `/v1/agents/${registeredAgentId}/invoke`, invokePayload, {
      "X-Payment-Auth": replayAuth,
    });
    // Replayed nonce must be rejected with 402
    expect(res.status).toBe(402);
  });
});
