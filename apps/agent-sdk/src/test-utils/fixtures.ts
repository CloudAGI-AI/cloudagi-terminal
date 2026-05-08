/**
 * Shared test fixtures and mock builders for the agent-sdk test suite.
 *
 * Import from this module in any test file to avoid fixture duplication.
 */

import type {
  Agent,
  AgentHandler,
  AgentId,
  InvocationContext,
  InvocationOutput,
  ReceiptHandle,
  TokenPricing,
} from "../types.js";

// ---------------------------------------------------------------------------
// Pricing fixtures
// ---------------------------------------------------------------------------

export const FREE_PRICING: TokenPricing = {
  perMTokensIn: 0,
  perMTokensOut: 0,
};

export const STANDARD_PRICING: TokenPricing = {
  perMTokensIn: 1000,
  perMTokensOut: 2000,
};

export const PREMIUM_PRICING: TokenPricing = {
  perMTokensIn: 5000,
  perMTokensOut: 10_000,
};

// ---------------------------------------------------------------------------
// Wallet fixtures
// ---------------------------------------------------------------------------

/** A deterministic fake 64-byte wallet keypair for testing. */
export const FAKE_WALLET: Uint8Array = new Uint8Array(64).fill(0xab);

/** A second distinct keypair for multi-party tests. */
export const FAKE_WALLET_B: Uint8Array = new Uint8Array(64).fill(0xcd);

// ---------------------------------------------------------------------------
// Agent fixtures
// ---------------------------------------------------------------------------

export const STUB_AGENT_SUMMARISER: Agent = {
  agentId: "agent_e2e_0001" as AgentId,
  name: "E2E Summariser",
  skills: ["summarisation"],
  pricing: STANDARD_PRICING,
  endpoint: "https://summariser.example.com/invoke",
  registeredAt: "2025-01-01T00:00:00.000Z",
};

export const STUB_AGENT_REVIEWER: Agent = {
  agentId: "agent_e2e_0002" as AgentId,
  name: "E2E Code Reviewer",
  skills: ["code-review", "summarisation"],
  pricing: PREMIUM_PRICING,
  endpoint: "https://reviewer.example.com/invoke",
  registeredAt: "2025-01-02T00:00:00.000Z",
};

export const ALL_STUB_AGENTS: ReadonlyArray<Agent> = [STUB_AGENT_SUMMARISER, STUB_AGENT_REVIEWER];

// ---------------------------------------------------------------------------
// InvocationContext builder
// ---------------------------------------------------------------------------

export function makeInvocationContext(overrides?: Partial<InvocationContext>): InvocationContext {
  return {
    requestHash: "a".repeat(64),
    prompt: "Test prompt for the agent.",
    metadata: {},
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Handler factories
// ---------------------------------------------------------------------------

/**
 * Creates a handler that echoes the prompt back in the output text.
 */
export function makeEchoHandler(): AgentHandler {
  return async (ctx: InvocationContext): Promise<InvocationOutput> => ({
    text: `Echo: ${ctx.prompt}`,
  });
}

/**
 * Creates a handler that always throws with the given message.
 */
export function makeThrowingHandler(message: string): AgentHandler {
  return async (_ctx: InvocationContext): Promise<InvocationOutput> => {
    throw new Error(message);
  };
}

/**
 * Creates a handler that returns a fixed output regardless of input.
 */
export function makeFixedHandler(output: InvocationOutput): AgentHandler {
  return async (_ctx: InvocationContext): Promise<InvocationOutput> => output;
}

/**
 * Creates a handler that records each call context for later inspection.
 */
export function makeCapturingHandler(): {
  handler: AgentHandler;
  calls: InvocationContext[];
} {
  const calls: InvocationContext[] = [];
  const handler: AgentHandler = async (ctx) => {
    calls.push(ctx);
    return { text: `Captured call #${calls.length}` };
  };
  return { handler, calls };
}

// ---------------------------------------------------------------------------
// Receipt handle factory
// ---------------------------------------------------------------------------

/** Create a deterministic fake receipt handle for assertions. */
export function makeFakeReceiptHandle(index = 0): ReceiptHandle {
  return `rcpt_test_${String(index).padStart(8, "0")}` as ReceiptHandle;
}

// ---------------------------------------------------------------------------
// Registration options builder
// ---------------------------------------------------------------------------

export function makeRegisterOpts(overrides?: {
  name?: string;
  skills?: string[];
  pricing?: TokenPricing;
  endpoint?: string;
  walletKeypair?: Uint8Array;
}) {
  return {
    name: overrides?.name ?? "Test Agent",
    skills: overrides?.skills ?? ["summarisation"],
    pricing: overrides?.pricing ?? STANDARD_PRICING,
    endpoint: overrides?.endpoint ?? "https://test-agent.example.com/invoke",
    walletKeypair: overrides?.walletKeypair ?? FAKE_WALLET,
  };
}
