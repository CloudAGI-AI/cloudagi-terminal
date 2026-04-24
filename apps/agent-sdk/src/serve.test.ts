/**
 * Tests for serve.ts — serveAgent server lifecycle, metering, and error handling.
 *
 * Expected status: mostly RED until Wave 2 impl lands a real HTTP server.
 * Tests that exercise the current stub (close() idempotency, server shape)
 * will be GREEN; tests that require actual HTTP binding or invocation-event
 * emission will be RED.
 */

import { describe, expect, it, vi } from "vitest";
import { serveAgent, invokeHandlerDirect } from "./serve.js";
import type { AgentHandler, InvocationContext, InvocationOutput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides?: Partial<InvocationContext>): InvocationContext {
  return {
    requestHash: "a".repeat(64),
    prompt: "Summarise this paragraph for me.",
    metadata: {},
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

const echoHandler: AgentHandler = async (ctx) => ({
  text: `Echo: ${ctx.prompt}`,
});

const errorHandler: AgentHandler = async (_ctx) => {
  throw new Error("handler exploded");
};

// ---------------------------------------------------------------------------
// Server shape — GREEN (stub passes)
// ---------------------------------------------------------------------------

describe("serveAgent — return shape", () => {
  it("returns an object with a close() method", () => {
    const server = serveAgent(echoHandler);
    expect(typeof server.close).toBe("function");
    void server.close();
  });

  it("close() returns a Promise", () => {
    const server = serveAgent(echoHandler);
    const result = server.close();
    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it("close() resolves to undefined", async () => {
    const server = serveAgent(echoHandler);
    await expect(server.close()).resolves.toBeUndefined();
  });

  it("calling close() twice is idempotent — does not throw", async () => {
    const server = serveAgent(echoHandler);
    await server.close();
    await expect(server.close()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// invokeHandlerDirect — metering wrapper — GREEN (uses implemented hashes.ts)
// ---------------------------------------------------------------------------

describe("invokeHandlerDirect — metering", () => {
  it("returns the handler's text output", async () => {
    const ctx = makeCtx({ prompt: "Hello" });
    const output: InvocationOutput = await invokeHandlerDirect(echoHandler, ctx);
    expect(output.text).toBe("Echo: Hello");
  });

  it("passes prompt through to the handler unchanged", async () => {
    const received: string[] = [];
    const capturingHandler: AgentHandler = async (ctx) => {
      received.push(ctx.prompt);
      return { text: "ok" };
    };
    const ctx = makeCtx({ prompt: "My special prompt" });
    await invokeHandlerDirect(capturingHandler, ctx);
    expect(received[0]).toBe("My special prompt");
  });

  it("enriches the context with a requestHash string", async () => {
    const seen: string[] = [];
    const capturingHandler: AgentHandler = async (ctx) => {
      seen.push(ctx.requestHash);
      return { text: "ok" };
    };
    const ctx = makeCtx({ prompt: "hash me" });
    await invokeHandlerDirect(capturingHandler, ctx);
    expect(typeof seen[0]).toBe("string");
    expect(seen[0]!.length).toBe(64); // SHA-256 hex
  });

  it("propagates errors thrown by the handler", async () => {
    const ctx = makeCtx();
    await expect(
      invokeHandlerDirect(errorHandler, ctx),
    ).rejects.toThrow("handler exploded");
  });
});

// ---------------------------------------------------------------------------
// Token metering side-effects — RED (requires real metering integration)
// ---------------------------------------------------------------------------

describe("serveAgent — invocation event emission (RED)", () => {
  it("emits a metering record for each invocation via the onMetered callback", async () => {
    // RED: current stub exposes no public onMetered callback on AgentServer.
    // Wave 2 should expose an event emitter or onMetered option.
    const records: unknown[] = [];

    // This will fail until serveAgent accepts an onMetered option.
    const server = (serveAgent as (h: AgentHandler, opts?: { onMetered?: (r: unknown) => void }) => ReturnType<typeof serveAgent>)(
      echoHandler,
      { onMetered: (r) => records.push(r) },
    );

    const ctx = makeCtx({ prompt: "test metering" });
    await invokeHandlerDirect(echoHandler, ctx);

    // RED: expect the record to have been emitted
    expect(records.length).toBeGreaterThan(0);
    await server.close();
  });

  it("metering record contains requestHash, outputHash, usage, timestamp", async () => {
    // RED: same as above — requires onMetered support in serveAgent.
    const records: Array<{
      requestHash: string;
      outputHash: string;
      usage: { tokensIn: number; tokensOut: number };
      timestamp: string;
    }> = [];

    const server = (serveAgent as (h: AgentHandler, opts?: { onMetered?: (r: unknown) => void }) => ReturnType<typeof serveAgent>)(
      echoHandler,
      { onMetered: (r) => records.push(r as (typeof records)[0]) },
    );

    const ctx = makeCtx({ prompt: "record fields test" });
    await invokeHandlerDirect(echoHandler, ctx);

    const rec = records[0];
    expect(typeof rec?.requestHash).toBe("string");
    expect(typeof rec?.outputHash).toBe("string");
    expect(rec?.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof rec?.usage.tokensIn).toBe("number");
    expect(typeof rec?.usage.tokensOut).toBe("number");
    expect(typeof rec?.timestamp).toBe("string");
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// HTTP server binding — RED (requires real HTTP implementation)
// ---------------------------------------------------------------------------

describe("serveAgent — HTTP server (RED)", () => {
  it("binds to a port and reports it via server.port", () => {
    // RED: current stub has no port property.
    const server = serveAgent(echoHandler) as ReturnType<typeof serveAgent> & { port?: number };
    expect(typeof server.port).toBe("number");
    void server.close();
  });

  it("stops accepting connections after close() is called", async () => {
    // RED: no real HTTP server yet.
    const server = serveAgent(echoHandler) as ReturnType<typeof serveAgent> & { port?: number };
    const port = server.port ?? 0;
    await server.close();

    // After close, any attempt to connect should fail.
    const connectAfterClose = (): Promise<void> =>
      new Promise((_, reject) => {
        import("net").then(({ createConnection }) => {
          const sock = createConnection({ port, host: "127.0.0.1" });
          sock.once("error", reject);
          sock.once("connect", () => reject(new Error("should not connect")));
        }).catch(reject);
      });

    await expect(connectAfterClose()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Handler error isolation — RED
// ---------------------------------------------------------------------------

describe("serveAgent — error handling (RED)", () => {
  it("does not crash the server when a handler throws", async () => {
    // RED: requires HTTP layer to catch and 500 the request.
    const server = serveAgent(errorHandler);
    // Invoking via the internal helper should still surface the error
    const ctx = makeCtx();
    await expect(invokeHandlerDirect(errorHandler, ctx)).rejects.toThrow();
    // But server itself should remain open
    await expect(server.close()).resolves.toBeUndefined();
  });
});
