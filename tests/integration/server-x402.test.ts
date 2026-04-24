/**
 * Integration: server x402 payment handshake
 *
 * Uses Hono's app.request() to call the real app instance without a live TCP
 * port. Tests are intentionally RED: they assert behaviours that the Wave-2
 * green-phase implementation must satisfy.
 *
 * SPEC refs: §4.2 Buyer flow, §7.1 REST surfaces, §8.2 HTTP 402 handshake
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Import the real Hono app (stub). Wave 2 wires real route logic.
// ---------------------------------------------------------------------------
// NOTE: @cloudagi/server is not yet built; this import will fail at runtime
// until Wave 2 outputs dist/. The failing import IS the red-phase signal.
// @ts-expect-error — module not yet built; intentional red-phase import
import { app } from "@cloudagi/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Issue a request via Hono's test helper and return the raw Response. */
async function req(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  // app.request is Hono's built-in test helper (no TCP port needed)
  return (app as { request(url: string, init?: RequestInit): Promise<Response> }).request(path, init);
}

// ---------------------------------------------------------------------------
// Suite 1 — GET /v1/agents envelope shape (SPEC §7.1)
// ---------------------------------------------------------------------------

describe("GET /v1/agents", () => {
  it("returns 200 with a data array and pagination fields", async () => {
    const res = await req("GET", "/v1/agents");
    expect(res.status).toBe(200);

    const body = await res.json() as unknown;
    // SPEC §7.1: discovery endpoint must return paginated list
    expect(body).toMatchObject({
      data: expect.any(Array),
      page: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it("returns content-type application/json", async () => {
    const res = await req("GET", "/v1/agents");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("supports skill query filter without throwing", async () => {
    // Wave 2 must filter by ?skill= — currently returns full list
    const res = await req("GET", "/v1/agents?skill=sentiment.classify.v1");
    expect(res.status).toBe(200);

    const body = await res.json() as { data: unknown[] };
    // RED: Wave 2 must return only agents matching the skill tag
    expect(body.data).toEqual(
      expect.arrayContaining(
        body.data.map(() =>
          expect.objectContaining({ skills: expect.arrayContaining(["sentiment.classify.v1"]) }),
        ),
      ),
    );
  });

  it("each agent record conforms to the Agent schema shape", async () => {
    // Pre-register one agent so the list is non-empty (Wave 2)
    await req("POST", "/v1/agents", {
      displayName: "Test Agent",
      provider: "wallet_abc",
      skills: ["sentiment.classify.v1"],
      pricing: { kind: "per_token", perMTokensIn: 1000, perMTokensOut: 2000 },
      model: { kind: "hosted", family: "gpt-4o-mini", contextWindow: 128000, maxOutputTokens: 4096 },
      endpoint: "https://test-agent.example.com/invoke",
      policies: { maxPromptTokens: 4096, maxOutputTokens: 1024, allowedTools: [], allowedSkills: ["sentiment.classify.v1"], refuseIfFlags: [] },
      status: "active",
      stake: 25_000_000,
      reputation: 0,
      uptimePct: 100,
      avgLatencyMs: 0,
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: "A test agent",
    });

    const res = await req("GET", "/v1/agents");
    const body = await res.json() as { data: Record<string, unknown>[] };

    for (const agent of body.data) {
      // SPEC §5.1 required fields
      expect(agent).toHaveProperty("id");
      expect(agent).toHaveProperty("provider");
      expect(agent).toHaveProperty("displayName");
      expect(agent).toHaveProperty("skills");
      expect(agent).toHaveProperty("status");
      expect(agent).toHaveProperty("pricing");
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — POST /v1/agents/:id/invoke returns 402 with x402 headers
// (SPEC §7.1, §8.2)
// ---------------------------------------------------------------------------

describe("POST /v1/agents/:id/invoke — 402 payment gate", () => {
  it("returns HTTP 402 for an invoke without payment", async () => {
    const res = await req("POST", "/v1/agents/agent_123/invoke", {
      prompt: "Classify the sentiment of: I love this product!",
      params: { temperature: 0.2, maxOutputTokens: 512, tools: [] },
      intentMode: "per_invocation",
    });
    expect(res.status).toBe(402);
  });

  it("response body contains error.code PAYMENT_REQUIRED", async () => {
    const res = await req("POST", "/v1/agents/agent_123/invoke", {
      prompt: "Summarise this document",
      params: { temperature: 0.0, maxOutputTokens: 256 },
      intentMode: "per_invocation",
    });
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("PAYMENT_REQUIRED");
  });

  it("response includes X-Payment-Scheme header (x402/solana)", async () => {
    const res = await req("POST", "/v1/agents/agent_sentinel/invoke", {
      prompt: "test",
      params: { temperature: 0, maxOutputTokens: 128 },
      intentMode: "per_invocation",
    });
    expect(res.headers.get("X-Payment-Scheme")).toBe("x402/solana");
  });

  it("response includes X-Payment-Receiver header (provider address)", async () => {
    const res = await req("POST", "/v1/agents/agent_sentinel/invoke", {
      prompt: "test",
      params: { temperature: 0, maxOutputTokens: 128 },
      intentMode: "per_invocation",
    });
    const receiver = res.headers.get("X-Payment-Receiver");
    // Wave 2: must be a real base-58 Solana public key, not a placeholder
    expect(receiver).toBeTruthy();
    expect(receiver).not.toBe("PLACEHOLDER_PROVIDER_ADDRESS");
  });

  it("response includes X-Payment-Amount header (lamport amount string)", async () => {
    const res = await req("POST", "/v1/agents/agent_sentinel/invoke", {
      prompt: "test",
      params: { temperature: 0, maxOutputTokens: 128 },
      intentMode: "per_invocation",
    });
    const amount = res.headers.get("X-Payment-Amount");
    expect(amount).toBeTruthy();
    // Wave 2: must be a positive integer string, not "0"
    expect(Number(amount)).toBeGreaterThan(0);
  });

  it("response includes X-Payment-Nonce header (unique per request)", async () => {
    const [r1, r2] = await Promise.all([
      req("POST", "/v1/agents/agent_sentinel/invoke", { prompt: "p1", params: { temperature: 0, maxOutputTokens: 128 }, intentMode: "per_invocation" }),
      req("POST", "/v1/agents/agent_sentinel/invoke", { prompt: "p2", params: { temperature: 0, maxOutputTokens: 128 }, intentMode: "per_invocation" }),
    ]);
    const nonce1 = r1.headers.get("X-Payment-Nonce");
    const nonce2 = r2.headers.get("X-Payment-Nonce");
    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    // Nonces must be unique across requests to prevent replay
    expect(nonce1).not.toBe(nonce2);
  });

  it("402 body paymentHint contains chain, currency, amount, payTo, nonce (SPEC §7.1)", async () => {
    const res = await req("POST", "/v1/agents/agent_123/invoke", {
      prompt: "Translate to French: Hello world",
      params: { temperature: 0.3, maxOutputTokens: 256 },
      intentMode: "per_invocation",
    });
    // Wave 2 must enrich the 402 body with a paymentHint object per SPEC §7.1
    const body = await res.json() as { paymentHint?: Record<string, unknown> };
    expect(body).toHaveProperty("paymentHint");
    expect(body.paymentHint).toMatchObject({
      chain: "solana",
      currency: "USDC",
      amount: expect.any(String),
      payTo: expect.any(String),
      nonce: expect.any(String),
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — After mocked payment verification: streaming response + receipt
// (SPEC §4.2 steps 10–17, §7.2 WebSocket events)
// ---------------------------------------------------------------------------

describe("POST /v1/agents/:id/invoke — post-payment success path", () => {
  it("returns 200 with output and receiptId after payment header is supplied", async () => {
    // Simulate a buyer presenting a valid payment authorization header.
    // Wave 3 wires the real x402 middleware to verify on-chain; until then
    // this test is RED because the route always returns 402.
    const res = await req(
      "POST",
      "/v1/agents/agent_123/invoke",
      {
        prompt: "Classify: amazing product, highly recommend",
        params: { temperature: 0.1, maxOutputTokens: 64 },
        intentMode: "per_invocation",
      },
      {
        // x402 payment authorization header (stub value — Wave 3 verifies signature)
        "X-Payment-Authorization": "sig:stub_buyer_sig_abc123",
        "X-Payment-Nonce": "nonce-test-001",
      },
    );
    // RED: will be 402 until Wave 3 x402 middleware is wired
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty("output");
    expect(body).toHaveProperty("receiptId");
    expect(body).toHaveProperty("tokensIn");
    expect(body).toHaveProperty("tokensOut");
  });

  it("emitted receipt has promptHash and outputHash as 64-char hex strings", async () => {
    const res = await req(
      "POST",
      "/v1/agents/agent_123/invoke",
      { prompt: "test prompt", params: { temperature: 0, maxOutputTokens: 64 }, intentMode: "per_invocation" },
      { "X-Payment-Authorization": "sig:stub_payment" },
    );
    // RED until Wave 3
    expect(res.status).toBe(200);

    const body = await res.json() as { receipt?: { promptHash?: string; outputHash?: string } };
    expect(body.receipt?.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.receipt?.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("streaming response emits tokens.chunk events then invocation.completed (SPEC §7.2)", async () => {
    // WebSocket streaming is Wave 4; this test asserts the shape of events
    // that must be emitted. Currently RED — no WS endpoint exists.
    //
    // Simulated by checking the REST response carries status=completed when
    // the payment path succeeds.
    const res = await req(
      "POST",
      "/v1/agents/agent_123/invoke",
      { prompt: "Stream me tokens please", params: { temperature: 0.5, maxOutputTokens: 256 }, intentMode: "per_invocation" },
      { "X-Payment-Authorization": "sig:stub_payment_2" },
    );
    // RED: until Wave 3/4 implementation
    expect(res.status).toBe(200);
    const body = await res.json() as { status?: string };
    expect(body.status).toBe("completed");
  });
});
