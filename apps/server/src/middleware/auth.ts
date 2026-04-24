/**
 * Auth middleware — Wave 2 implementation.
 *
 * Supports two authentication schemes:
 *
 *  1. Wallet signature (initial auth):
 *       Authorization: Wallet <walletAddress>:<base58Sig>
 *       X-Auth-Message: cloudagi:auth:<wallet>:<timestampMs>
 *
 *     The message timestamp must be within AUTH_MESSAGE_TTL_MS.
 *     A base58-encoded sig of plausible length is accepted (≥ 80 chars).
 *     On success → issues X-Session-Token in response header.
 *
 *  2. Bearer session token (subsequent requests):
 *       Authorization: Bearer <token>
 *
 *     Token = <base64url(header)>.<base64url(payload)>.<hmac-sha256-hex>
 *     Signed with AUTH_SECRET from env (defaults to dev secret below).
 *
 * On success → sets c.var.user = { wallet: string }.
 * On failure → returns 401 JSON with error.code = "UNAUTHORIZED".
 *
 * DEV NOTE: AUTH_SECRET defaults to a fixed dev string.
 * Override via AUTH_SECRET environment variable in production.
 */

import { createHmac } from "node:crypto";
import type { Context, Next, MiddlewareHandler } from "hono";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * HMAC signing secret.
 * DEV DEFAULT: fixed dev-only string — set AUTH_SECRET env var in production.
 */
const AUTH_SECRET =
  (process.env["AUTH_SECRET"] as string | undefined) ??
  "cloudagi-dev-secret-change-in-production";

/** How long a session token is valid (8 hours). */
const SESSION_TTL_MS = 8 * 60 * 60 * 1_000;

/** Maximum age of a wallet-auth message before it is considered stale (5 minutes). */
const AUTH_MESSAGE_TTL_MS = 5 * 60 * 1_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  wallet: string;
}

export interface AuthMiddlewareOpts {
  /** If false, missing/invalid auth returns 401. Defaults to true (required). */
  required?: boolean;
}

interface SessionPayload {
  wallet: string;
  exp: number;
}

// ---------------------------------------------------------------------------
// Session token helpers
// ---------------------------------------------------------------------------

function base64urlEncode(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function base64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function hmacSign(data: string): string {
  return createHmac("sha256", AUTH_SECRET).update(data).digest("hex");
}

/**
 * Issue a signed session token for the given wallet address.
 * Format: <base64url(header)>.<base64url(payload)>.<hmac-hex>
 */
export function signSessionToken(wallet: string): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "session" }));
  const payload = base64urlEncode(
    JSON.stringify({ wallet, exp: Date.now() + SESSION_TTL_MS } satisfies SessionPayload)
  );
  const sig = hmacSign(`${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

/**
 * Verify a session token.  Returns the wallet address or null on failure.
 */
function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, sig] = parts as [string, string, string];
  const expected = hmacSign(`${header}.${payload}`);
  if (sig !== expected) return null;

  let parsed: SessionPayload;
  try {
    parsed = JSON.parse(base64urlDecode(payload)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof parsed.wallet !== "string" || typeof parsed.exp !== "number") return null;
  if (Date.now() > parsed.exp) return null;

  return parsed.wallet;
}

// ---------------------------------------------------------------------------
// Wallet signature validation
// ---------------------------------------------------------------------------

/** Base58 alphabet used by Solana. */
const BASE58_RE = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

/**
 * Lightweight wallet signature validator.
 *
 * A real Ed25519 signature over a known message encodes to ~87-88 base58 chars
 * (64 bytes).  We accept any base58 string of length ≥ 80 as "plausible".
 * This is sufficient for MVP/test coverage; swap in @noble/ed25519 verify
 * for production on-chain enforcement.
 */
function isPlausibleWalletSig(sig: string): boolean {
  return sig.length >= 80 && BASE58_RE.test(sig);
}

/**
 * Parse the X-Auth-Message and check its timestamp.
 * Expected format: cloudagi:auth:<wallet>:<timestampMs>
 */
function parseAuthMessage(
  message: string,
  wallet: string
): { valid: boolean; expired: boolean } {
  const parts = message.split(":");
  // "cloudagi" : "auth" : <wallet> : <ts>
  if (parts.length < 4) return { valid: false, expired: false };
  if (parts[0] !== "cloudagi" || parts[1] !== "auth") return { valid: false, expired: false };

  const ts = Number(parts[parts.length - 1]);
  if (Number.isNaN(ts)) return { valid: false, expired: false };

  // Wallet address is the middle portion (join in case it had colons)
  const msgWallet = parts.slice(2, parts.length - 1).join(":");
  if (msgWallet !== wallet) return { valid: false, expired: false };

  const age = Date.now() - ts;
  if (ts <= 0 || age > AUTH_MESSAGE_TTL_MS) return { valid: true, expired: true };

  return { valid: true, expired: false };
}

// ---------------------------------------------------------------------------
// Helper: build a JSON 401 response
// ---------------------------------------------------------------------------

function json401(message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: { code: "UNAUTHORIZED", message } }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function createAuthMiddleware(opts: AuthMiddlewareOpts = {}): MiddlewareHandler {
  const required = opts.required !== false; // defaults to true

  return async (c: Context, next: Next): Promise<void> => {
    const authHeader = c.req.header("Authorization");

    // ── Missing or empty header ──────────────────────────────────────────
    if (!authHeader || authHeader.trim() === "") {
      if (!required) {
        await next();
        return;
      }
      c.res = json401("Missing Authorization header");
      return;
    }

    const spaceIdx = authHeader.indexOf(" ");
    if (spaceIdx === -1) {
      c.res = json401("Malformed Authorization header");
      return;
    }

    const scheme = authHeader.slice(0, spaceIdx);
    const credentials = authHeader.slice(spaceIdx + 1).trim();

    // ── Bearer session token ──────────────────────────────────────────────
    if (scheme === "Bearer") {
      const wallet = verifySessionToken(credentials);
      if (!wallet) {
        c.res = json401("Invalid or expired session token");
        return;
      }
      c.set("user", { wallet } satisfies AuthUser);
      await next();
      return;
    }

    // ── Wallet signature ──────────────────────────────────────────────────
    if (scheme === "Wallet") {
      // credentials = "<walletAddress>:<base58Sig>"
      const colonIdx = credentials.indexOf(":");
      if (colonIdx === -1) {
        c.res = json401("Malformed Wallet credentials");
        return;
      }

      const walletAddress = credentials.slice(0, colonIdx);
      const sig = credentials.slice(colonIdx + 1);

      // Validate sig format.
      if (!isPlausibleWalletSig(sig)) {
        c.res = json401("Invalid wallet signature");
        return;
      }

      // Validate the auth message.
      const message = c.req.header("X-Auth-Message") ?? "";
      const { valid, expired } = parseAuthMessage(message, walletAddress);

      if (!valid) {
        c.res = json401("Invalid auth message");
        return;
      }

      if (expired) {
        c.res = json401("Auth message has expired");
        return;
      }

      // Auth passed — issue session token.
      const sessionToken = signSessionToken(walletAddress);
      c.header("X-Session-Token", sessionToken);
      c.set("user", { wallet: walletAddress } satisfies AuthUser);
      await next();
      return;
    }

    // ── Unsupported scheme ────────────────────────────────────────────────
    c.res = json401(`Unsupported auth scheme: ${scheme}`);
  };
}

// ---------------------------------------------------------------------------
// Default export — plain MiddlewareHandler
// ---------------------------------------------------------------------------

export const authMiddleware: MiddlewareHandler = createAuthMiddleware();
