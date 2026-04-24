/**
 * Integration: @cloudagi/shared schema serialize/deserialize across package boundary
 *
 * Verifies that every Zod schema in @cloudagi/shared correctly parses valid
 * payloads, rejects invalid ones, and that TypeScript types inferred from the
 * schemas are structurally consistent with the SPEC §5 data model.
 *
 * These tests exercise the real schema code (no mocks), making them green as
 * soon as @cloudagi/shared is built. They are the lowest-friction Wave-1 tests.
 *
 * SPEC refs: §5 Data Model, §6.1 Architecture (packages/shared)
 */

import { describe, it, expect } from "vitest";

// @ts-expect-error — module not yet built; intentional red-phase import
import {
  AgentSchema,
  AgentModelSchema,
  AgentPolicySchema,
  PricingModelSchema,
  SessionSchema,
  InvocationSchema,
  InvocationFlagsSchema,
  InvocationParamsSchema,
  ToolCallSchema,
  ReceiptSchema,
  StakeEventSchema,
  ReputationSchema,
  IntentApprovalSchema,
  IntentScopeSchema,
  SkillTagStringSchema,
  parseSkillTag,
  serializeSkillTag,
  KNOWN_SKILL_TAGS,
  PLATFORM_FEE_BPS,
  PROVIDER_FEE_BPS,
  FACILITATOR_FEE_BPS,
  TOTAL_FEE_BPS,
  BPS_DENOMINATOR,
  MIN_STAKE_LAMPORTS,
  DEFAULT_DISPUTE_WINDOW_MS,
  FLAGS_BITMAP_MAX,
} from "@cloudagi/shared";

// ---------------------------------------------------------------------------
// Fixtures — minimal valid payloads per SPEC §5
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
const HASH64 = "a".repeat(64);
const BASE58_88 = "1".repeat(88);

const VALID_AGENT = {
  id: "agent_01JTEST001",
  provider: "ProviderWallet111111111111111111111111",
  displayName: "Sentiment Classifier",
  description: "Classifies sentiment from text.",
  skills: ["sentiment.classify.v1"],
  pricing: { kind: "per_token", perMTokensIn: 500, perMTokensOut: 1000 },
  model: { kind: "hosted", family: "gpt-4o-mini", contextWindow: 128000, maxOutputTokens: 4096 },
  endpoint: "https://sentiment.example.com/invoke",
  policies: {
    maxPromptTokens: 4096,
    maxOutputTokens: 1024,
    allowedTools: [],
    allowedSkills: ["sentiment.classify.v1"],
    refuseIfFlags: ["injection"],
  },
  status: "active",
  stake: 25_000_000,
  reputation: 72,
  uptimePct: 99.1,
  avgLatencyMs: 420,
  lastHeartbeatAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const VALID_SESSION = {
  id: "01JTEST_SESSION_001",
  buyerWallet: "BuyerWallet1111111111111111111111111111",
  agentId: "agent_01JTEST001",
  state: "open",
  intentMode: "per_invocation",
  budgetAuthorized: "1000000",
  budgetSpent: "0",
  budgetAuthorizationSig: "sig_abc123",
  openedAt: NOW,
};

const VALID_INVOCATION = {
  id: "01JTEST_INVOKE_001",
  sessionId: "01JTEST_SESSION_001",
  agentId: "agent_01JTEST001",
  buyerWallet: "BuyerWallet1111111111111111111111111111",
  prompt: "Classify sentiment: I love this!",
  promptHash: HASH64,
  params: { temperature: 0.2, maxOutputTokens: 512 },
  declaredIntent: "Classify the sentiment of the provided text using sentiment.classify.v1.",
  intentApprovalSig: "sig_buyer_intent_abc",
  intentApprovalExpiresAt: FUTURE,
  startedAt: NOW,
  status: "completed",
  output: "POSITIVE",
  outputHash: HASH64,
  tokensIn: 20,
  tokensOut: 5,
  toolCalls: [],
  flags: { promptInjectionScore: 0.02, unsafeOutputScore: 0.0, piiDetected: false },
  settlementAmount: "250000",
  settlementSig: "sig_facilitator_xyz",
  receiptId: "01JTEST_RECEIPT_001",
};

const VALID_RECEIPT = {
  id: "01JTEST_RECEIPT_001",
  invocationId: "01JTEST_INVOKE_001",
  buyerWallet: "BuyerWallet1111111111111111111111111111",
  sellerWallet: "SellerWallet111111111111111111111111111",
  promptHash: HASH64,
  outputHash: HASH64,
  tokensIn: 20,
  tokensOut: 5,
  costLamports: 250000,
  cNftAssetId: "cNftAssetId1111111111111111111111111",
  txSignature: BASE58_88,
  verifyUrl: "https://cloudagi.io/receipts/01JTEST_RECEIPT_001",
  disputeDeadline: FUTURE,
  status: "minted",
  timestamp: NOW,
};

const VALID_INTENT_APPROVAL = {
  id: "01JTEST_APPROVAL_001",
  sessionId: "01JTEST_SESSION_001",
  invocationId: "01JTEST_INVOKE_001",
  scope: "per_invocation",
  intentText: "Classify the sentiment using sentiment.classify.v1 without tool calls.",
  boundSkills: ["sentiment.classify.v1"],
  boundTools: [],
  maxTokensIn: 4096,
  maxTokensOut: 1024,
  maxSpend: "500000",
  nonce: "nonce_01JTEST001",
  approvalSig: "sig_buyer_approval_abc123",
  scopeConstraints: { maxSpendLamports: 500000, allowedTools: [], maxDurationMs: 30000 },
  approvedAt: NOW,
  expiresAt: FUTURE,
};

// ---------------------------------------------------------------------------
// Suite 1 — Agent schema roundtrip
// ---------------------------------------------------------------------------

describe("AgentSchema roundtrip", () => {
  it("parses a valid Agent record", () => {
    const result = AgentSchema.safeParse(VALID_AGENT);
    expect(result.success).toBe(true);
  });

  it("parsed Agent has all required fields from SPEC §5.1", () => {
    const agent = AgentSchema.parse(VALID_AGENT);
    expect(agent.id).toBe(VALID_AGENT.id);
    expect(agent.provider).toBe(VALID_AGENT.provider);
    expect(agent.skills).toContain("sentiment.classify.v1");
    expect(agent.status).toBe("active");
  });

  it("rejects Agent with empty id", () => {
    expect(AgentSchema.safeParse({ ...VALID_AGENT, id: "" }).success).toBe(false);
  });

  it("rejects Agent with invalid status enum", () => {
    expect(AgentSchema.safeParse({ ...VALID_AGENT, status: "unknown_status" }).success).toBe(false);
  });

  it("rejects Agent with invalid endpoint URL", () => {
    expect(AgentSchema.safeParse({ ...VALID_AGENT, endpoint: "not-a-url" }).success).toBe(false);
  });

  it("rejects Agent with reputation > 100", () => {
    expect(AgentSchema.safeParse({ ...VALID_AGENT, reputation: 101 }).success).toBe(false);
  });

  it("accepts per_call pricing model", () => {
    const agent = { ...VALID_AGENT, pricing: { kind: "per_call", flatCallPrice: 50000 } };
    expect(AgentSchema.safeParse(agent).success).toBe(true);
  });

  it("rejects per_call pricing with missing flatCallPrice", () => {
    const agent = { ...VALID_AGENT, pricing: { kind: "per_call" } };
    expect(AgentSchema.safeParse(agent).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Session schema roundtrip
// ---------------------------------------------------------------------------

describe("SessionSchema roundtrip", () => {
  it("parses a valid Session record", () => {
    expect(SessionSchema.safeParse(VALID_SESSION).success).toBe(true);
  });

  it("rejects Session with invalid state enum", () => {
    expect(SessionSchema.safeParse({ ...VALID_SESSION, state: "unknown" }).success).toBe(false);
  });

  it("rejects Session with invalid intentMode enum", () => {
    expect(SessionSchema.safeParse({ ...VALID_SESSION, intentMode: "never" }).success).toBe(false);
  });

  it("accepts Session with closedAt present when state is closed", () => {
    const closed = { ...VALID_SESSION, state: "closed", closedAt: NOW };
    expect(SessionSchema.safeParse(closed).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Invocation schema roundtrip
// ---------------------------------------------------------------------------

describe("InvocationSchema roundtrip", () => {
  it("parses a valid completed Invocation", () => {
    expect(InvocationSchema.safeParse(VALID_INVOCATION).success).toBe(true);
  });

  it("accepts all valid status enum values", () => {
    const statuses = ["pending_intent", "running", "completed", "partial", "failed", "refunded"];
    for (const status of statuses) {
      expect(InvocationSchema.safeParse({ ...VALID_INVOCATION, status }).success).toBe(true);
    }
  });

  it("rejects Invocation with promptHash that is not 64 chars", () => {
    expect(InvocationSchema.safeParse({ ...VALID_INVOCATION, promptHash: "short" }).success).toBe(false);
  });

  it("rejects Invocation with temperature outside [0, 2]", () => {
    const inv = { ...VALID_INVOCATION, params: { temperature: 3.0, maxOutputTokens: 512 } };
    expect(InvocationSchema.safeParse(inv).success).toBe(false);
  });

  it("rejects Invocation with negative tokensIn", () => {
    expect(InvocationSchema.safeParse({ ...VALID_INVOCATION, tokensIn: -1 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Receipt schema roundtrip
// ---------------------------------------------------------------------------

describe("ReceiptSchema roundtrip", () => {
  it("parses a valid minted Receipt", () => {
    expect(ReceiptSchema.safeParse(VALID_RECEIPT).success).toBe(true);
  });

  it("accepts all status enum values", () => {
    for (const status of ["minted", "disputed", "refunded"]) {
      expect(ReceiptSchema.safeParse({ ...VALID_RECEIPT, status }).success).toBe(true);
    }
  });

  it("rejects Receipt with invalid verifyUrl", () => {
    expect(ReceiptSchema.safeParse({ ...VALID_RECEIPT, verifyUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects Receipt with costLamports < 0", () => {
    expect(ReceiptSchema.safeParse({ ...VALID_RECEIPT, costLamports: -1 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — IntentApproval schema roundtrip
// ---------------------------------------------------------------------------

describe("IntentApprovalSchema roundtrip", () => {
  it("parses a valid per_invocation IntentApproval", () => {
    expect(IntentApprovalSchema.safeParse(VALID_INTENT_APPROVAL).success).toBe(true);
  });

  it("accepts per_session scope without invocationId", () => {
    const { invocationId: _, ...rest } = VALID_INTENT_APPROVAL;
    const sessionScoped = { ...rest, scope: "per_session" };
    expect(IntentApprovalSchema.safeParse(sessionScoped).success).toBe(true);
  });

  it("rejects IntentApproval with maxTokensIn <= 0", () => {
    expect(IntentApprovalSchema.safeParse({ ...VALID_INTENT_APPROVAL, maxTokensIn: 0 }).success).toBe(false);
  });

  it("rejects IntentApproval with empty intentText", () => {
    expect(IntentApprovalSchema.safeParse({ ...VALID_INTENT_APPROVAL, intentText: "" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Skill tag parse/serialize roundtrip
// ---------------------------------------------------------------------------

describe("SkillTag parse/serialize roundtrip", () => {
  it("parses known skill tags without throwing", () => {
    for (const tag of KNOWN_SKILL_TAGS) {
      expect(() => parseSkillTag(tag as string)).not.toThrow();
    }
  });

  it("parseSkillTag returns { domain, action, version } object", () => {
    const parsed = parseSkillTag("sentiment.classify.v1");
    expect(parsed).toEqual({ domain: "sentiment", action: "classify", version: "v1" });
  });

  it("serializeSkillTag is inverse of parseSkillTag", () => {
    const original = "extract.entities.v1";
    const parsed = parseSkillTag(original);
    expect(serializeSkillTag(parsed)).toBe(original);
  });

  it("SkillTagStringSchema rejects tag without version", () => {
    expect(SkillTagStringSchema.safeParse("sentiment.classify").success).toBe(false);
  });

  it("SkillTagStringSchema rejects tag with uppercase", () => {
    expect(SkillTagStringSchema.safeParse("Sentiment.Classify.v1").success).toBe(false);
  });

  it("SkillTagStringSchema rejects version not matching vN pattern", () => {
    expect(SkillTagStringSchema.safeParse("sentiment.classify.version1").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — Platform constants are internally consistent
// ---------------------------------------------------------------------------

describe("Platform constants", () => {
  it("fee BPS values sum to BPS_DENOMINATOR (10000)", () => {
    expect(PLATFORM_FEE_BPS + PROVIDER_FEE_BPS + FACILITATOR_FEE_BPS).toBe(TOTAL_FEE_BPS);
    expect(TOTAL_FEE_BPS).toBe(BPS_DENOMINATOR);
  });

  it("PROVIDER_FEE_BPS is 8000 (80%) per SPEC §8.5", () => {
    expect(PROVIDER_FEE_BPS).toBe(8000);
  });

  it("PLATFORM_FEE_BPS is 1500 (15%) per SPEC §8.5", () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
  });

  it("FACILITATOR_FEE_BPS is 500 (5%) per SPEC §8.5", () => {
    expect(FACILITATOR_FEE_BPS).toBe(500);
  });

  it("MIN_STAKE_LAMPORTS is 25_000_000 (25 USDC) per SPEC §11.2", () => {
    expect(MIN_STAKE_LAMPORTS).toBe(25_000_000);
  });

  it("DEFAULT_DISPUTE_WINDOW_MS is 72 hours per SPEC §4.3", () => {
    expect(DEFAULT_DISPUTE_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
  });

  it("FLAGS_BITMAP_MAX is 0xff (8 flag bits) per SPEC §9.3", () => {
    expect(FLAGS_BITMAP_MAX).toBe(0xff);
  });
});
