/**
 * Buyer client stub for the CloudAGI Agent SDK.
 *
 * Provides a typed interface for buyers to discover agents and submit
 * invocations. All methods return stubbed data; the real implementation
 * will make signed HTTP requests to the CloudAGI marketplace API and
 * interact with the Solana program for payment settlement.
 *
 * TODO: Replace stubs with real HTTP client + Solana transaction logic.
 */

import { buyerClientOptionsSchema } from "./schemas.js";
import { countTokens } from "./tokens.js";
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
// Stub data helpers
// ---------------------------------------------------------------------------

function makeStubReceiptHandle(): ReceiptHandle {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "rcpt_";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id as ReceiptHandle;
}

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
// Internal implementation
// ---------------------------------------------------------------------------

class BuyerClientImpl implements BuyerClient {
  readonly #marketplaceUrl: string;
  readonly #maxBudgetLamports: number | undefined;

  constructor(opts: BuyerClientOptions) {
    this.#marketplaceUrl = opts.marketplaceUrl ?? DEFAULT_MARKETPLACE_URL;
    this.#maxBudgetLamports = opts.maxBudgetLamports;
    // opts.walletKeypair stored but not used until real impl lands.
    void this.#marketplaceUrl; // suppress lint — used in real impl
    void this.#maxBudgetLamports;
  }

  /**
   * Invoke a registered agent by ID with a natural-language prompt.
   *
   * TODO: Make a signed HTTP POST to `{marketplaceUrl}/agents/{agentId}/invoke`,
   * await the response, settle payment on-chain, and return the full result.
   */
  async invoke(agentId: AgentId | string, prompt: string): Promise<InvocationResult> {
    // Stub: simulate async work, then return a fabricated result.
    await Promise.resolve();

    const tokensIn = countTokens(prompt);
    const stubResponseText = `[stub] Agent ${agentId} received: "${prompt}"`;
    const tokensOut = countTokens(stubResponseText);

    const usage: TokenUsage = { tokensIn, tokensOut };

    const [requestHash, outputHash] = await Promise.all([
      hashPrompt(prompt, { agentId }),
      hashOutput(stubResponseText),
    ]);

    void requestHash; // used for deduplication in real impl

    return {
      receipt: makeStubReceiptHandle(),
      outputHash,
      text: stubResponseText,
      usage,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * List agents available on the marketplace, with optional skill filtering.
   *
   * TODO: GET `{marketplaceUrl}/agents?skill={filter.skill}`.
   */
  async listAgents(filter?: { skill?: string }): Promise<ReadonlyArray<Agent>> {
    await Promise.resolve();

    if (filter?.skill === undefined) return STUB_AGENTS;

    return STUB_AGENTS.filter((a) =>
      a.skills.includes(filter.skill as string),
    );
  }

  /**
   * Retrieve on-chain receipts for invocations made by this buyer.
   *
   * TODO: GET `{marketplaceUrl}/receipts?buyer={walletPubkey}&limit={limit}`.
   */
  async getReceipts(limit = 20): Promise<ReadonlyArray<ReceiptHandle>> {
    await Promise.resolve();

    // Return up to `limit` fake receipts.
    return Array.from({ length: Math.min(limit, 3) }, () =>
      makeStubReceiptHandle(),
    );
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link BuyerClient} configured with the provided options.
 *
 * The client exposes methods to discover agents, invoke them, and retrieve
 * receipts for past invocations. All methods are currently stubs; the real
 * implementation will communicate with the CloudAGI marketplace API and
 * settle payments on Solana.
 *
 * @param opts - Client configuration including optional marketplace URL,
 *               wallet keypair, and per-invocation budget cap.
 * @returns A fully constructed {@link BuyerClient} instance.
 *
 * @throws {ZodError} If any field in `opts` fails validation.
 *
 * @example
 * ```ts
 * const client = createBuyerClient({
 *   maxBudgetLamports: 10_000,
 * });
 * const result = await client.invoke("agent_abc123", "Summarise this text");
 * console.log(result.text);
 * ```
 */
export function createBuyerClient(opts: BuyerClientOptions = {}): BuyerClient {
  // Validate — throws ZodError on invalid input.
  buyerClientOptionsSchema.parse(opts);
  return new BuyerClientImpl(opts);
}
