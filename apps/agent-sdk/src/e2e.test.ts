/**
 * End-to-end lifecycle tests for the agent-sdk.
 *
 * Tests the full flow: register → serve → client.invoke → receipt returned.
 * The wire boundary is mocked via the invokeHandlerDirect test helper so
 * no real HTTP server or Solana cluster is needed.
 *
 * Expected status: RED until Wave 2 impl stitches the real HTTP layer together.
 * Several tests will partially pass because the stubs return valid shapes.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerAgent } from "./register.js";
import { serveAgent, invokeHandlerDirect } from "./serve.js";
import { createBuyerClient } from "./buyer.js";
import { hashOutput, hashPrompt } from "./hashes.js";
import type {
  AgentHandler,
  InvocationContext,
  InvocationResult,
  AgentRegistration,
} from "./types.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const WALLET = new Uint8Array(64).fill(7);

const AGENT_OPTS = {
  name: "E2E Test Agent",
  skills: ["summarisation", "code-review"],
  pricing: { perMTokensIn: 1000, perMTokensOut: 2000 },
  endpoint: "https://e2e-test.example.com/invoke",
  walletKeypair: WALLET,
} as const;

const echoHandler: AgentHandler = async (ctx) => ({
  text: `Echo: ${ctx.prompt}`,
  data: { receivedAt: ctx.receivedAt },
});

function makeCtx(prompt: string): InvocationContext {
  return {
    requestHash: "0".repeat(64),
    prompt,
    metadata: { sessionId: "sess_test_001" },
    receivedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Phase 1: Register
// ---------------------------------------------------------------------------

describe("E2E — registerAgent phase", () => {
  it("returns a valid registration with agentId and txSignature", async () => {
    const reg: AgentRegistration = await registerAgent(AGENT_OPTS);
    expect(typeof reg.agentId).toBe("string");
    expect(reg.agentId.length).toBeGreaterThan(0);
    expect(typeof reg.txSignature).toBe("string");
    expect(reg.txSignature.length).toBe(88);
  });

  it("registered agentId can be used as a string to invoke", async () => {
    const reg = await registerAgent(AGENT_OPTS);
    const client = createBuyerClient();
    // RED: real impl would look up the agentId on-chain; stub accepts any string.
    const result = await client.invoke(reg.agentId, "test prompt");
    expect(typeof result.receipt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Serve
// ---------------------------------------------------------------------------

describe("E2E — serveAgent phase", () => {
  it("creates a server handle with close()", () => {
    const server = serveAgent(echoHandler);
    expect(typeof server.close).toBe("function");
    void server.close();
  });

  it("server can be closed cleanly after registration", async () => {
    await registerAgent(AGENT_OPTS);
    const server = serveAgent(echoHandler);
    await expect(server.close()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Handler invocation (via invokeHandlerDirect)
// ---------------------------------------------------------------------------

describe("E2E — invokeHandlerDirect (mock wire boundary)", () => {
  it("handler receives the prompt and returns text", async () => {
    const ctx = makeCtx("Summarise the CloudAGI whitepaper.");
    const output = await invokeHandlerDirect(echoHandler, ctx);
    expect(output.text).toContain("Summarise the CloudAGI whitepaper.");
  });

  it("context.requestHash is a 64-char SHA-256 hex string", async () => {
    const seen: string[] = [];
    const capturingHandler: AgentHandler = async (ctx) => {
      seen.push(ctx.requestHash);
      return { text: "captured" };
    };
    await invokeHandlerDirect(capturingHandler, makeCtx("capture hash"));
    expect(seen[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same prompt + metadata always produces the same requestHash", async () => {
    const ctx1 = makeCtx("deterministic prompt");
    const ctx2 = makeCtx("deterministic prompt");
    const hashes: string[] = [];
    const recordingHandler: AgentHandler = async (ctx) => {
      hashes.push(ctx.requestHash);
      return { text: "ok" };
    };
    await invokeHandlerDirect(recordingHandler, ctx1);
    await invokeHandlerDirect(recordingHandler, ctx2);
    expect(hashes[0]).toBe(hashes[1]);
  });

  it("outputHash is deterministic for the same output text", async () => {
    const text = "Deterministic output";
    const h1 = await hashOutput(text);
    const h2 = await hashOutput(text);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Full lifecycle — register → serve → invoke → receipt (RED)
// ---------------------------------------------------------------------------

describe("E2E — full lifecycle (RED until HTTP layer lands)", () => {
  it("buyer.invoke returns a receipt linked to the registered agentId (RED)", async () => {
    // Register the agent
    const reg = await registerAgent(AGENT_OPTS);

    // Serve it
    const server = serveAgent(echoHandler);

    // Buyer invokes it
    const client = createBuyerClient({ maxBudgetLamports: 100_000 });
    const result: InvocationResult = await client.invoke(
      reg.agentId,
      "E2E full lifecycle test",
    );

    // RED: real impl must route to the registered agent's endpoint.
    // Stub just generates a random receipt regardless of agentId.
    expect(result.receipt).toMatch(/^rcpt_/);
    expect(result.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);

    await server.close();
  });

  it("receipt returned by invoke appears in getReceipts (RED)", async () => {
    // RED: stub generates random receipt IDs and does not track them per buyer.
    const client = createBuyerClient();
    const result = await client.invoke("agent_stub_0001", "receipt tracking test");
    const receipts = await client.getReceipts(10);

    // RED: real impl must surface the receipt from invoke() in getReceipts().
    expect(receipts).toContain(result.receipt);
  });

  it("outputHash in InvocationResult matches SHA-256 of the response text (RED)", async () => {
    // RED: stub computes hashOutput(stubResponseText) so this should actually pass,
    // but we pin it as a regression test for the real impl.
    const client = createBuyerClient();
    const result = await client.invoke("agent_stub_0001", "hash verification");
    const expectedHash = await hashOutput(result.text);
    expect(result.outputHash).toBe(expectedHash);
  });

  it("invoke respects maxBudgetLamports and rejects over-budget calls (RED)", async () => {
    // RED: stub does not enforce budget.
    // Real impl must reject when estimated cost > maxBudgetLamports.
    const tightClient = createBuyerClient({ maxBudgetLamports: 1 });

    // A very long prompt would cost more than 1 lamport at any real rate.
    const longPrompt = "word ".repeat(10_000);
    await expect(
      tightClient.invoke("agent_stub_0001", longPrompt),
    ).rejects.toThrow();
  });

  it("invoke on a closed server returns an error (RED)", async () => {
    // RED: requires real HTTP server.
    const server = serveAgent(echoHandler) as ReturnType<typeof serveAgent> & { port?: number };
    await server.close();

    const client = createBuyerClient({
      marketplaceUrl: `http://127.0.0.1:${server.port ?? 0}`,
    });

    await expect(
      client.invoke("agent_test", "post-close invoke"),
    ).rejects.toThrow();
  });

  it("handler error is surfaced to the buyer as a structured error (RED)", async () => {
    // RED: requires HTTP layer to convert handler exceptions to error responses.
    const throwingHandler: AgentHandler = async () => {
      throw new Error("handler intentionally failed");
    };
    const server = serveAgent(throwingHandler);

    // RED: via direct invocation the error propagates; via real HTTP it should
    // be a structured 500 response that the client turns into a typed error.
    const ctx = makeCtx("trigger error");
    await expect(invokeHandlerDirect(throwingHandler, ctx)).rejects.toThrow(
      "handler intentionally failed",
    );

    await server.close();
  });

  it("metering record outputHash matches the output returned to the buyer (RED)", async () => {
    // RED: requires onMetered callback support in serveAgent.
    const meterRecords: Array<{ outputHash: string }> = [];

    const server = (serveAgent as (
      h: AgentHandler,
      opts?: { onMetered?: (r: unknown) => void },
    ) => ReturnType<typeof serveAgent>)(echoHandler, {
      onMetered: (r) => meterRecords.push(r as { outputHash: string }),
    });

    const ctx = makeCtx("metering match test");
    const output = await invokeHandlerDirect(echoHandler, ctx);
    const expectedOutputHash = await hashOutput(output.text);

    // RED: onMetered not yet called because serveAgent doesn't accept the option.
    expect(meterRecords.length).toBeGreaterThan(0);
    expect(meterRecords[0]?.outputHash).toBe(expectedOutputHash);

    await server.close();
  });
});
