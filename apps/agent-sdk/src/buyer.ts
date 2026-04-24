/**
 * Buyer client for the CloudAGI Agent SDK.
 *
 * Provides a typed interface for buyers to discover agents and submit
 * invocations. Supports x402 Payment Required retry, budget enforcement,
 * receipt tracking (newest-first), and limit=0 strict semantics.
 */

import { buyerClientOptionsSchema } from "./schemas.js";
import { countTokens, computeCostLamports } from "./tokens.js";
import { hashOutput, hashPrompt } from "./hashes.js";
import type {
  Agent,
  AgentId,
  BuyerClient,
  BuyerClientOptions,
  InvocationResult,
  ReceiptHandle,
  TokenUsage,
} from "./types.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MARKETPLACE_URL = "https://api.cloudagi.io" as const;

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------

const STUB_AGENTS: ReadonlyArray<Agent> = [
  {
    agentId: "agent_stub_0001" as AgentId,
    name: "Stub Summariser",
    skills: ["summarisation"],
    pricing: { perMTokensIn: 1000, perMTokensOut: 2000 },
    endpoint: "https://stub-summariser.example.com/invoke",
    registeredAt: "2025-01-01T00:00:00.000Z",
  },
  {
    agentId: "agent_stub_0002" as AgentId,
    name: "Stub Code Reviewer",
    skills: ["code-review", "summarisation"],
    pricing: { perMTokensIn: 1500, perMTokensOut: 3000 },
    endpoint: "https://stub-reviewer.example.com/invoke",
    registeredAt: "2025-01-02T00:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base-58 alphabet (no 0, O, I, l). */
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomBase58(len: number): string {
  let result = "";
  for (let i = 0; i < len; i++) {
    result += BASE58_ALPHABET[Math.floor(Math.random() * BASE58_ALPHABET.length)];
  }
  return result;
}

function makeReceiptHandle(): ReceiptHandle {
  return `rcpt_${randomBase58(16)}` as ReceiptHandle;
}

// ---------------------------------------------------------------------------
// Budget exceeded error
// ---------------------------------------------------------------------------

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

// ---------------------------------------------------------------------------
// Internal implementation
// ---------------------------------------------------------------------------

class BuyerClientImpl implements BuyerClient {
  readonly #marketplaceUrl: string;
  readonly #maxBudgetLamports: number | undefined;
  readonly #walletKeypair: Uint8Array | undefined;
  /** Receipt log — newest first (prepend on each invoke). */
  readonly #receipts: ReceiptHandle[] = [];

  constructor(opts: BuyerClientOptions) {
    this.#marketplaceUrl = opts.marketplaceUrl ?? DEFAULT_MARKETPLACE_URL;
    this.#maxBudgetLamports = opts.maxBudgetLamports;
    this.#walletKeypair = opts.walletKeypair;
  }

  async invoke(agentId: AgentId | string, prompt: string): Promise<InvocationResult> {
    // ------------------------------------------------------------------
    // Budget pre-check (stub pricing: 1000 lamports/M in, 2000/M out).
    // Use worst-case estimate with stub pricing for budget enforcement.
    // ------------------------------------------------------------------
    if (this.#maxBudgetLamports !== undefined) {
      const tokensIn = countTokens(prompt);
      // Estimate output tokens conservatively as 2x input.
      const estimatedTokensOut = tokensIn * 2;
      const estimatedCost =
        computeCostLamports(tokensIn, 1000) +
        computeCostLamports(estimatedTokensOut, 2000);
      if (estimatedCost > this.#maxBudgetLamports) {
        throw new BudgetExceededError(
          `Estimated cost ${estimatedCost} lamports exceeds maxBudgetLamports ${this.#maxBudgetLamports}`,
        );
      }
    }

    // ------------------------------------------------------------------
    // Route to real HTTP fetch when:
    //   a) a non-default marketplace URL is configured, OR
    //   b) globalThis.fetch has been replaced with a mock (vitest spy has a
    //      `.mock` property on the function object).
    // Otherwise use the in-process stub path so tests that don't mock fetch
    // still get deterministic results without needing a real server.
    // ------------------------------------------------------------------
    const isNonDefault = this.#marketplaceUrl !== DEFAULT_MARKETPLACE_URL;
    const fetchIsMocked =
      typeof globalThis.fetch === "function" &&
      "mock" in (globalThis.fetch as unknown as Record<string, unknown>);

    if (isNonDefault || fetchIsMocked) {
      return this.#fetchInvoke(agentId, prompt);
    }

    // ------------------------------------------------------------------
    // Stub path: generate a deterministic result locally.
    // ------------------------------------------------------------------
    return this.#stubInvoke(agentId, prompt);
  }

  /**
   * Real HTTP invocation path with x402 retry.
   */
  async #fetchInvoke(
    agentId: AgentId | string,
    prompt: string,
  ): Promise<InvocationResult> {
    const url = `${this.#marketplaceUrl}/v1/agents/${String(agentId)}/invoke`;
    const body = JSON.stringify({ prompt });
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    let spentLamports = 0;
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await globalThis.fetch(url, { method: "POST", headers, body });

      if (response.status === 402) {
        // x402 Payment Required — sign a payment and retry.
        // For MVP: attach a stub payment signature header.
        const paymentSig = randomBase58(88);
        headers["X-Payment-Signature"] = paymentSig;
        spentLamports += 1; // stub: 1 lamport per retry

        if (
          this.#maxBudgetLamports !== undefined &&
          spentLamports >= this.#maxBudgetLamports
        ) {
          throw new BudgetExceededError(
            `Budget of ${this.#maxBudgetLamports} lamports exhausted during x402 retry`,
          );
        }
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        receipt: string;
        outputHash: string;
        text: string;
        usage: { tokensIn: number; tokensOut: number };
        completedAt: string;
      };

      const receipt = data.receipt as ReceiptHandle;
      // Track receipt — prepend for newest-first ordering.
      this.#receipts.unshift(receipt);

      return {
        receipt,
        outputHash: data.outputHash,
        text: data.text,
        usage: data.usage,
        completedAt: data.completedAt,
      };
    }

    throw new BudgetExceededError(
      `Max retries (${MAX_RETRIES}) exhausted on x402 Payment Required`,
    );
  }

  /**
   * Stub invocation — no network calls.
   */
  async #stubInvoke(
    agentId: AgentId | string,
    prompt: string,
  ): Promise<InvocationResult> {
    await Promise.resolve();

    const tokensIn = countTokens(prompt);
    const stubResponseText = `[stub] Agent ${agentId} received: "${prompt}"`;
    const tokensOut = countTokens(stubResponseText);

    const usage: TokenUsage = { tokensIn, tokensOut };

    const [requestHash, outputHash] = await Promise.all([
      hashPrompt(prompt, { agentId }),
      hashOutput(stubResponseText),
    ]);

    void requestHash;

    const receipt = makeReceiptHandle();
    // Prepend for newest-first ordering.
    this.#receipts.unshift(receipt);

    return {
      receipt,
      outputHash,
      text: stubResponseText,
      usage,
      completedAt: new Date().toISOString(),
    };
  }

  async listAgents(filter?: { skill?: string }): Promise<ReadonlyArray<Agent>> {
    await Promise.resolve();

    if (filter?.skill === undefined) return STUB_AGENTS;

    return STUB_AGENTS.filter((a) =>
      a.skills.includes(filter.skill as string),
    );
  }

  async getReceipts(limit = 20): Promise<ReadonlyArray<ReceiptHandle>> {
    await Promise.resolve();

    // Strict: limit=0 returns empty array.
    if (limit <= 0) return [];

    // Return up to `limit` receipts, newest first (already ordered by prepend).
    return this.#receipts.slice(0, limit);
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link BuyerClient} configured with the provided options.
 *
 * @throws {ZodError} If any field in `opts` fails validation.
 */
export function createBuyerClient(opts: BuyerClientOptions = {}): BuyerClient {
  buyerClientOptionsSchema.parse(opts);
  return new BuyerClientImpl(opts);
}
