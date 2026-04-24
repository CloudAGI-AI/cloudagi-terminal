import { z } from "zod";

/**
 * Session schema — tracks a buyer's scoped interaction with a single agent.
 * Sessions hold budget authorization and scope the contained invocations.
 */
export const SessionSchema = z.object({
  /** Unique session identifier (ULID). */
  id: z.string().min(1),
  /** Buyer wallet public key. */
  buyerWallet: z.string().min(1),
  /** Agent being addressed in this session. */
  agentId: z.string().min(1),
  /** Session lifecycle state. */
  state: z.enum(["open", "closed", "expired", "aborted"]),
  /** How intent is collected — once per invocation or once for the session. */
  intentMode: z.enum(["per_invocation", "per_session"]),
  /** Buyer-signed cap in stablecoin base units. */
  budgetAuthorized: z.string().min(1),
  /** Running spend in stablecoin base units. */
  budgetSpent: z.string().min(1),
  /** ed25519 signature over the budget authorization. */
  budgetAuthorizationSig: z.string().min(1),
  openedAt: z.string().datetime({ offset: true }),
  closedAt: z.string().datetime({ offset: true }).optional(),
});
