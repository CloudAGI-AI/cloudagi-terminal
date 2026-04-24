/**
 * Middleware tests — x402.ts
 *
 * RED PHASE: the current x402Middleware is a passthrough stub. All tests that
 * assert challenge generation, signature verification, and replay protection
 * will FAIL until Wave 3 implementation.
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { x402Middleware } from "../../middleware/x402.js";
import { get, post } from "../../test-utils/fetch-helper.js";
import { mockPaymentAuthHeader, replayedNonce } from "../../test-utils/fixtures.js";

// Helper: build a minimal Hono app with x402 middleware on a test route
function buildX402App(opts: { requirePayment?: boolean } = {}) {
  const app = new Hono();
  app.use("/protected/*", x402Middleware);
  app.post("/protected/resource", (c) => c.json({ ok: true }, 200));
  app.get("/protected/resource", (c) => c.json({ ok: true }, 200));
  return app;
}

// ---------------------------------------------------------------------------
// Challenge generation
// ---------------------------------------------------------------------------

describe("x402Middleware — 402 challenge generation", () => {
  it("should pass through (200) when middleware is a stub", async () => {
    // Current behavior: stub passes through unconditionally
    const app = buildX402App();
    const res = await post(app, "/protected/resource", { data: "test" });
    expect(res.status).toBe(200);
  });

  // RED: once implemented, unauthenticated requests must receive 402
  it("should return 402 on unauthenticated POST to protected resource", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" });
    expect(res.status).toBe(402);
  });

  // RED: 402 response must include x402 challenge headers
  it("should set X-Payment-Scheme header in 402 challenge", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", {});
    expect(res.status).toBe(402);
    expect(res.headers.get("x-payment-scheme")).toBe("x402/solana");
  });

  // RED: nonce must be present and unique per challenge
  it("should set a unique X-Payment-Nonce on each 402 challenge", async () => {
    const app = buildX402App({ requirePayment: true });
    const r1 = await post(app, "/protected/resource", {});
    const r2 = await post(app, "/protected/resource", {});
    expect(r1.headers.get("x-payment-nonce")).not.toBe(r2.headers.get("x-payment-nonce"));
  });

  // RED: receiver must be a non-empty address
  it("should set X-Payment-Receiver to a non-empty wallet address", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", {});
    const receiver = res.headers.get("x-payment-receiver");
    expect(receiver).toBeTruthy();
    expect(receiver).not.toBe("PLACEHOLDER_PROVIDER_ADDRESS");
  });

  // RED: amount must be a positive integer in lamports
  it("should set X-Payment-Amount to a positive lamport value", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", {});
    const amount = Number(res.headers.get("x-payment-amount"));
    expect(amount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe("x402Middleware — signature verification", () => {
  // RED: middleware passes all requests through currently
  it("should allow request with valid X-Payment-Auth header", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" }, {
      "X-Payment-Auth": mockPaymentAuthHeader,
    });
    expect(res.status).toBe(200);
  });

  // RED: invalid sig must be rejected
  it("should return 402 when X-Payment-Auth signature is cryptographically invalid", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" }, {
      "X-Payment-Auth": "x402 BADSIG_NOT_VALID_BASE64_OR_SOLANA",
    });
    expect(res.status).toBe(402);
  });

  // RED: wrong scheme prefix must be rejected
  it("should return 402 when X-Payment-Auth uses an unsupported scheme", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" }, {
      "X-Payment-Auth": "stripe BADSIG",
    });
    expect(res.status).toBe(402);
  });

  // RED: empty auth header must be rejected
  it("should return 402 when X-Payment-Auth header is an empty string", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" }, {
      "X-Payment-Auth": "",
    });
    expect(res.status).toBe(402);
  });

  // RED: middleware must verify the nonce matches the one it issued
  it("should return 402 when payment auth nonce does not match issued nonce", async () => {
    const app = buildX402App({ requirePayment: true });
    const res = await post(app, "/protected/resource", { data: "test" }, {
      "X-Payment-Auth": `x402 {"nonce":"wrong-nonce","sig":"fakesig"}`,
    });
    expect(res.status).toBe(402);
  });
});

// ---------------------------------------------------------------------------
// Replay protection
// ---------------------------------------------------------------------------

describe("x402Middleware — replay protection", () => {
  // RED: nonce reuse must be rejected
  it("should return 402 when a previously used nonce is replayed", async () => {
    const app = buildX402App({ requirePayment: true });

    // First request with mock auth (would succeed if implemented)
    await post(app, "/protected/resource", {}, {
      "X-Payment-Auth": mockPaymentAuthHeader,
    });

    // Second request with same auth token (replay)
    const replayRes = await post(app, "/protected/resource", {}, {
      "X-Payment-Auth": mockPaymentAuthHeader,
    });
    expect(replayRes.status).toBe(402);
  });

  // RED: stale nonce (too old) must be rejected
  it("should return 402 when nonce timestamp is beyond replay window", async () => {
    const app = buildX402App({ requirePayment: true });
    const staleAuth = `x402 {"nonce":"${replayedNonce}","sig":"stalesig","ts":0}`;
    const res = await post(app, "/protected/resource", {}, {
      "X-Payment-Auth": staleAuth,
    });
    expect(res.status).toBe(402);
  });

  // RED: replay error body must be distinguishable from fresh challenge
  it("should include a REPLAY_DETECTED error code in replay rejection body", async () => {
    const app = buildX402App({ requirePayment: true });
    await post(app, "/protected/resource", {}, { "X-Payment-Auth": mockPaymentAuthHeader });
    const replayRes = await post<{ error?: { code?: string } }>(
      app,
      "/protected/resource",
      {},
      { "X-Payment-Auth": mockPaymentAuthHeader }
    );
    expect(replayRes.body.error?.code).toBe("REPLAY_DETECTED");
  });
});
