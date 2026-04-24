/**
 * @cloudagi/agent-sdk — Public API surface.
 *
 * Import from this module to register agents on the CloudAGI marketplace,
 * serve them locally, or invoke agents as a buyer.
 *
 * @example
 * ```ts
 * import { registerAgent, serveAgent, createBuyerClient } from "@cloudagi/agent-sdk";
 * ```
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export { registerAgent } from "./register.js";
export { serveAgent } from "./serve.js";
export { createBuyerClient } from "./buyer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  // Primitives
  AgentId,
  TxSignature,
  ReceiptHandle,
  Skill,

  // Pricing
  TokenPricing,

  // Agent descriptor
  Agent,

  // Registration
  RegisterAgentOptions,
  AgentRegistration,

  // Server-side handler
  InvocationContext,
  InvocationOutput,
  AgentHandler,
  MeterRecord,

  // Buyer-side
  TokenUsage,
  InvocationResult,
  BuyerClientOptions,
  BuyerClient,
} from "./types.js";

// ---------------------------------------------------------------------------
// Schemas (re-exported for consumers who want runtime validation)
// ---------------------------------------------------------------------------

export {
  registerAgentOptionsSchema,
  buyerClientOptionsSchema,
  tokenPricingSchema,
  invocationOutputSchema,
  skillSchema,
  endpointSchema,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export { countTokens, computeCostLamports } from "./tokens.js";
export { hashPrompt, hashOutput } from "./hashes.js";

// ---------------------------------------------------------------------------
// Server handle type (from serve module)
// ---------------------------------------------------------------------------

export type { AgentServer } from "./serve.js";
