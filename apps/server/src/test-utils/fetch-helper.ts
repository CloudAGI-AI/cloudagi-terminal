/**
 * Shared fetch helpers for testing Hono apps without spinning up a real server.
 *
 * Hono exposes `app.request(path, init?)` which constructs a real Request and
 * runs the full middleware + routing stack in-process.  These helpers wrap that
 * API with a typed, ergonomic surface so individual test files stay concise.
 */

import type { Hono } from "hono";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Additional raw RequestInit fields */
  init?: RequestInit;
}

export interface ParsedResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  /** Raw text if JSON parsing fails */
  text: string;
}

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Execute a request against a Hono app and parse the JSON response.
 *
 * @example
 *   const res = await request(app, "/health");
 *   expect(res.status).toBe(200);
 */
export async function request<T = unknown>(
  app: Hono,
  path: string,
  opts: RequestOptions = {},
): Promise<ParsedResponse<T>> {
  const { method = "GET", headers = {}, body, init = {} } = opts;

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const requestInit: RequestInit = {
    method,
    headers: reqHeaders,
    ...init,
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const res = await app.request(path, requestInit);
  const text = await res.text();

  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    parsed = text as unknown as T;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: parsed,
    text,
  };
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export const get = <T = unknown>(app: Hono, path: string, headers: Record<string, string> = {}) =>
  request<T>(app, path, { method: "GET", headers });

export const post = <T = unknown>(
  app: Hono,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => request<T>(app, path, { method: "POST", body, headers });

export const patch = <T = unknown>(
  app: Hono,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => request<T>(app, path, { method: "PATCH", body, headers });
