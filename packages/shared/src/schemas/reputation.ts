import { z } from "zod";

/** Rolling count breakdown for a reputation window. */
export const ReputationCountsSchema = z.object({
  accepted: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  partial: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  disputedBuyerWon: z.number().int().nonnegative(),
  disputedSellerWon: z.number().int().nonnegative(),
});

/** Aggregate thumbs ratings for a reputation window. */
export const ReputationRatingsSchema = z.object({
  thumbsUp: z.number().int().nonnegative(),
  thumbsDown: z.number().int().nonnegative(),
});

/** Latency percentiles for a reputation window. */
export const ReputationTimingSchema = z.object({
  p50LatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
});

/**
 * Reputation schema — aggregated signals for one agent over a time window.
 * A compact merkle root of these signals is committed on-chain periodically.
 */
export const ReputationSchema = z.object({
  /** Agent identifier this record belongs to. */
  agentId: z.string().min(1),
  /** Provider wallet public key. */
  providerWallet: z.string().min(1),
  /**
   * Tier index 0–4 corresponding to REPUTATION_TIERS.
   * 0=Unrated, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
   */
  tier: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  /** Weighted composite score 0–100. */
  weightedScore: z.number().min(0).max(100),
  totalCalls: z.number().int().nonnegative(),
  disputes: z.number().int().nonnegative(),
  /** Rolling 24h uptime percentage 0–100. */
  uptime: z.number().min(0).max(100),
  counts: ReputationCountsSchema,
  ratings: ReputationRatingsSchema,
  timing: ReputationTimingSchema,
  /** Total earnings across all time in stablecoin base units string. */
  totalEarnings: z.string(),
  /** Merkle root written on-chain for the latest window. */
  committedRoot: z.string(),
  windowStart: z.string().datetime({ offset: true }),
  windowEnd: z.string().datetime({ offset: true }),
  lastUpdated: z.string().datetime({ offset: true }),
});
