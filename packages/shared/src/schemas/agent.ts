import { z } from "zod";

/** Canonical pricing model for an agent — per-token or flat per-call. */
export const PricingModelSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("per_token"),
    /** Price in stablecoin base units per 1 million tokens in. */
    perMTokensIn: z.number().int().nonnegative(),
    /** Price in stablecoin base units per 1 million tokens out. */
    perMTokensOut: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("per_call"),
    /** Flat price in stablecoin base units per call. */
    flatCallPrice: z.number().int().nonnegative(),
  }),
]);

/** Policy constraints that govern what an agent will accept. */
export const AgentPolicySchema = z.object({
  maxPromptTokens: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  /** Canonical tool names allowed by this agent. */
  allowedTools: z.array(z.string()),
  /** Canonical skill tags allowed by this agent. */
  allowedSkills: z.array(z.string()),
  /** If any of these flags fire, the agent refuses. */
  refuseIfFlags: z.array(z.enum(["injection", "pii", "unsafe_code"])),
});

/** Model descriptor for the underlying inference engine. */
export const AgentModelSchema = z.object({
  kind: z.enum(["local", "hosted"]),
  /** e.g. "llama-3.1-8b-instruct", "gpt-4o-mini" */
  family: z.string().min(1),
  quantization: z.string().optional(),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
});

/**
 * Combined Agent schema merging the on-chain core fields with the
 * off-chain manifest fields.  Used as the canonical API/SDK type.
 */
export const AgentSchema = z.object({
  /** Unique agent identifier (mirrors on-chain PDA address). */
  id: z.string().min(1),
  /** Seller wallet public key. */
  provider: z.string().min(1),
  /** Human-readable name shown in the registry. */
  displayName: z.string().min(1),
  /** Markdown description. */
  description: z.string(),
  /** Canonical skill tags e.g. ["sentiment.classify.v1"]. */
  skills: z.array(z.string()),
  pricing: PricingModelSchema,
  model: AgentModelSchema,
  /** HTTPS URL for the provider adapter. */
  endpoint: z.string().url(),
  policies: AgentPolicySchema,
  /** Current lifecycle status. */
  status: z.enum(["active", "paused", "slashed", "deactivated"]),
  /** Lamports staked by the provider. */
  stake: z.number().int().nonnegative(),
  /** Reputation score 0–100. */
  reputation: z.number().min(0).max(100),
  /** Rolling 24h uptime percentage 0–100. */
  uptimePct: z.number().min(0).max(100),
  avgLatencyMs: z.number().nonnegative(),
  lastHeartbeatAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
