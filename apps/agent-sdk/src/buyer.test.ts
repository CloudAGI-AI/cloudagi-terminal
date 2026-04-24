/**
 * Tests for buyer.ts — createBuyerClient: listAgents, invoke, getReceipts.
 *
 * Expected status:
 *   GREEN — basic shape tests (stub returns valid shapes already)
 *   RED   — x402 retry, real marketplace HTTP calls, signature attachment,
 *            receipt surface (stub rcpt_ prefix is coincidentally correct)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";
import { createBuyerClient } from "./buyer.js";
import type { BuyerClient, InvocationResult, Agent, ReceiptHandle } from "./types.js";

// ---------------------------------------------------------------------------
// Factory validation — GREEN
// ---------------------------------------------------------------------------

describe("createBuyerClient — input validation", () => {
  it("creates a client with no options (defaults)", () => {
    const client = createBuyerClient();
    expect(typeof client.invoke).toBe("function");
    expect(typeof client.listAgents).toBe("function");
    expect(typeof client.getReceipts).toBe("function");
  });

  it("throws ZodError when marketplaceUrl is not a valid URL", () => {
    expect(() => createBuyerClient({ marketplaceUrl: "not-a-url" })).toThrow(ZodError);
  });

  it("throws ZodError when walletKeypair is wrong length (< 64)", () => {
    expect(() =>
      createBuyerClient({ walletKeypair: new Uint8Array(32) }),
    ).toThrow(ZodError);
  });

  it("throws ZodError when walletKeypair is wrong length (> 64)", () => {
    expect(() =>
      createBuyerClient({ walletKeypair: new Uint8Array(128) }),
    ).toThrow(ZodError);
  });

  it("throws ZodError when maxBudgetLamports is zero", () => {
    expect(() => createBuyerClient({ maxBudgetLamports: 0 })).toThrow(ZodError);
  });

  it("throws ZodError when maxBudgetLamports is negative", () => {
    expect(() => createBuyerClient({ maxBudgetLamports: -100 })).toThrow(ZodError);
  });

  it("throws ZodError when maxBudgetLamports is not an integer", () => {
    expect(() => createBuyerClient({ maxBudgetLamports: 1.5 })).toThrow(ZodError);
  });

  it("accepts valid 64-byte walletKeypair", () => {
    const client = createBuyerClient({ walletKeypair: new Uint8Array(64).fill(2) });
    expect(typeof client.invoke).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// listAgents — GREEN (stub returns correct shape)
// ---------------------------------------------------------------------------

describe("BuyerClient.listAgents", () => {
  let client: BuyerClient;
  beforeEach(() => { client = createBuyerClient(); });

  it("returns a non-empty array", async () => {
    const agents = await client.listAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  it("each agent has required fields", async () => {
    const agents = await client.listAgents();
    for (const agent of agents) {
      expect(typeof agent.agentId).toBe("string");
      expect(agent.agentId.length).toBeGreaterThan(0);
      expect(typeof agent.name).toBe("string");
      expect(Array.isArray(agent.skills)).toBe(true);
      expect(typeof agent.pricing.perMTokensIn).toBe("number");
      expect(typeof agent.pricing.perMTokensOut).toBe("number");
      expect(typeof agent.endpoint).toBe("string");
      expect(typeof agent.registeredAt).toBe("string");
    }
  });

  it("filters agents by skill", async () => {
    const agents = await client.listAgents({ skill: "code-review" });
    expect(agents.length).toBeGreaterThan(0);
    for (const agent of agents) {
      expect(agent.skills).toContain("code-review");
    }
  });

  it("returns empty array when no agents match the skill filter", async () => {
    const agents = await client.listAgents({ skill: "nonexistent-skill-xyz" });
    expect(agents.length).toBe(0);
  });

  it("returns all agents when filter is undefined", async () => {
    const all = await client.listAgents();
    const filtered = await client.listAgents(undefined);
    expect(all.length).toBe(filtered.length);
  });

  it("registeredAt is a parseable ISO-8601 timestamp", async () => {
    const agents = await client.listAgents();
    for (const agent of agents) {
      const d = new Date(agent.registeredAt);
      expect(d.toISOString()).toBe(agent.registeredAt);
    }
  });
});

// ---------------------------------------------------------------------------
// invoke — GREEN for shape; RED for x402 retry and real HTTP
// ---------------------------------------------------------------------------

describe("BuyerClient.invoke — return shape (GREEN)", () => {
  let client: BuyerClient;
  beforeEach(() => { client = createBuyerClient(); });

  it("resolves to an InvocationResult with all required fields", async () => {
    const result: InvocationResult = await client.invoke(
      "agent_stub_0001",
      "Summarise this text.",
    );
    expect(typeof result.receipt).toBe("string");
    expect(typeof result.outputHash).toBe("string");
    expect(typeof result.text).toBe("string");
    expect(typeof result.usage.tokensIn).toBe("number");
    expect(typeof result.usage.tokensOut).toBe("number");
    expect(typeof result.completedAt).toBe("string");
  });

  it("receipt starts with 'rcpt_'", async () => {
    const result = await client.invoke("agent_stub_0001", "test prompt");
    expect(result.receipt).toMatch(/^rcpt_/);
  });

  it("outputHash is a 64-char SHA-256 hex string", async () => {
    const result = await client.invoke("agent_stub_0001", "test prompt");
    expect(result.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("usage.tokensIn is positive for a non-empty prompt", async () => {
    const result = await client.invoke("agent_stub_0001", "hello world");
    expect(result.usage.tokensIn).toBeGreaterThan(0);
  });

  it("usage.tokensOut is positive (agent produced a response)", async () => {
    const result = await client.invoke("agent_stub_0001", "hello world");
    expect(result.usage.tokensOut).toBeGreaterThan(0);
  });

  it("completedAt is a valid ISO-8601 timestamp", async () => {
    const result = await client.invoke("agent_stub_0001", "hello world");
    expect(new Date(result.completedAt).toISOString()).toBe(result.completedAt);
  });

  it("completedAt is recent (within last 5 seconds)", async () => {
    const before = Date.now();
    const result = await client.invoke("agent_stub_0001", "time check");
    const after = Date.now();
    const ts = new Date(result.completedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 100);
  });
});

describe("BuyerClient.invoke — x402 retry (RED)", () => {
  it("retries the request when the server returns HTTP 402 Payment Required", async () => {
    // RED: real impl must handle x402 by signing a payment and retrying.
    // Stub never hits network so this test validates the retry mechanism.
    // We simulate by expecting a specific error type or retry count property.
    const client = createBuyerClient({ maxBudgetLamports: 50_000 });

    // RED: real impl should surface a typed PaymentRequiredError on exhaustion.
    // For now we just assert the invoke does NOT silently swallow errors.
    // This test will fail until the HTTP + x402 layer is built.
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "payment required" }), { status: 402 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            receipt: "rcpt_real123",
            outputHash: "a".repeat(64),
            text: "real response",
            usage: { tokensIn: 5, tokensOut: 10 },
            completedAt: new Date().toISOString(),
          }),
          { status: 200 },
        ),
      );
    });

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;
    try {
      const result = await client.invoke("agent_real_001", "trigger x402");
      // RED: real impl would retry and eventually return the result
      expect(callCount).toBeGreaterThanOrEqual(3);
      expect(result.receipt).toBe("rcpt_real123");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("surfaces a typed error when budget is exhausted during x402 retry", async () => {
    // RED: real impl must reject with a budget-exceeded error, not loop forever.
    const client = createBuyerClient({ maxBudgetLamports: 1 });

    const alwaysFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "payment required" }), { status: 402 }),
    );

    const globalFetch = globalThis.fetch;
    globalThis.fetch = alwaysFetch;
    try {
      await expect(
        client.invoke("agent_real_001", "always 402"),
      ).rejects.toThrow();
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// getReceipts — GREEN for shape; RED for real pagination
// ---------------------------------------------------------------------------

describe("BuyerClient.getReceipts", () => {
  let client: BuyerClient;
  beforeEach(() => { client = createBuyerClient(); });

  it("returns an array of receipt handle strings", async () => {
    const receipts = await client.getReceipts();
    expect(Array.isArray(receipts)).toBe(true);
    for (const r of receipts) {
      expect(typeof r).toBe("string");
    }
  });

  it("receipt handles start with 'rcpt_'", async () => {
    const receipts = await client.getReceipts();
    for (const r of receipts) {
      expect(r).toMatch(/^rcpt_/);
    }
  });

  it("respects the limit parameter", async () => {
    const receipts = await client.getReceipts(2);
    expect(receipts.length).toBeLessThanOrEqual(2);
  });

  it("returns at most default 20 receipts when no limit given", async () => {
    const receipts = await client.getReceipts();
    expect(receipts.length).toBeLessThanOrEqual(20);
  });

  it("returns an empty array when limit is 0 (RED — stub returns up to 3)", async () => {
    // RED: real impl must honour limit=0 strictly.
    const receipts = await client.getReceipts(0);
    expect(receipts.length).toBe(0);
  });

  it("receipts are ordered newest-first (RED — stub returns unordered random)", async () => {
    // RED: real impl must return newest-first ordering from the chain.
    // We record a receipt then verify it appears first.
    const firstInvoke = await client.invoke("agent_stub_0001", "first call");
    const receipts = await client.getReceipts(5);
    // Stub generates random IDs so first receipt will not be firstInvoke.receipt.
    // Real impl must surface them in newest-first order.
    expect(receipts[0]).toBe(firstInvoke.receipt);
  });
});
