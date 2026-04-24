/**
 * Route tests — POST /v1/agents/:id/invoke
 *
 * RED PHASE:
 *  - 402 challenge header shape tests will FAIL (headers have placeholder values)
 *  - Post-payment 200 streaming tests will FAIL (not implemented)
 *  - Receipt emission test will FAIL (not implemented)
 */

import { describe, it, expect } from "vitest";
import { app } from "../../app.js";
import { post } from "../../test-utils/fetch-helper.js";
import { validCreateAgent, mockPaymentAuthHeader } from "../../test-utils/fixtures.js";

const TEST_AGENT_ID = "550e8400-e29b-41d4-a716-446655440000";

const validInvokeBody = {
  prompt: "Classify the sentiment of this tweet: I love open source!",
  params: {
    temperature: 0.2,
    maxOutputTokens: 512,
    tools: [],
  },
  intentMode: "per_invocation",
};

// ---------------------------------------------------------------------------
// 402 Payment Required — first call without payment auth
// ---------------------------------------------------------------------------

describe("POST /v1/agents/:id/invoke — 402 challenge", () => {
  it("should return HTTP 402 on first invocation without payment", async () => {
    const res = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    expect(res.status).toBe(402);
  });

  it("should set X-Payment-Scheme header to x402/solana", async () => {
    const res = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    expect(res.headers.get("x-payment-scheme")).toBe("x402/solana");
  });

  // RED: receiver should be a real provider wallet, not PLACEHOLDER_PROVIDER_ADDRESS
  it("should set X-Payment-Receiver to the actual provider wallet address", async () => {
    // Register the agent first so the server knows the provider wallet
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    const agentId = createRes.body.id;

    const res = await post(app, `/v1/agents/${agentId}/invoke`, validInvokeBody);
    expect(res.status).toBe(402);
    const receiver = res.headers.get("x-payment-receiver");
    expect(receiver).not.toBe("PLACEHOLDER_PROVIDER_ADDRESS");
    expect(receiver).toBe(validCreateAgent.provider);
  });

  // RED: amount should be computed from agent pricing, not hardcoded 0
  it("should set X-Payment-Amount to a non-zero value based on agent pricing", async () => {
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    const agentId = createRes.body.id;

    const res = await post(app, `/v1/agents/${agentId}/invoke`, validInvokeBody);
    const amount = res.headers.get("x-payment-amount");
    expect(amount).not.toBe("0");
    expect(Number(amount)).toBeGreaterThan(0);
  });

  it("should set X-Payment-Nonce header that is non-empty", async () => {
    const res = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    const nonce = res.headers.get("x-payment-nonce");
    expect(nonce).toBeTruthy();
    expect(nonce?.length).toBeGreaterThan(0);
  });

  // RED: nonce must be unique per request for replay protection
  it("should return a different nonce on each invocation call", async () => {
    const res1 = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    const res2 = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    const nonce1 = res1.headers.get("x-payment-nonce");
    const nonce2 = res2.headers.get("x-payment-nonce");
    expect(nonce1).not.toBe(nonce2);
  });

  it("should set X-Agent-Id header matching the path parameter", async () => {
    const res = await post(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    expect(res.headers.get("x-agent-id")).toBe(TEST_AGENT_ID);
  });

  // RED: 402 body should contain paymentHint per SPEC §7.1 shape
  it("should return a paymentHint object in the 402 body", async () => {
    const res = await post<{
      error: string;
      paymentHint?: {
        chain: string;
        currency: string;
        amount: string;
        payTo: string;
        nonce: string;
      };
    }>(app, `/v1/agents/${TEST_AGENT_ID}/invoke`, validInvokeBody);
    expect(res.body.paymentHint).toBeDefined();
    expect(res.body.paymentHint?.chain).toBe("solana");
    expect(res.body.paymentHint?.currency).toBe("USDC");
    expect(res.body.paymentHint?.payTo).toBeTruthy();
    expect(res.body.paymentHint?.nonce).toBeTruthy();
  });

  // RED: 402 for unknown agent should include 404 alongside, or return 404 first
  it("should return 404 when agent id does not exist in registry", async () => {
    const res = await post(app, "/v1/agents/deadbeef-dead-dead-dead-deadbeefcafe/invoke", validInvokeBody);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /v1/agents/:id/invoke — successful invocation after payment auth
// ---------------------------------------------------------------------------

describe("POST /v1/agents/:id/invoke — authenticated invocation", () => {
  // RED: not implemented — route always returns 402
  it("should return HTTP 200 when a valid X-Payment-Auth header is provided", async () => {
    const res = await post(
      app,
      `/v1/agents/${TEST_AGENT_ID}/invoke`,
      validInvokeBody,
      { "X-Payment-Auth": mockPaymentAuthHeader }
    );
    expect(res.status).toBe(200);
  });

  // RED: streaming response not implemented
  it("should return a streaming response body with text/event-stream content type", async () => {
    const res = await app.request(`/v1/agents/${TEST_AGENT_ID}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockPaymentAuthHeader,
      },
      body: JSON.stringify(validInvokeBody),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
  });

  // RED: receipt not emitted — will fail
  it("should emit a receipt event in the stream upon completion", async () => {
    const res = await app.request(`/v1/agents/${TEST_AGENT_ID}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockPaymentAuthHeader,
      },
      body: JSON.stringify(validInvokeBody),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    // SSE stream must contain a receipt.minted event
    expect(text).toContain("event: receipt.minted");
  });

  // RED: X-Receipt-Id response header expected after successful invocation
  it("should include X-Receipt-Id header in the response", async () => {
    const res = await app.request(`/v1/agents/${TEST_AGENT_ID}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockPaymentAuthHeader,
      },
      body: JSON.stringify(validInvokeBody),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-receipt-id")).toBeTruthy();
  });

  // RED: replayed nonce must be rejected with 402 + replay error
  it("should return 402 with replay-protection error when nonce is reused", async () => {
    const staleAuth = "x402 stale_nonce_replay_token";
    const res = await post(
      app,
      `/v1/agents/${TEST_AGENT_ID}/invoke`,
      validInvokeBody,
      { "X-Payment-Auth": staleAuth }
    );
    expect(res.status).toBe(402);
    const body = res.body as { error?: { code?: string } };
    expect(body.error?.code).toBe("PAYMENT_REQUIRED");
  });

  // RED: malformed payment auth header should return 402
  it("should return 402 when X-Payment-Auth header signature is invalid", async () => {
    const res = await post(
      app,
      `/v1/agents/${TEST_AGENT_ID}/invoke`,
      validInvokeBody,
      { "X-Payment-Auth": "x402 INVALIDSIGNATURE" }
    );
    expect(res.status).toBe(402);
  });

  // RED: prompt field is required
  it("should return 422 when invoke body is missing prompt field", async () => {
    const { prompt: _p, ...bodyWithoutPrompt } = validInvokeBody;
    const res = await post(
      app,
      `/v1/agents/${TEST_AGENT_ID}/invoke`,
      bodyWithoutPrompt,
      { "X-Payment-Auth": mockPaymentAuthHeader }
    );
    expect(res.status).toBe(422);
  });
});
