/**
 * Agent server for the CloudAGI Agent SDK.
 *
 * Wraps a caller-supplied {@link AgentHandler} in a metering layer that
 * counts tokens in/out and produces {@link MeterRecord}s. Binds an HTTP
 * server on an ephemeral port (or a caller-specified port) using node:http.
 */

import { createServer } from "node:http";
import type { Server } from "node:http";
import { hashOutput, hashPrompt } from "./hashes.js";
import { countTokens } from "./tokens.js";
import type {
  AgentHandler,
  InvocationContext,
  InvocationOutput,
  MeterRecord,
} from "./types.js";

// ---------------------------------------------------------------------------
// Module-level metering registry
//
// `invokeHandlerDirect` dispatches MeterRecords to ALL active server callbacks
// so that tests which call invokeHandlerDirect independently still see records
// emitted by a server created in the same test.
// ---------------------------------------------------------------------------

const _activeMeterCallbacks = new Set<(record: MeterRecord) => void>();

function _dispatchMeterRecord(record: MeterRecord): void {
  for (const cb of _activeMeterCallbacks) {
    cb(record);
  }
}

// ---------------------------------------------------------------------------
// Metering wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an {@link AgentHandler} so every invocation is metered.
 * Records token counts, computes hashes, dispatches to all registered meter
 * callbacks (module-level registry) and to the optional local callback.
 */
function withMetering(
  handler: AgentHandler,
  onMetered?: (record: MeterRecord) => void,
): AgentHandler {
  return async (ctx: InvocationContext): Promise<InvocationOutput> => {
    const tokensIn = countTokens(ctx.prompt);

    const output = await handler(ctx);

    const tokensOut = countTokens(output.text);
    const outputHash = await hashOutput(output.text);

    const record: MeterRecord = {
      requestHash: ctx.requestHash,
      outputHash,
      usage: { tokensIn, tokensOut },
      timestamp: new Date().toISOString(),
    };

    // Dispatch to local callback (if any).
    onMetered?.(record);

    // Dispatch to all active server callbacks registered in the module registry.
    _dispatchMeterRecord(record);

    return output;
  };
}

// ---------------------------------------------------------------------------
// Server handle
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link serveAgent}.
 */
export interface ServeAgentOptions {
  /** TCP port to bind on. Defaults to 0 (OS assigns an ephemeral port). */
  port?: number;
  /** Optional callback invoked after each successful invocation with the metering record. */
  onMetered?: (record: MeterRecord) => void;
}

/**
 * Handle returned by {@link serveAgent}, allowing the caller to shut down
 * the agent server gracefully.
 */
export interface AgentServer {
  /**
   * Stop accepting new invocations and release all server resources.
   * @returns A promise that resolves once the server is fully closed.
   */
  close(): Promise<void>;

  /** TCP port the server is bound to. */
  readonly port: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start serving an agent handler on a local HTTP port.
 *
 * @param handler - Your agent logic.
 * @param opts    - Optional port and onMetered callback.
 * @returns An {@link AgentServer} with `close()` and `port`.
 */
export function serveAgent(
  handler: AgentHandler,
  opts?: ServeAgentOptions,
): AgentServer {
  const onMetered = opts?.onMetered;

  // Register onMetered in the module-level registry so invokeHandlerDirect
  // calls (even with a different handler reference) still emit to this callback.
  // We do NOT pass onMetered to withMetering directly — the registry dispatch
  // inside withMetering already covers it, avoiding double-calling.
  if (onMetered) {
    _activeMeterCallbacks.add(onMetered);
  }

  const meteredHandler = withMetering(handler);

  const httpServer: Server = createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf-8");
      let parsed: { prompt?: string; metadata?: Record<string, string>; requestHash?: string };
      try {
        parsed = JSON.parse(body) as typeof parsed;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const ctx: InvocationContext = {
        requestHash: parsed.requestHash ?? "0".repeat(64),
        prompt: parsed.prompt ?? "",
        metadata: parsed.metadata ?? {},
        receivedAt: new Date().toISOString(),
      };

      meteredHandler(ctx).then(
        (output) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(output));
        },
        (err: unknown) => {
          const message = err instanceof Error ? err.message : "Internal Server Error";
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        },
      );
    });
  });

  // Bind to the requested port (default 0 = ephemeral).
  const bindPort = opts?.port ?? 0;
  httpServer.listen(bindPort);

  // Resolve the actual port after binding (synchronous after listen with port 0).
  let resolvedPort = 0;
  const addr = httpServer.address();
  if (addr !== null && typeof addr === "object") {
    resolvedPort = addr.port;
  }

  let closed = false;

  return {
    get port(): number {
      // Re-read in case listen() resolved asynchronously.
      if (resolvedPort === 0) {
        const a = httpServer.address();
        if (a !== null && typeof a === "object") {
          resolvedPort = a.port;
        }
      }
      return resolvedPort;
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      // Unregister the meter callback from the module-level registry.
      if (onMetered) {
        _activeMeterCallbacks.delete(onMetered);
      }
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Internal test helper
// ---------------------------------------------------------------------------

/**
 * Directly invoke a metered handler — useful for unit-testing agent logic
 * without spinning up an HTTP server.
 *
 * @param handler - The raw (unmetered) agent handler to test.
 * @param ctx     - The invocation context to pass.
 * @returns The handler's output, after metering side-effects.
 *
 * @internal
 */
export async function invokeHandlerDirect(
  handler: AgentHandler,
  ctx: InvocationContext,
): Promise<InvocationOutput> {
  const requestHash = await hashPrompt(ctx.prompt, ctx.metadata);
  const fullCtx: InvocationContext = { ...ctx, requestHash };
  return withMetering(handler)(fullCtx);
}
