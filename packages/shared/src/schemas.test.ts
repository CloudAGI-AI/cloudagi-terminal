import { describe, expect, it } from "vitest";
import {
  AgentSchema,
  IntentApprovalSchema,
  InvocationSchema,
  ReceiptSchema,
  ReputationSchema,
  SessionSchema,
  StakeEventSchema,
} from "./schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();

const validAgent = {
  id: "AgentPDA1234",
  provider: "ProviderWallet5678",
  displayName: "SentimentBot",
  description: "Classifies sentiment with high accuracy.",
  skills: ["sentiment.classify.v1"],
  pricing: {
    kind: "per_token" as const,
    perMTokensIn: 500,
    perMTokensOut: 1500,
  },
  model: {
    kind: "hosted" as const,
    family: "gpt-4o-mini",
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  endpoint: "https://my-agent.example.com/invoke",
  policies: {
    maxPromptTokens: 4096,
    maxOutputTokens: 1024,
    allowedTools: [],
    allowedSkills: ["sentiment.classify.v1"],
    refuseIfFlags: ["injection" as const],
  },
  status: "active" as const,
  stake: 25_000_000,
  reputation: 87.5,
  uptimePct: 99.2,
  avgLatencyMs: 320,
  lastHeartbeatAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const validSession = {
  id: "01HZ123SESSION",
  buyerWallet: "BuyerWallet9999",
  agentId: "AgentPDA1234",
  state: "open" as const,
  intentMode: "per_invocation" as const,
  budgetAuthorized: "5000000",
  budgetSpent: "0",
  budgetAuthorizationSig: "abcdef1234567890abcdef1234567890",
  openedAt: NOW,
};

const validInvocation = {
  id: "01HZ123INVOC",
  sessionId: "01HZ123SESSION",
  agentId: "AgentPDA1234",
  buyerWallet: "BuyerWallet9999",
  prompt: "Classify: I love this product!",
  promptHash: "a".repeat(64),
  params: { temperature: 0.2, maxOutputTokens: 512 },
  declaredIntent: "Classify sentiment of the provided text.",
  intentApprovalSig: "sig1234",
  intentApprovalExpiresAt: NOW,
  startedAt: NOW,
  status: "completed" as const,
  outputHash: "b".repeat(64),
  tokensIn: 20,
  tokensOut: 10,
  toolCalls: [],
  flags: { promptInjectionScore: 0.01, unsafeOutputScore: 0.0, piiDetected: false },
  settlementAmount: "15000",
  settlementSig: "settleSig",
  receiptId: "01HZ123RECEIPT",
};

const validReceipt = {
  id: "01HZ123RECEIPT",
  invocationId: "01HZ123INVOC",
  buyerWallet: "BuyerWallet9999",
  sellerWallet: "ProviderWallet5678",
  promptHash: "a".repeat(64),
  outputHash: "b".repeat(64),
  tokensIn: 20,
  tokensOut: 10,
  costLamports: 15000,
  cNftAssetId: "cNftAsset111",
  txSignature: "txSig999",
  verifyUrl: "https://cloudagi.com/receipts/01HZ123RECEIPT",
  disputeDeadline: NOW,
  status: "minted" as const,
  timestamp: NOW,
};

const validStakeEvent = {
  id: "StakeEvent001",
  agentId: "AgentPDA1234",
  providerWallet: "ProviderWallet5678",
  kind: "stake" as const,
  amountLamports: 25_000_000,
  txSignature: "stakeTx001",
  timestamp: NOW,
};

const validReputation = {
  agentId: "AgentPDA1234",
  providerWallet: "ProviderWallet5678",
  tier: 3 as const,
  weightedScore: 87.5,
  totalCalls: 1200,
  disputes: 2,
  uptime: 99.2,
  counts: {
    accepted: 1200,
    completed: 1185,
    partial: 10,
    failed: 5,
    disputedBuyerWon: 1,
    disputedSellerWon: 1,
  },
  ratings: { thumbsUp: 1100, thumbsDown: 50 },
  timing: { p50LatencyMs: 320, p95LatencyMs: 950 },
  totalEarnings: "18750000",
  committedRoot: "merkle1234",
  windowStart: NOW,
  windowEnd: NOW,
  lastUpdated: NOW,
};

const validIntentApproval = {
  id: "01HZ123INTENT",
  sessionId: "01HZ123SESSION",
  scope: "per_invocation" as const,
  intentText: "Classify sentiment of the provided text.",
  boundSkills: ["sentiment.classify.v1"],
  boundTools: [],
  maxTokensIn: 512,
  maxTokensOut: 256,
  maxSpend: "15000",
  nonce: "nonce-abc-123",
  approvalSig: "buyerSig999",
  scopeConstraints: {
    maxSpendLamports: 15000,
    allowedTools: [],
    maxDurationMs: 30000,
  },
  approvedAt: NOW,
  expiresAt: NOW,
};

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

describe("AgentSchema", () => {
  it("parses a valid agent", () => {
    const result = AgentSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
  });

  it("accepts per_call pricing", () => {
    const agent = {
      ...validAgent,
      pricing: { kind: "per_call" as const, flatCallPrice: 5000 },
    };
    expect(AgentSchema.safeParse(agent).success).toBe(true);
  });

  it("rejects missing displayName", () => {
    const { displayName: _, ...bad } = validAgent;
    const result = AgentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid endpoint URL", () => {
    const bad = { ...validAgent, endpoint: "not-a-url" };
    expect(AgentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative stake", () => {
    const bad = { ...validAgent, stake: -1 };
    expect(AgentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects reputation above 100", () => {
    const bad = { ...validAgent, reputation: 101 };
    expect(AgentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown status value", () => {
    const bad = { ...validAgent, status: "unknown" };
    expect(AgentSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

describe("SessionSchema", () => {
  it("parses a valid session", () => {
    expect(SessionSchema.safeParse(validSession).success).toBe(true);
  });

  it("accepts optional closedAt", () => {
    const s = { ...validSession, closedAt: NOW };
    expect(SessionSchema.safeParse(s).success).toBe(true);
  });

  it("rejects invalid state", () => {
    const bad = { ...validSession, state: "pending" };
    expect(SessionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing buyerWallet", () => {
    const { buyerWallet: _, ...bad } = validSession;
    expect(SessionSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invocation
// ---------------------------------------------------------------------------

describe("InvocationSchema", () => {
  it("parses a valid invocation", () => {
    expect(InvocationSchema.safeParse(validInvocation).success).toBe(true);
  });

  it("rejects promptHash that is not 64 chars", () => {
    const bad = { ...validInvocation, promptHash: "abc" };
    expect(InvocationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid status", () => {
    const bad = { ...validInvocation, status: "queued" };
    expect(InvocationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative tokensIn", () => {
    const bad = { ...validInvocation, tokensIn: -1 };
    expect(InvocationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects out-of-range promptInjectionScore", () => {
    const bad = {
      ...validInvocation,
      flags: { ...validInvocation.flags, promptInjectionScore: 1.5 },
    };
    expect(InvocationSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

describe("ReceiptSchema", () => {
  it("parses a valid receipt", () => {
    expect(ReceiptSchema.safeParse(validReceipt).success).toBe(true);
  });

  it("rejects promptHash that is not 64 chars", () => {
    const bad = { ...validReceipt, promptHash: "short" };
    expect(ReceiptSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid verifyUrl", () => {
    const bad = { ...validReceipt, verifyUrl: "not-a-url" };
    expect(ReceiptSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown status", () => {
    const bad = { ...validReceipt, status: "pending" };
    expect(ReceiptSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StakeEvent
// ---------------------------------------------------------------------------

describe("StakeEventSchema", () => {
  it("parses a valid stake event", () => {
    expect(StakeEventSchema.safeParse(validStakeEvent).success).toBe(true);
  });

  it("accepts optional reason", () => {
    const s = { ...validStakeEvent, reason: "fraud detected" };
    expect(StakeEventSchema.safeParse(s).success).toBe(true);
  });

  it("rejects unknown kind", () => {
    const bad = { ...validStakeEvent, kind: "burn" };
    expect(StakeEventSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative amountLamports", () => {
    const bad = { ...validStakeEvent, amountLamports: -100 };
    expect(StakeEventSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

describe("ReputationSchema", () => {
  it("parses a valid reputation record", () => {
    expect(ReputationSchema.safeParse(validReputation).success).toBe(true);
  });

  it("rejects tier outside 0-4", () => {
    const bad = { ...validReputation, tier: 5 };
    expect(ReputationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects weightedScore above 100", () => {
    const bad = { ...validReputation, weightedScore: 101 };
    expect(ReputationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects uptime above 100", () => {
    const bad = { ...validReputation, uptime: 100.1 };
    expect(ReputationSchema.safeParse(bad).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IntentApproval
// ---------------------------------------------------------------------------

describe("IntentApprovalSchema", () => {
  it("parses a valid intent approval", () => {
    expect(IntentApprovalSchema.safeParse(validIntentApproval).success).toBe(true);
  });

  it("accepts per_session scope without invocationId", () => {
    const s = { ...validIntentApproval, scope: "per_session" as const };
    expect(IntentApprovalSchema.safeParse(s).success).toBe(true);
  });

  it("rejects unknown scope value", () => {
    const bad = { ...validIntentApproval, scope: "global" };
    expect(IntentApprovalSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects zero maxTokensIn", () => {
    const bad = { ...validIntentApproval, maxTokensIn: 0 };
    expect(IntentApprovalSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative maxSpendLamports in scopeConstraints", () => {
    const bad = {
      ...validIntentApproval,
      scopeConstraints: { ...validIntentApproval.scopeConstraints, maxSpendLamports: -1 },
    };
    expect(IntentApprovalSchema.safeParse(bad).success).toBe(false);
  });
});
