import { z } from "zod";

/**
 * Receipt schema — combines the on-chain compressed NFT digest fields with
 * the off-chain metadata needed for dispute and verification flows.
 */
export const ReceiptSchema = z.object({
  /** Off-chain receipt record identifier (ULID). */
  id: z.string().min(1),
  /** Foreign key to the Invocation record. */
  invocationId: z.string().min(1),
  /** Buyer wallet public key — cNFT owner. */
  buyerWallet: z.string().min(1),
  /** Provider wallet public key — settlement destination. */
  sellerWallet: z.string().min(1),
  /** sha256 hex of canonical prompt JSON (on-chain committed). */
  promptHash: z.string().length(64),
  /** sha256 hex of canonical output JSON (on-chain committed). */
  outputHash: z.string().length(64),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  /** Gross settlement amount in lamports (stablecoin base units). */
  costLamports: z.number().int().nonnegative(),
  /** Compressed NFT asset id. */
  cNftAssetId: z.string().min(1),
  /** On-chain mint transaction signature. */
  txSignature: z.string().min(1),
  /** Deep-link URL to the receipt verification page. */
  verifyUrl: z.string().url(),
  /** Deadline timestamp for filing a dispute. */
  disputeDeadline: z.string().datetime({ offset: true }),
  /** Receipt lifecycle status. */
  status: z.enum(["minted", "disputed", "refunded"]),
  timestamp: z.string().datetime({ offset: true }),
});
