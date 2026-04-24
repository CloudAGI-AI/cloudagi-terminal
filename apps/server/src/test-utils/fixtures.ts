/**
 * Shared test fixtures used across multiple test files.
 * All values are realistic enough to be useful documentation.
 */

import type { Agent, CreateAgent } from "../schemas/agent.js";

// ---------------------------------------------------------------------------
// Agent fixtures
// ---------------------------------------------------------------------------

export const validCreateAgent: CreateAgent = {
  provider: "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk",
  endpoint: "https://agent.example.com/invoke",
  skills: ["summarize", "classify"],
  pricing: {
    perMTokensIn: 0.50,
    perMTokensOut: 1.50,
  },
  stake: 1_000_000_000, // 1 SOL in lamports
};

export const validAgent: Agent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  reputation: 0.85,
  ...validCreateAgent,
};

export const secondAgent: Agent = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  provider: "7xAB2CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB2Yk",
  endpoint: "https://agent2.example.com/invoke",
  skills: ["code-review", "refactor"],
  pricing: {
    perMTokensIn: 1.00,
    perMTokensOut: 2.00,
  },
  reputation: 0.60,
  stake: 500_000_000,
};

// ---------------------------------------------------------------------------
// Invalid agent body variants (for validation rejection tests)
// ---------------------------------------------------------------------------

/** Missing required `skills` field */
export const agentMissingSkills = {
  provider: "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk",
  endpoint: "https://agent.example.com/invoke",
  pricing: { perMTokensIn: 0.50, perMTokensOut: 1.50 },
  stake: 1_000_000_000,
};

/** Empty skills array (violates min(1)) */
export const agentEmptySkills = {
  ...validCreateAgent,
  skills: [],
};

/** Invalid URL in endpoint */
export const agentInvalidEndpoint = {
  ...validCreateAgent,
  endpoint: "not-a-url",
};

/** Reputation out of range — also included in create payload which should be rejected */
export const agentInvalidReputation = {
  ...validAgent,
  reputation: 1.5,
};

/** Negative pricing */
export const agentNegativePricing = {
  ...validCreateAgent,
  pricing: { perMTokensIn: -1, perMTokensOut: 1.50 },
};

/** Missing provider */
export const agentMissingProvider = {
  endpoint: "https://agent.example.com/invoke",
  skills: ["summarize"],
  pricing: { perMTokensIn: 0.50, perMTokensOut: 1.50 },
  stake: 1_000_000_000,
};

// ---------------------------------------------------------------------------
// Payment / x402 fixtures
// ---------------------------------------------------------------------------

/** A mock valid payment authorization header value */
export const mockPaymentAuthHeader =
  "x402 eyJzY2hlbWUiOiJ4NDAyL3NvbGFuYSIsInNpZ25hdHVyZSI6Im1vY2tfc2lnbmF0dXJlXzEyMyIsIm5vbmNlIjoibm9uY2UtMTc0MDAwMDAwMDAwMCIsInBheWVyIjoiOXhEUjdDZUhaaUR2M1Bpdg==";

/** A replayed (stale) nonce — same as would be rejected by replay protection */
export const replayedNonce = "nonce-0000000000000";

// ---------------------------------------------------------------------------
// Receipt fixtures
// ---------------------------------------------------------------------------

export const mockReceipt = {
  id: "rcpt_01J000000000000000000000",
  agentId: "550e8400-e29b-41d4-a716-446655440000",
  buyerWallet: "Buyer111111111111111111111111111111111111111",
  sellerWallet: "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk",
  promptHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  outputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  tokensIn: 512,
  tokensOut: 256,
  flagsBitmap: 0,
  settlementAmount: "250000",
  settlementSig: "mock_facilitator_sig_abc123",
  mintedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
};
