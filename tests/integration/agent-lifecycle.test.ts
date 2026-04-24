/**
 * Integration: agent-sdk lifecycle across package boundary
 *
 * Exercises registerAgent() → server GET /v1/agents listing → serveAgent()
 * invocation → receipt event emission.
 *
 * Tests are RED: they assert contracts that Wave-2 implementations must satisfy.
 *
 * SPEC refs: §4.1 Seller onboarding, §4.2 Buyer flow, §5.1 Agent data model,
 *            §6.4 Data flow at invocation time
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// SDK imports — will resolve once dist/ is built by Wave 2
// ---------------------------------------------------------------------------
// @ts-expect-error — module not yet built; intentional red-phase import
import { registerAgent, serveAgent, invokeHandlerDirect, createBuyerClient } from "@cloudagi/agent-sdk";
// @ts-expect-error — module not yet built; intentional red-phase import
import type { AgentRegistration, AgentHandler, InvocationContext, MeterRecord } from "@cloudagi/agent-sdk";
// @ts-expect-error — module not yet built; intentional red-phase import
import { app } from "@cloudagi/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serverRequest(path: string, init?: RequestInit): Promise<Response> {
  return (app as { request(url: string, init?: RequestInit): Promise<Response> }).request(path, init);
}

// ---------------------------------------------------------------------------
// Suite 1 — registerAgent() → listed by server GET /v1/agents
// (SPEC §4.1 step 3 — agent becomes discoverable after registration)
// ---------------------------------------------------------------------------

describe("registerAgent() → GET /v1/agents listing", () => {
  it("registerAgent resolves with agentId and txSignature", async () => {
    const reg: AgentRegistration = await registerAgent({
      name: "Sentiment Classifier",
      skills: ["sentiment.classify.v1"],
      pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
      endpoint: "https://sentiment-agent.example.com/invoke",
    });

    expect(reg).toHaveProperty("agentId");
    expect(typeof reg.agentId).toBe("string");
    expect(reg.agentId.length).toBeGreaterThan(0);

    expect(reg).toHaveProperty("txSignature");
    // Solana tx signatures are 88 base-58 chars
    expect(reg.txSignature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/);
  });

  it("registered agent appears in GET /v1/agents response", async () => {
    // Register an agent via SDK
    const reg: AgentRegistration = await registerAgent({
      name: "Code Reviewer",
      skills: ["code.review.v1"],
      pricing: { perMTokensIn: 1500, perMTokensOut: 3000 },
      endpoint: "https://code-reviewer.example.com/invoke",
    });

    // RED: server stub currently returns empty data array; Wave 2 must
    // persist registration and serve it here
    const res = await serverRequest("/v1/agents");
    const body = await res.json() as { data: Array<{ id: string; skills: string[] }> };

    expect(res.status).toBe(200);
    const found = body.data.find((a) => a.id === reg.agentId);
    expect(found).toBeDefined();
    expect(found?.skills).toContain("code.review.v1");
  });

  it("registered agent is discoverable by skill filter", async () => {
    const reg: AgentRegistration = await registerAgent({
      name: "Extractor Agent",
      skills: ["extract.entities.v1"],
      pricing: { perMTokensIn: 800, perMTokensOut: 1600 },
      endpoint: "https://extractor.example.com/invoke",
    });

    const res = await serverRequest("/v1/agents?skill=extract.entities.v1");
    const body = await res.json() as { data: Array<{ id: string }> };

    const found = body.data.find((a) => a.id === reg.agentId);
    // RED: Wave 2 must implement skill filter
    expect(found).toBeDefined();
  });

  it("registerAgent rejects invalid options with a ZodError", async () => {
    await expect(
      registerAgent({
        name: "", // empty name is invalid per schema
        skills: [],
        pricing: { perMTokensIn: -1, perMTokensOut: 0 }, // negative price invalid
        endpoint: "not-a-url", // invalid URL
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — serveAgent() handler invoked by buyer client → returns output
// (SPEC §4.2 steps 4–8, §6.4)
// ---------------------------------------------------------------------------

describe("serveAgent() handler invocation", () => {
  it("serveAgent returns an AgentServer with a close() method", () => {
    const handler: AgentHandler = async (ctx: InvocationContext) => ({
      text: `Echo: ${ctx.prompt}`,
    });

    const server = serveAgent(handler);
    expect(server).toHaveProperty("close");
    expect(typeof server.close).toBe("function");

    return server.close();
  });

  it("invokeHandlerDirect calls handler and returns InvocationOutput", async () => {
    const handler: AgentHandler = async (ctx: InvocationContext) => ({
      text: `Sentiment: POSITIVE (prompt was: "${ctx.prompt}")`,
    });

    const result = await invokeHandlerDirect(handler, {
      requestHash: "",
      prompt: "I love this product!",
      metadata: { sessionId: "sess_001", agentId: "agent_sentiment" },
      receivedAt: new Date().toISOString(),
    });

    expect(result.text).toContain("POSITIVE");
    expect(typeof result.text).toBe("string");
  });

  it("invokeHandlerDirect computes a non-empty requestHash before calling handler", async () => {
    let capturedHash = "";

    const handler: AgentHandler = async (ctx: InvocationContext) => {
      capturedHash = ctx.requestHash;
      return { text: "done" };
    };

    await invokeHandlerDirect(handler, {
      requestHash: "",
      prompt: "Hash me",
      metadata: {},
      receivedAt: new Date().toISOString(),
    });

    // The SDK must fill requestHash via hashPrompt() before calling handler
    expect(capturedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buyer client invoke() returns output matching handler response", async () => {
    const client = createBuyerClient({
      marketplaceUrl: "http://localhost:3000",
      maxBudgetLamports: 100_000,
    });

    const result = await client.invoke("agent_stub_0001", "Summarise this text");

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("receipt");
    expect(result).toHaveProperty("outputHash");
    expect(result).toHaveProperty("usage");
    expect(result.usage.tokensIn).toBeGreaterThan(0);
    expect(result.usage.tokensOut).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — receipt event fires with correct hashes + token counts
// (SPEC §4.2 steps 14–17, §9.2 Hash construction)
// ---------------------------------------------------------------------------

describe("receipt event — hashes and token counts", () => {
  it("MeterRecord outputHash is a 64-char hex SHA-256 of the output", async () => {
    let capturedRecord: MeterRecord | null = null;

    const handler: AgentHandler = async (_ctx: InvocationContext) => ({
      text: "The sentiment is clearly positive.",
    });

    // serveAgent with metering callback
    const server = serveAgent(handler, (record: MeterRecord) => {
      capturedRecord = record;
    });

    await invokeHandlerDirect(handler, {
      requestHash: "",
      prompt: "What is the sentiment?",
      metadata: {},
      receivedAt: new Date().toISOString(),
    });

    await server.close();

    // RED: serveAgent currently ignores the second callback arg; Wave 2 must
    // expose the metering hook via the public API
    expect(capturedRecord).not.toBeNull();
    expect((capturedRecord as MeterRecord).outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("MeterRecord usage.tokensIn matches countTokens(prompt)", async () => {
    const testPrompt = "This is a test prompt for token counting verification.";

    let capturedRecord: MeterRecord | null = null;

    const handler: AgentHandler = async (_ctx) => ({ text: "OK" });
    const server = serveAgent(handler, (record: MeterRecord) => {
      capturedRecord = record;
    });

    await invokeHandlerDirect(handler, {
      requestHash: "",
      prompt: testPrompt,
      metadata: {},
      receivedAt: new Date().toISOString(),
    });

    await server.close();

    // SPEC: token counting uses ceil(chars / 4) heuristic
    const expectedTokensIn = Math.ceil(testPrompt.length / 4);

    // RED: callback not yet wired in Wave 1 stub
    expect((capturedRecord as MeterRecord | null)?.usage.tokensIn).toBe(expectedTokensIn);
  });

  it("receipt requestHash is deterministic: same prompt + metadata → same hash", async () => {
    const ctx1: InvocationContext = {
      requestHash: "",
      prompt: "deterministic prompt",
      metadata: { key: "value" },
      receivedAt: "2025-01-01T00:00:00Z",
    };
    const ctx2 = { ...ctx1 };

    const handler: AgentHandler = async (ctx) => ({ text: ctx.requestHash });

    const [out1, out2] = await Promise.all([
      invokeHandlerDirect(handler, ctx1),
      invokeHandlerDirect(handler, ctx2),
    ]);

    // Both invocations must produce the same requestHash
    expect(out1.text).toBe(out2.text);
    expect(out1.text).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — heartbeat endpoint (SPEC §4.1 step 9, §7.1)
// ---------------------------------------------------------------------------

describe("POST /v1/agents/:id/heartbeat", () => {
  it("returns 200 with a session routing token", async () => {
    const res = await serverRequest("/v1/agents/agent_abc/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adapterVersion: "0.1.0", uptimeSec: 3600 }),
    });

    // RED: endpoint not yet implemented (stub returns 404 for unknown routes)
    expect(res.status).toBe(200);

    const body = await res.json() as { routingToken?: string };
    expect(body).toHaveProperty("routingToken");
    expect(typeof body.routingToken).toBe("string");
  });

  it("returns 404 for a non-existent agent id", async () => {
    const res = await serverRequest("/v1/agents/nonexistent_agent_xyz/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adapterVersion: "0.1.0" }),
    });

    expect(res.status).toBe(404);
  });
});
