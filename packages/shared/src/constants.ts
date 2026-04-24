/**
 * Platform fee split constants expressed in basis points (1 bps = 0.01%).
 * All three values must sum to 10000 (100%).
 */

/** Basis points allocated to the platform (15%). */
export const PLATFORM_FEE_BPS = 1500 as const;

/** Basis points allocated to the provider (80%). */
export const PROVIDER_FEE_BPS = 8000 as const;

/** Basis points allocated to the facilitator (5%). */
export const FACILITATOR_FEE_BPS = 500 as const;

/** Total basis points — must equal PLATFORM + PROVIDER + FACILITATOR. */
export const TOTAL_FEE_BPS = 10000 as const;

/**
 * Minimum stake required to register an agent.
 * Placeholder: ~25 USDC equivalent in USDC base units (6 decimals).
 * 25 USDC = 25_000_000 micro-USDC.
 */
export const MIN_STAKE_LAMPORTS = 25_000_000 as const;

/**
 * Duration of the dispute window in milliseconds (72 hours).
 * After this window closes, a receipt can no longer be disputed.
 */
export const DEFAULT_DISPUTE_WINDOW_MS = 259_200_000 as const; // 72 * 60 * 60 * 1000

/**
 * Ordered reputation tier labels indexed by tier number 0–4.
 * Matches the `tier` field in ReputationSchema.
 */
export const REPUTATION_TIERS = [
  "Unrated",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
] as const;

/** Union type of all valid reputation tier labels. */
export type ReputationTierLabel = (typeof REPUTATION_TIERS)[number];

/** Current algorithm/protocol version string. */
export const ALGORITHM_VERSION = "0.1" as const;

/**
 * Maximum value for a u32 flags bitmap used in on-chain receipts.
 * Flag bit definitions are in SPEC §9.3.
 */
export const FLAGS_BITMAP_MAX = 0xff as const;

/** Number of basis points in 100%. Used for fee arithmetic validation. */
export const BPS_DENOMINATOR = 10_000 as const;
