/**
 * Middleware tests — auth.ts
 *
 * Tests wallet-sig auth, session token issuance, and rejection of bad
 * credentials for the MVP auth middleware.
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";
import { get, post } from "../../test-utils/fetch-helper.js";

// Valid mock Solana Ed25519 wallet signature (base58-encoded, 64 bytes)
const MOCK_WALLET_ADDRESS = "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk";
const MOCK_WALLET_SIG =
  "3BsWqhHxmqd9fFVRSqT3mGCVGHqWxSvmMNtWwKi2Lj9BkeFpXNz4rTU1yVQ8oWmP5cZD2uAb6KnYeR7xHgS4t";
const MOCK_SESSION_MESSAGE = `cloudagi:auth:${MOCK_WALLET_ADDRESS}:${Date.now()}`;

function buildAuthApp() {
  const app = new Hono();
  app.use("/authed/*", authMiddleware);
  app.get("/authed/profile", (c) => c.json({ wallet: "resolved" }));
  app.post("/authed/action", (c) => c.json({ done: true }));
  return app;
}

// ---------------------------------------------------------------------------
// Required-auth baseline
// ---------------------------------------------------------------------------

describe("authMiddleware — required auth behaviour", () => {
  it("should reject requests without credentials by default", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Wallet-signature auth flow
// ---------------------------------------------------------------------------

describe("authMiddleware — wallet-signature authentication", () => {
  it("should return 401 when no Authorization header is provided", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile");
    expect(res.status).toBe(401);
  });

  it("should return 401 when Authorization header is present but empty", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", { Authorization: "" });
    expect(res.status).toBe(401);
  });

  it("should return 401 when scheme is Basic rather than Bearer or Wallet", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: "Basic dXNlcjpwYXNz",
    });
    expect(res.status).toBe(401);
  });

  it("should return 200 when a valid wallet signature is provided", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:${MOCK_WALLET_SIG}`,
      "X-Auth-Message": MOCK_SESSION_MESSAGE,
    });
    expect(res.status).toBe(200);
  });

  it("should return 401 when wallet signature is cryptographically invalid", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:INVALIDSIG`,
      "X-Auth-Message": MOCK_SESSION_MESSAGE,
    });
    expect(res.status).toBe(401);
    const body = res.body as { error?: { code?: string } };
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 when auth message has expired timestamp", async () => {
    const app = buildAuthApp();
    const expiredMessage = `cloudagi:auth:${MOCK_WALLET_ADDRESS}:0`; // ts=0 is ancient
    const res = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:${MOCK_WALLET_SIG}`,
      "X-Auth-Message": expiredMessage,
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Session token issuance
// ---------------------------------------------------------------------------

describe("authMiddleware — session token issuance", () => {
  it("should issue a session token in the response after successful wallet auth", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:${MOCK_WALLET_SIG}`,
      "X-Auth-Message": MOCK_SESSION_MESSAGE,
    });
    expect(res.status).toBe(200);
    // Session token must be returned in X-Session-Token header
    expect(res.headers.get("x-session-token")).toBeTruthy();
  });

  it("should issue a session token with at least 32 characters", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:${MOCK_WALLET_SIG}`,
      "X-Auth-Message": MOCK_SESSION_MESSAGE,
    });
    const token = res.headers.get("x-session-token");
    expect(token?.length).toBeGreaterThanOrEqual(32);
  });

  it("should accept subsequent requests authenticated with the issued session token", async () => {
    const app = buildAuthApp();
    // First: get session token
    const authRes = await get(app, "/authed/profile", {
      Authorization: `Wallet ${MOCK_WALLET_ADDRESS}:${MOCK_WALLET_SIG}`,
      "X-Auth-Message": MOCK_SESSION_MESSAGE,
    });
    const sessionToken = authRes.headers.get("x-session-token") ?? "missing";

    // Second: use session token
    const sessionRes = await get(app, "/authed/profile", {
      Authorization: `Bearer ${sessionToken}`,
    });
    expect(sessionRes.status).toBe(200);
  });

  it("should return 401 when session token has been tampered with", async () => {
    const app = buildAuthApp();
    const res = await get(app, "/authed/profile", {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.TAMPERED.invalidsig",
    });
    expect(res.status).toBe(401);
  });
});
