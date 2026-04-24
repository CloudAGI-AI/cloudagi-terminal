import { z } from "zod";

/**
 * StakeEvent schema — immutable log entry for every stake lifecycle change
 * (lock, unlock, slash, top-up) associated with a provider's agent.
 */
export const StakeEventSchema = z.object({
  /** Event record identifier (on-chain pubkey or ULID). */
  id: z.string().min(1),
  /** Agent public key (on-chain PDA). */
  agentId: z.string().min(1),
  /** Provider wallet public key. */
  providerWallet: z.string().min(1),
  /** Kind of stake lifecycle event. */
  kind: z.enum(["stake", "slash", "unstake", "top_up"]),
  /** Amount in lamports (stablecoin base units). */
  amountLamports: z.number().int().nonnegative(),
  /** Human-readable or code reason, present for slashes. */
  reason: z.string().optional(),
  /** On-chain transaction signature. */
  txSignature: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
});
