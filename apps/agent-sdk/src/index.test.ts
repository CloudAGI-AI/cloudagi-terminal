/**
 * Smoke tests for the @cloudagi/agent-sdk public API surface.
 *
 * These tests exercise the stub implementations and validate that the
 * returned shapes conform to the documented interfaces.
 */

import { describe, expect, it } from "vitest";
import { createBuyerClient, registerAgent, serveAgent } from "./index.js";
import type { AgentRegistration, InvocationResult } from "./index.js";

// ---------------------------------------------------------------------------
// registerAgent
// ---------------------------------------------------------------------------

describe("registerAgent", () => {
  it("returns a valid AgentRegistration shape for well-formed input", async () => {
    const reg: AgentRegistration = await registerAgent({
      name: "Test Agent",
      skills: ["summarisation"],
      pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
      endpoint: "https://my-agent.example.com/invoke",
    });

    expect(typeof reg.agentId).toBe("string");
    expect(reg.agentId.length).toBeGreaterThan(0);

    expect(typeof reg.txSignature).toBe("string");
    // Stub signatures are 88 base-58 chars.
    expect(reg.txSignature.length).toBe(88);
  });

  it("throws ZodError when name is empty", async () => {
    await expect(
      registerAgent({
        name: "",
        skills: ["summarisation"],
        pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
        endpoint: "https://my-agent.example.com/invoke",
      }),
    ).rejects.toThrow();
  });

  it("throws ZodError when skills array is empty", async () => {
    await expect(
      registerAgent({
        name: "Test Agent",
        skills: [],
        pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
        endpoint: "https://my-agent.example.com/invoke",
      }),
    ).rejects.toThrow();
  });

  it("throws ZodError when endpoint is not a valid URL", async () => {
    await expect(
      registerAgent({
        name: "Test Agent",
        skills: ["summarisation"],
        pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
        endpoint: "not-a-url",
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// serveAgent
// ---------------------------------------------------------------------------

describe("serveAgent", () => {
  it("returns an AgentServer with a close() method", () => {
    const server = serveAgent(async (ctx) => ({
      text: `Echo: ${ctx.prompt}`,
    }));

    expect(typeof server.close).toBe("function");
  });

  it("close() resolves without throwing", async () => {
    const server = serveAgent(async (_ctx) => ({ text: "hello" }));
    await expect(server.close()).resolves.toBeUndefined();
  });

  it("calling close() twice is idempotent", async () => {
    const server = serveAgent(async (_ctx) => ({ text: "hello" }));
    await server.close();
    await expect(server.close()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createBuyerClient
// ---------------------------------------------------------------------------

describe("createBuyerClient", () => {
  it("creates a client with default options", () => {
    const client = createBuyerClient();
    expect(typeof client.invoke).toBe("function");
    expect(typeof client.listAgents).toBe("function");
    expect(typeof client.getReceipts).toBe("function");
  });

  it("invoke() returns a valid InvocationResult shape", async () => {
    const client = createBuyerClient();
    const result: InvocationResult = await client.invoke(
      "agent_stub_0001",
      "Please summarise this paragraph.",
    );

    expect(typeof result.receipt).toBe("string");
    expect(result.receipt.startsWith("rcpt_")).toBe(true);

    expect(typeof result.outputHash).toBe("string");
    // SHA-256 hex is always 64 chars.
    expect(result.outputHash.length).toBe(64);

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);

    expect(typeof result.usage.tokensIn).toBe("number");
    expect(typeof result.usage.tokensOut).toBe("number");
    expect(result.usage.tokensIn).toBeGreaterThan(0);
    expect(result.usage.tokensOut).toBeGreaterThan(0);

    expect(typeof result.completedAt).toBe("string");
    // completedAt should be a valid ISO-8601 date.
    expect(new Date(result.completedAt).toISOString()).toBe(result.completedAt);
  });

  it("listAgents() returns an array of agents", async () => {
    const client = createBuyerClient();
    const agents = await client.listAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);

    const first = agents[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(typeof first.agentId).toBe("string");
      expect(typeof first.name).toBe("string");
      expect(Array.isArray(first.skills)).toBe(true);
    }
  });

  it("listAgents() filters by skill", async () => {
    const client = createBuyerClient();
    const agents = await client.listAgents({ skill: "code-review" });
    expect(agents.every((a) => a.skills.includes("code-review"))).toBe(true);
  });

  it("getReceipts() returns an array of receipt handles", async () => {
    const client = createBuyerClient();
    const receipts = await client.getReceipts(2);
    expect(Array.isArray(receipts)).toBe(true);
    expect(receipts.length).toBeLessThanOrEqual(2);
    for (const r of receipts) {
      expect(typeof r).toBe("string");
      expect(r.startsWith("rcpt_")).toBe(true);
    }
  });

  it("throws ZodError when marketplaceUrl is not a valid URL", () => {
    expect(() => createBuyerClient({ marketplaceUrl: "not-a-url" })).toThrow();
  });
});
