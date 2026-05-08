/**
 * Route tests — GET /v1/receipts
 *
 * RED PHASE: pagination, filter by buyer/seller/agent, and per-receipt detail
 * are all unimplemented in the stub. All tests beyond the empty-list baseline fail.
 */

import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { get, post } from "../../test-utils/fetch-helper.js";
import { mockPaymentAuthHeader, validCreateAgent } from "../../test-utils/fixtures.js";

const validInvokeBody = {
  prompt: "Summarize this document for me.",
  params: { temperature: 0.0, maxOutputTokens: 256, tools: [] },
  intentMode: "per_invocation",
};

// ---------------------------------------------------------------------------
// GET /v1/receipts — baseline
// ---------------------------------------------------------------------------

describe("GET /v1/receipts", () => {
  it("should return HTTP 200", async () => {
    const res = await get(app, "/v1/receipts");
    expect(res.status).toBe(200);
  });

  it("should return a response with data array, page, and total fields", async () => {
    const res = await get<{ data: unknown[]; page: number; total: number }>(app, "/v1/receipts");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.page).toBe("number");
    expect(typeof res.body.total).toBe("number");
  });

  // RED: pagination not implemented
  it("should return page 2 when ?page=2 query param is supplied", async () => {
    const res = await get<{ page: number }>(app, "/v1/receipts?page=2");
    expect(res.body.page).toBe(2);
  });

  // RED: limit not implemented
  it("should limit receipts to ?limit=10 per page", async () => {
    const res = await get<{ data: unknown[] }>(app, "/v1/receipts?limit=10");
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  // RED: buyer filter not implemented
  it("should filter receipts by buyer wallet address", async () => {
    const buyerWallet = "Buyer111111111111111111111111111111111111111";
    const res = await get<{ data: Array<{ buyerWallet: string }> }>(
      app,
      `/v1/receipts?buyer=${buyerWallet}`,
    );
    expect(res.status).toBe(200);
    for (const receipt of res.body.data) {
      expect(receipt.buyerWallet).toBe(buyerWallet);
    }
  });

  // RED: seller filter not implemented
  it("should filter receipts by seller wallet address", async () => {
    const sellerWallet = "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk";
    const res = await get<{ data: Array<{ sellerWallet: string }> }>(
      app,
      `/v1/receipts?seller=${sellerWallet}`,
    );
    expect(res.status).toBe(200);
    for (const receipt of res.body.data) {
      expect(receipt.sellerWallet).toBe(sellerWallet);
    }
  });

  // RED: agent filter not implemented
  it("should filter receipts by agentId", async () => {
    const agentId = "550e8400-e29b-41d4-a716-446655440000";
    const res = await get<{ data: Array<{ agentId: string }> }>(
      app,
      `/v1/receipts?agentId=${agentId}`,
    );
    expect(res.status).toBe(200);
    for (const receipt of res.body.data) {
      expect(receipt.agentId).toBe(agentId);
    }
  });

  // RED: invalid page should return 400
  it("should return 400 when page param is not a positive integer", async () => {
    const res = await get(app, "/v1/receipts?page=abc");
    expect(res.status).toBe(400);
  });

  // RED: receipt shape must include all SPEC §9 fields
  it("should return receipts with required evidence fields when data is present", async () => {
    // Trigger an invocation to produce a receipt
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    const agentId = createRes.body.id;
    await app.request(`/v1/agents/${agentId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockPaymentAuthHeader,
      },
      body: JSON.stringify(validInvokeBody),
    });

    const res = await get<{
      data: Array<{
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
      }>;
    }>(app, `/v1/receipts?agentId=${agentId}`);

    expect(res.body.data.length).toBeGreaterThan(0);
    const receipt = res.body.data[0]!;
    expect(receipt.promptHash).toBeDefined();
    expect(receipt.outputHash).toBeDefined();
    expect(typeof receipt.tokensIn).toBe("number");
    expect(typeof receipt.tokensOut).toBe("number");
    expect(typeof receipt.flagsBitmap).toBe("number");
    expect(receipt.settlementSig).toBeTruthy();
    expect(receipt.mintedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /v1/receipts/:id — individual receipt detail (RED: route not scaffolded)
// ---------------------------------------------------------------------------

describe("GET /v1/receipts/:id", () => {
  // RED: route does not exist yet
  it("should return HTTP 200 for an existing receipt id", async () => {
    const res = await get(app, "/v1/receipts/rcpt_01J000000000000000000000");
    expect(res.status).toBe(200);
  });

  it("should return 404 for a non-existent receipt id", async () => {
    const res = await get(app, "/v1/receipts/rcpt_nonexistent");
    expect(res.status).toBe(404);
  });

  // RED: verifyUrl must be present in receipt detail per SPEC §9.5
  it("should include a verifyUrl field in the receipt detail", async () => {
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    const agentId = createRes.body.id;

    await app.request(`/v1/agents/${agentId}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Auth": mockPaymentAuthHeader,
      },
      body: JSON.stringify(validInvokeBody),
    });

    const listRes = await get<{ data: Array<{ id: string }> }>(
      app,
      `/v1/receipts?agentId=${agentId}`,
    );
    const receiptId = listRes.body.data[0]?.id;
    expect(receiptId).toBeTruthy();

    const detailRes = await get<{ verifyUrl: string }>(app, `/v1/receipts/${receiptId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.verifyUrl).toMatch(/^https?:\/\//);
  });
});
