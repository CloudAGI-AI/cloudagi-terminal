import { z } from "zod";

/**
 * Scope constraints bound by a buyer's intent approval.
 * Any agent execution that violates these bounds is rejected by the server.
 */
export const IntentScopeSchema = z.object({
  /** Maximum allowed spend for this invocation/session in lamports. */
  maxSpendLamports: z.number().int().nonnegative(),
  /** Canonical tool names the agent is permitted to call. */
  allowedTools: z.array(z.string()),
  /** Maximum wall-clock duration in milliseconds before expiry. */
  maxDurationMs: z.number().int().positive(),
});

/**
 * IntentApproval schema — off-chain signed record of a buyer's explicit
 * approval of an agent's declared intent before execution begins.
 */
export const IntentApprovalSchema = z.object({
  /** Unique approval identifier (ULID). */
  id: z.string().min(1),
  sessionId: z.string().min(1),
  /** Present when scope is per_invocation; absent for per_session mandates. */
  invocationId: z.string().optional(),
  /** Whether this approval covers a single invocation or the whole session. */
  scope: z.enum(["per_invocation", "per_session"]),
  /** Plain-English intent text as declared by the agent. */
  intentText: z.string().min(1),
  /** Canonical skill tags approved for this execution. */
  boundSkills: z.array(z.string()),
  /** Canonical tool names approved for this execution. */
  boundTools: z.array(z.string()),
  maxTokensIn: z.number().int().positive(),
  maxTokensOut: z.number().int().positive(),
  /** Stablecoin cap string in base units (e.g. "250000"). */
  maxSpend: z.string().min(1),
  /** Unique nonce to prevent replay. */
  nonce: z.string().min(1),
  /** Buyer ed25519 signature over canonical JSON of this approval. */
  approvalSig: z.string().min(1),
  scopeConstraints: IntentScopeSchema,
  approvedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
});
