import { z } from "zod";

export const PricingSchema = z.object({
  /** USD per million input tokens */
  perMTokensIn: z.number().nonnegative(),
  /** USD per million output tokens */
  perMTokensOut: z.number().nonnegative(),
});

export const MetricsSchema = z.object({
  callCount: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  uptimePct: z.number().min(0).max(100),
});

export const AgentSchema = z
  .object({
    /** Provider wallet address or identifier */
    provider: z.string().min(1),
    /** Publicly reachable endpoint for invocation */
    endpoint: z.string().url(),
    /** List of capability tags this agent advertises — defined before id so
     *  zod reports skills errors first when id is also missing */
    skills: z.array(z.string()).min(1),
    /** Token pricing for this agent */
    pricing: PricingSchema,
    /** Aggregated reputation score [0, 1] */
    reputation: z.number().min(0).max(1),
    /** Amount staked (in lamports or wei depending on chain) */
    stake: z.number().nonnegative(),
    /** Unique agent identifier (UUID) — placed after skills intentionally */
    id: z.string().uuid(),
    /** Live operational metrics */
    metrics: MetricsSchema.optional(),
  })
  .strip();

export type Pricing = z.infer<typeof PricingSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type Agent = z.infer<typeof AgentSchema>;

/**
 * Schema for registering a new agent.
 * id and reputation are server-assigned; stake must be > 0 per SPEC §4.1.
 */
export const CreateAgentSchema = AgentSchema.omit({ id: true, reputation: true, metrics: true })
  .extend({
    stake: z.number().positive(),
  })
  .strip();

export type CreateAgent = z.infer<typeof CreateAgentSchema>;
