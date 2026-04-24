import { z } from "zod";
import { InjectionFlagSchema } from "../injection.js";

export { InjectionFlagSchema };

/** A single tool call made by the agent during an invocation. */
export const ToolCallSchema = z.object({
  name: z.string().min(1),
  /** sha256 hex of the JSON args blob. */
  argsHash: z.string().length(64),
  /** sha256 hex of the result blob, present when completed. */
  resultHash: z.string().length(64).optional(),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["ok", "failed", "blocked"]),
});

/** Prompt-injection and safety flag scores captured per invocation. */
export const InvocationFlagsSchema = z.object({
  /** 0–1 probability of prompt injection. */
  promptInjectionScore: z.number().min(0).max(1),
  /** 0–1 probability of unsafe output. */
  unsafeOutputScore: z.number().min(0).max(1),
  piiDetected: z.boolean(),
});

/** Model params sent alongside each prompt. */
export const InvocationParamsSchema = z.object({
  temperature: z.number().min(0).max(2),
  maxOutputTokens: z.number().int().positive(),
  tools: z.array(z.string()).optional(),
});

/**
 * Invocation schema — the full off-chain record of a single prompt/response
 * cycle.  The on-chain digest is stored in the corresponding Receipt.
 */
export const InvocationSchema = z.object({
  /** Unique invocation identifier (ULID). */
  id: z.string().min(1),
  sessionId: z.string().min(1),
  agentId: z.string().min(1),
  buyerWallet: z.string().min(1),

  // --- Inputs ---
  /** Encrypted at rest; only the hash is committed on-chain. */
  prompt: z.string(),
  /** sha256 hex of canonical prompt JSON. */
  promptHash: z.string().length(64),
  params: InvocationParamsSchema,

  // --- Intent ---
  /** Plain-English declared intent returned by the agent. */
  declaredIntent: z.string(),
  /** Buyer ed25519 signature over intent + nonce. */
  intentApprovalSig: z.string(),
  intentApprovalExpiresAt: z.string().datetime({ offset: true }),

  // --- Execution ---
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum([
    "pending_intent",
    "running",
    "completed",
    "partial",
    "failed",
    "refunded",
  ]),

  // --- Output ---
  /** Encrypted at rest. */
  output: z.string().optional(),
  /** sha256 hex of canonical output JSON. */
  outputHash: z.string().length(64).optional(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  toolCalls: z.array(ToolCallSchema),
  flags: InvocationFlagsSchema,
  /** Detailed prompt-injection detection flags (SPEC §9.3). */
  injectionFlags: z.array(InjectionFlagSchema).optional(),

  // --- Settlement ---
  /** Gross settlement amount in stablecoin base units. */
  settlementAmount: z.string(),
  /** Facilitator ed25519 signature over settlement data. */
  settlementSig: z.string().optional(),
  /** Foreign key to the minted Receipt, present after settlement. */
  receiptId: z.string().optional(),
});
