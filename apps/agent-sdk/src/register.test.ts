/**
 * Tests for register.ts — registerAgent input validation and return shape.
 *
 * Expected status: RED (fails until Wave 2 impl adds on-chain registration).
 * The current stub passes Zod validation and returns a shaped result, so
 * shape-level tests will already pass; the RED tests specifically target
 * behaviors that the stub does NOT yet implement correctly:
 *   - walletKeypair requirement enforcement (stub accepts without it)
 *   - agentId format guarantees beyond "non-empty string"
 *   - txSignature format (base-58, exactly 88 chars) — this one may already pass
 *
 * Tests that ARE expected green are marked with a comment.
 */

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { registerAgent } from "./register.js";
import type { AgentRegistration } from "./types.js";

// ---------------------------------------------------------------------------
// Valid baseline fixture
// ---------------------------------------------------------------------------

const VALID_OPTS = {
  name: "Test Summariser",
  skills: ["summarisation"],
  pricing: { perMTokensIn: 1000, perMTokensOut: 2000 },
  endpoint: "https://agent.example.com/invoke",
  walletKeypair: new Uint8Array(64).fill(1),
} as const;

// ---------------------------------------------------------------------------
// Shape / return value
// ---------------------------------------------------------------------------

describe("registerAgent — return shape", () => {
  it("resolves to an object with agentId and txSignature strings", async () => {
    const reg: AgentRegistration = await registerAgent(VALID_OPTS);
    expect(typeof reg.agentId).toBe("string");
    expect(typeof reg.txSignature).toBe("string");
  });

  it("agentId is non-empty", async () => {
    const reg = await registerAgent(VALID_OPTS);
    expect(reg.agentId.length).toBeGreaterThan(0);
  });

  it("txSignature is 88 characters (base-58 Solana signature)", async () => {
    const reg = await registerAgent(VALID_OPTS);
    // RED: real impl must produce a real 88-char base-58 signature every time.
    // Stub generates 88 chars, so this may pass in stub mode, but we pin it.
    expect(reg.txSignature.length).toBe(88);
  });

  it("txSignature contains only base-58 characters", async () => {
    const reg = await registerAgent(VALID_OPTS);
    // Base-58 alphabet (no 0, O, I, l)
    expect(reg.txSignature).toMatch(
      /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{88}$/,
    );
  });

  it("each call returns a unique agentId (no ID collisions)", async () => {
    const [a, b] = await Promise.all([registerAgent(VALID_OPTS), registerAgent(VALID_OPTS)]);
    // RED: real impl derives PDA deterministically from provider+name; stubs
    // use Math.random() so this passes coincidentally — pin it anyway.
    expect(a.agentId).not.toBe(b.agentId);
  });
});

// ---------------------------------------------------------------------------
// Input validation — missing / empty fields
// ---------------------------------------------------------------------------

describe("registerAgent — rejects invalid input", () => {
  it("throws ZodError when name is empty string", async () => {
    await expect(registerAgent({ ...VALID_OPTS, name: "" })).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when name exceeds 64 characters", async () => {
    await expect(registerAgent({ ...VALID_OPTS, name: "a".repeat(65) })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("throws ZodError when skills array is empty", async () => {
    await expect(registerAgent({ ...VALID_OPTS, skills: [] })).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when a skill is not a kebab-case slug", async () => {
    await expect(registerAgent({ ...VALID_OPTS, skills: ["Bad Skill!"] })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("throws ZodError when endpoint is not a valid URL", async () => {
    await expect(registerAgent({ ...VALID_OPTS, endpoint: "not-a-url" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("throws ZodError when endpoint is empty string", async () => {
    await expect(registerAgent({ ...VALID_OPTS, endpoint: "" })).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when perMTokensIn is negative", async () => {
    await expect(
      registerAgent({
        ...VALID_OPTS,
        pricing: { perMTokensIn: -1, perMTokensOut: 1000 },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when perMTokensOut is negative", async () => {
    await expect(
      registerAgent({
        ...VALID_OPTS,
        pricing: { perMTokensIn: 1000, perMTokensOut: -1 },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when perMTokensIn is a float (not integer lamports)", async () => {
    await expect(
      registerAgent({
        ...VALID_OPTS,
        pricing: { perMTokensIn: 1.5, perMTokensOut: 1000 },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when walletKeypair is too short (< 64 bytes)", async () => {
    await expect(
      registerAgent({ ...VALID_OPTS, walletKeypair: new Uint8Array(32) }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("throws ZodError when walletKeypair is too long (> 64 bytes)", async () => {
    await expect(
      registerAgent({ ...VALID_OPTS, walletKeypair: new Uint8Array(65) }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

// ---------------------------------------------------------------------------
// walletKeypair requirement — RED test
// ---------------------------------------------------------------------------

describe("registerAgent — walletKeypair requirement (RED)", () => {
  it("rejects when walletKeypair is omitted and AGENT_WALLET_KEYPAIR env is unset", async () => {
    // RED: current stub accepts missing keypair; real impl must reject it
    // unless the env var is present. This test expects rejection.
    const originalEnv = process.env["AGENT_WALLET_KEYPAIR"];
    delete process.env["AGENT_WALLET_KEYPAIR"];

    try {
      await expect(
        registerAgent({
          name: "No Keypair Agent",
          skills: ["summarisation"],
          pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
          endpoint: "https://agent.example.com/invoke",
          // walletKeypair intentionally omitted
        }),
      ).rejects.toThrow();
    } finally {
      if (originalEnv !== undefined) {
        process.env["AGENT_WALLET_KEYPAIR"] = originalEnv;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("registerAgent — edge cases", () => {
  it("accepts exactly 64-char name (boundary)", async () => {
    const reg = await registerAgent({
      ...VALID_OPTS,
      name: "a".repeat(64),
    });
    expect(typeof reg.agentId).toBe("string");
  });

  it("accepts multiple skills", async () => {
    const reg = await registerAgent({
      ...VALID_OPTS,
      skills: ["summarisation", "code-review", "translation"],
    });
    expect(typeof reg.agentId).toBe("string");
  });

  it("accepts zero-cost pricing (free agent)", async () => {
    const reg = await registerAgent({
      ...VALID_OPTS,
      pricing: { perMTokensIn: 0, perMTokensOut: 0 },
    });
    expect(typeof reg.agentId).toBe("string");
  });
});
