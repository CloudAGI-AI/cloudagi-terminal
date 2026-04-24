/**
 * Structured request/response logger middleware — Wave 2 implementation.
 *
 * Features:
 *  - Emits one JSON log line per request (after response).
 *  - Fields: requestId, method, path, status, durationMs, bytes, level,
 *            userWallet (if set via auth middleware), headers (redacted).
 *  - Redacts sensitive headers: Authorization, X-Payment-Auth,
 *    X-Wallet-Signature, Cookie → replaced with "[REDACTED]".
 *  - Adds X-Request-Id response header (crypto.randomUUID).
 *  - level: "info" for < 500, "error" for 5xx.
 *
 * Usage:
 *   app.use("*", requestLogger())          // JSON mode (default)
 *   app.use("*", requestLogger({ stream: "pretty" }))
 */

import type { Context, Next, MiddlewareHandler } from "hono";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoggingMiddlewareOpts {
  /** Output format — "json" (default) or "pretty" (human-readable). */
  stream?: "json" | "pretty";
}

interface LogEntry {
  requestId: string;
  level: "info" | "error";
  method: string;
  path: string;
  status: number;
  durationMs: number;
  bytes: number;
  userWallet?: string;
  headers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Sensitive header names (lower-cased for comparison)
// ---------------------------------------------------------------------------

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "x-payment-auth",
  "x-wallet-signature",
  "cookie",
  "set-cookie",
]);

function redactHeaders(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Extract request headers as plain object
// ---------------------------------------------------------------------------

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function requestLogger(opts: LoggingMiddlewareOpts = {}): MiddlewareHandler {
  const mode = opts.stream ?? "json";

  return async (c: Context, next: Next): Promise<void> => {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    // Attach request ID so downstream handlers can use it.
    c.set("requestId" as never, requestId);

    await next();

    const durationMs = Date.now() - start;
    const status = c.res.status;
    const level: "info" | "error" = status >= 500 ? "error" : "info";

    // Collect response size from Content-Length if available, else 0.
    const contentLength = c.res.headers.get("content-length");
    const bytes = contentLength ? Number(contentLength) : 0;

    // User wallet injected by auth middleware (if present).
    const userWallet = (c.get("user" as never) as { wallet?: string } | undefined)?.wallet;

    // Collect and redact request headers.
    const rawHeaders = headersToRecord(c.req.raw.headers);
    const safeHeaders = redactHeaders(rawHeaders);

    // Add X-Request-Id to response.
    c.header("X-Request-Id", requestId);

    const entry: LogEntry = {
      requestId,
      level,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status,
      durationMs,
      bytes,
      ...(userWallet !== undefined ? { userWallet } : {}),
      headers: safeHeaders,
    };

    if (mode === "pretty") {
      const color = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
      console.log(
        `${color}[${requestId.slice(0, 8)}] ${entry.method} ${entry.path} ${status} +${durationMs}ms\x1b[0m`
      );
    } else {
      console.log(JSON.stringify(entry));
    }
  };
}

// ---------------------------------------------------------------------------
// loggingMiddleware alias (spec §12 export name)
// ---------------------------------------------------------------------------

export function loggingMiddleware(opts?: LoggingMiddlewareOpts): MiddlewareHandler {
  return requestLogger(opts);
}
