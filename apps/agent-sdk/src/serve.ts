/**
 * Agent server stub for the CloudAGI Agent SDK.
 *
 * Wraps a caller-supplied {@link AgentHandler} in a metering layer that
 * counts tokens in/out and produces {@link MeterRecord}s. The HTTP listener
 * that exposes the handler to the marketplace is a TODO — real implementation
 * will use a lightweight HTTP server (e.g. Bun.serve or Node http.createServer).
 */

import { hashOutput, hashPrompt } from "./hashes.js";
import { countTokens } from "./tokens.js";
import type {
  AgentHandler,
  InvocationContext,
  InvocationOutput,
  MeterRecord,
} from "./types.js";

// ---------------------------------------------------------------------------
// Metering wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap an {@link AgentHandler} so every invocation is metered.
 * Records token counts, computes hashes, and emits a {@link MeterRecord}.
 *
 * @param handler   - The caller's agent logic.
 * @param onMetered - Optional callback invoked after each successful call
 *                    with the metering record for that invocation.
 * @returns A new handler with identical signature but metering side-effects.
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

    onMetered?.(record);

    return output;
  };
}

// ---------------------------------------------------------------------------
// Server handle
// ---------------------------------------------------------------------------

/**
 * Handle returned by {@link serveAgent}, allowing the caller to shut down
 * the agent server gracefully.
 */
export interface AgentServer {
  /**
   * Stop accepting new invocations and release all server resources.
   * In-flight requests are allowed to complete before shutdown.
   *
   * @returns A promise that resolves once the server is fully closed.
   */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start serving an agent handler, making it ready to receive marketplace
 * invocations.
 *
 * The current stub stores the metered handler in memory and wires up token
 * counting + hashing. The real implementation will:
 *   1. Bind to the port specified in `AGENT_PORT` (default 3000).
 *   2. Expose `POST /invoke` that deserialises the marketplace request,
 *      verifies the HMAC signature, calls the metered handler, and responds
 *      with the serialised {@link InvocationOutput}.
 *   3. Report metering records to the on-chain settlement layer.
 *
 * @param handler - Your agent logic: a function that accepts an
 *                  {@link InvocationContext} and returns an
 *                  {@link InvocationOutput}.
 * @returns An {@link AgentServer} with a `close()` method.
 *
 * @example
 * ```ts
 * const server = serveAgent(async (ctx) => ({
 *   text: `Echo: ${ctx.prompt}`,
 * }));
 * // Later:
 * await server.close();
 * ```
 */
export function serveAgent(handler: AgentHandler): AgentServer {
  // Wrap the caller's handler with metering.
  const meteredHandler = withMetering(handler, (record) => {
    // TODO: Ship metering records to the on-chain settlement layer.
    // For now, emit to stderr so developers can see usage during local dev.
    process.stderr.write(
      `[cloudagi-sdk] metered: in=${record.usage.tokensIn} out=${record.usage.tokensOut} hash=${record.outputHash.slice(0, 8)}…\n`,
    );
  });

  // TODO: Start real HTTP server and bind meteredHandler to POST /invoke.
  // Placeholder: expose a test helper so the stub is still exercisable.
  const _internalHandler = meteredHandler;
  void _internalHandler; // suppress unused-variable lint

  let closed = false;

  return {
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      // TODO: Drain in-flight requests and close TCP connections.
      await Promise.resolve();
    },
  };
}

// ---------------------------------------------------------------------------
// Internal test helper (not part of the public index.ts surface)
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
