/**
 * Zod schemas for all SDK input/output shapes.
 * Co-located here so validation logic stays close to the type definitions
 * without polluting types.ts with runtime imports.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Validates a non-empty string that is a plausible HTTPS endpoint URL. */
export const endpointSchema = z
  .string()
  .min(1, "endpoint must not be empty")
  .url("endpoint must be a valid URL");

/** Validates a skill tag — non-empty, lowercase, hyphen-separated slug. */
export const skillSchema = z
  .string()
  .min(1, "skill must not be empty")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "skill must be a kebab-case slug");

// ---------------------------------------------------------------------------
// TokenPricing
// ---------------------------------------------------------------------------

export const tokenPricingSchema = z.object({
  /** Cost in lamports per 1 million input tokens. */
  perMTokensIn: z
    .number()
    .int("perMTokensIn must be an integer (lamports)")
    .nonnegative("perMTokensIn must be >= 0"),
  /** Cost in lamports per 1 million output tokens. */
  perMTokensOut: z
    .number()
    .int("perMTokensOut must be an integer (lamports)")
    .nonnegative("perMTokensOut must be >= 0"),
});

export type TokenPricingInput = z.input<typeof tokenPricingSchema>;

// ---------------------------------------------------------------------------
// RegisterAgentOptions
// ---------------------------------------------------------------------------

export const registerAgentOptionsSchema = z.object({
  /** Human-readable display name (1–64 chars). */
  name: z
    .string()
    .min(1, "name must not be empty")
    .max(64, "name must be 64 characters or fewer"),

  /** At least one skill tag must be provided. */
  skills: z
    .array(skillSchema)
    .min(1, "at least one skill is required"),

  /** Pricing schedule denominated in lamports per M-tokens. */
  pricing: tokenPricingSchema,

  /** Publicly reachable HTTPS endpoint for this agent. */
  endpoint: endpointSchema,

  /**
   * Optional raw 64-byte Solana keypair.
   * Validated as a Uint8Array of exactly 64 bytes when provided.
   */
  walletKeypair: z
    .instanceof(Uint8Array)
    .refine((k) => k.length === 64, "walletKeypair must be exactly 64 bytes")
    .optional(),
});

export type RegisterAgentOptionsInput = z.input<typeof registerAgentOptionsSchema>;

// ---------------------------------------------------------------------------
// BuyerClientOptions
// ---------------------------------------------------------------------------

export const buyerClientOptionsSchema = z.object({
  /** Base URL of the CloudAGI marketplace API. */
  marketplaceUrl: z.string().url("marketplaceUrl must be a valid URL").optional(),

  /**
   * Optional raw 64-byte Solana keypair for signing payment transactions.
   */
  walletKeypair: z
    .instanceof(Uint8Array)
    .refine((k) => k.length === 64, "walletKeypair must be exactly 64 bytes")
    .optional(),

  /** Upper spend cap per invocation in lamports. */
  maxBudgetLamports: z
    .number()
    .int("maxBudgetLamports must be an integer")
    .positive("maxBudgetLamports must be positive")
    .optional(),
});

export type BuyerClientOptionsInput = z.input<typeof buyerClientOptionsSchema>;

// ---------------------------------------------------------------------------
// InvocationOutput (handler return value)
// ---------------------------------------------------------------------------

export const invocationOutputSchema = z.object({
  /** Textual response to return to the buyer. */
  text: z.string().min(1, "text must not be empty"),

  /** Optional structured JSON-serialisable data. */
  data: z.record(z.string(), z.unknown()).optional(),
});

export type InvocationOutputInput = z.input<typeof invocationOutputSchema>;
