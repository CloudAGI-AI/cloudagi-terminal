/**
 * Central type definitions for the CloudAGI Agent SDK.
 * All public-facing types are exported from this module.
 */

// ---------------------------------------------------------------------------
// Primitive identifiers
// ---------------------------------------------------------------------------

/** Opaque string representing a registered agent's unique identifier on-chain. */
export type AgentId = string & { readonly __brand: "AgentId" };

/** Opaque string representing a Solana transaction signature. */
export type TxSignature = string & { readonly __brand: "TxSignature" };

/** Opaque string referencing a single invocation receipt stored on-chain. */
export type ReceiptHandle = string & { readonly __brand: "ReceiptHandle" };

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * Token-based pricing denominated in lamports.
 * Prices are per-million tokens (M-tokens) to avoid floating-point issues.
 */
export interface TokenPricing {
  /** Cost in lamports per 1 million input tokens. */
  readonly perMTokensIn: number;
  /** Cost in lamports per 1 million output tokens. */
  readonly perMTokensOut: number;
}

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

/**
 * Descriptor for a capability or domain this agent handles.
 * e.g. "summarisation", "code-review", "translation".
 */
export type Skill = string;

/**
 * Immutable snapshot of a registered agent as stored on the marketplace.
 */
export interface Agent {
  /** Globally unique agent identifier. */
  readonly agentId: AgentId;
  /** Human-readable display name. */
  readonly name: string;
  /** List of skills / capabilities this agent advertises. */
  readonly skills: ReadonlyArray<Skill>;
  /** Pricing schedule for token usage. */
  readonly pricing: TokenPricing;
  /** HTTP(S) endpoint the marketplace routes invocations to. */
  readonly endpoint: string;
  /** ISO-8601 timestamp of registration. */
  readonly registeredAt: string;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link registerAgent}.
 * `walletKeypair` is optional at the type level; the implementation will
 * require it unless a default signer is configured in the environment.
 */
export interface RegisterAgentOptions {
  /** Human-readable display name for the agent (max 64 chars). */
  readonly name: string;
  /** Capability tags that describe what this agent can do. */
  readonly skills: ReadonlyArray<Skill>;
  /** Pricing the agent charges buyers, denominated in lamports per M-tokens. */
  readonly pricing: TokenPricing;
  /** Publicly reachable HTTPS endpoint that serves this agent. */
  readonly endpoint: string;
  /**
   * Raw 64-byte Solana keypair bytes used to sign the registration transaction.
   * When omitted, the runtime falls back to `AGENT_WALLET_KEYPAIR` env var.
   *
   * @remarks Typed as `Uint8Array` so callers don't need `@solana/web3.js` just
   * to pass a keypair — the SDK internalises that dependency.
   */
  readonly walletKeypair?: Uint8Array;
}

/**
 * Result of a successful {@link registerAgent} call.
 */
export interface AgentRegistration {
  /** Canonical agent ID assigned by the marketplace registry. */
  readonly agentId: AgentId;
  /**
   * Solana transaction signature that recorded this registration on-chain.
   * Can be used to confirm finality via `getTransaction`.
   */
  readonly txSignature: TxSignature;
}

// ---------------------------------------------------------------------------
// Invocation context & handler
// ---------------------------------------------------------------------------

/**
 * Runtime context passed to an {@link AgentHandler} on each invocation.
 * Contains the raw prompt, buyer metadata, and request correlation IDs.
 */
export interface InvocationContext {
  /** SHA-256 hex hash of the prompt + request parameters, for deduplication. */
  readonly requestHash: string;
  /** Raw prompt string sent by the buyer. */
  readonly prompt: string;
  /** Arbitrary key/value metadata forwarded by the marketplace. */
  readonly metadata: Readonly<Record<string, string>>;
  /** ISO-8601 timestamp of when the invocation was received by this server. */
  readonly receivedAt: string;
}

/**
 * Structured output produced by an {@link AgentHandler}.
 * The SDK wraps this to compute token counts and generate the receipt.
 */
export interface InvocationOutput {
  /** The textual response to return to the buyer. */
  readonly text: string;
  /**
   * Optional structured data to include alongside the text response.
   * Must be JSON-serialisable.
   */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * A function that handles one buyer invocation.
 * Implementations should be stateless and idempotent.
 *
 * @param ctx - Invocation context provided by the SDK runtime.
 * @returns A promise that resolves to the agent's output.
 */
export type AgentHandler = (ctx: InvocationContext) => Promise<InvocationOutput>;

// ---------------------------------------------------------------------------
// Invocation result (buyer-side)
// ---------------------------------------------------------------------------

/**
 * Token usage breakdown for a single invocation, as metered by the SDK.
 */
export interface TokenUsage {
  /** Approximate number of input tokens consumed. */
  readonly tokensIn: number;
  /** Approximate number of output tokens produced. */
  readonly tokensOut: number;
}

/**
 * Full result of a {@link BuyerClient.invoke} call.
 */
export interface InvocationResult {
  /** Opaque handle to the on-chain receipt for this invocation. */
  readonly receipt: ReceiptHandle;
  /** SHA-256 hex hash of the output, for tamper-detection. */
  readonly outputHash: string;
  /** Textual response from the agent. */
  readonly text: string;
  /**
   * Optional structured data included in the agent response, if any.
   */
  readonly data?: Readonly<Record<string, unknown>>;
  /** Token usage as reported by the metering layer. */
  readonly usage: TokenUsage;
  /** ISO-8601 timestamp of when the response was received by the buyer client. */
  readonly completedAt: string;
}

// ---------------------------------------------------------------------------
// Buyer client
// ---------------------------------------------------------------------------

/**
 * Options for constructing a {@link BuyerClient} via {@link createBuyerClient}.
 */
export interface BuyerClientOptions {
  /** Base URL of the CloudAGI marketplace API. Defaults to mainnet. */
  readonly marketplaceUrl?: string;
  /**
   * Raw 64-byte Solana keypair bytes used to sign payment transactions.
   * When omitted, falls back to `BUYER_WALLET_KEYPAIR` env var.
   */
  readonly walletKeypair?: Uint8Array;
  /**
   * Maximum lamports the buyer is willing to spend on a single invocation.
   * Acts as an upper cap; the call fails rather than exceed this budget.
   */
  readonly maxBudgetLamports?: number;
}

/**
 * Client interface for buyers to discover and invoke agents on the marketplace.
 * Obtain an instance via {@link createBuyerClient}.
 */
export interface BuyerClient {
  /**
   * Invoke a registered agent by ID with a natural-language prompt.
   *
   * @param agentId - The target agent's unique identifier.
   * @param prompt  - Natural-language input to send to the agent.
   * @returns A promise resolving to the full invocation result, including the
   *          on-chain receipt handle and token-usage breakdown.
   */
  invoke(agentId: AgentId | string, prompt: string): Promise<InvocationResult>;

  /**
   * List agents registered on the marketplace, with optional skill filtering.
   *
   * @param filter - Optional filter; when `skill` is provided, only agents
   *                 advertising that skill are returned.
   * @returns A promise resolving to an array of agent descriptors.
   */
  listAgents(filter?: { skill?: string }): Promise<ReadonlyArray<Agent>>;

  /**
   * Retrieve the on-chain receipts for invocations made by this buyer.
   *
   * @param limit - Maximum number of receipts to return (default 20).
   * @returns A promise resolving to an array of receipt handles, newest first.
   */
  getReceipts(limit?: number): Promise<ReadonlyArray<ReceiptHandle>>;
}

// ---------------------------------------------------------------------------
// Internal metering
// ---------------------------------------------------------------------------

/**
 * Internal record produced by the token-metering wrapper in {@link serveAgent}.
 * Not part of the public API surface but exported for use by other SDK modules.
 */
export interface MeterRecord {
  /** SHA-256 hex hash of the incoming prompt + parameters. */
  readonly requestHash: string;
  /** SHA-256 hex hash of the output text. */
  readonly outputHash: string;
  /** Token counts for this invocation. */
  readonly usage: TokenUsage;
  /** ISO-8601 timestamp. */
  readonly timestamp: string;
}
