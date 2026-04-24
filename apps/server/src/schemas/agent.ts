import { z } from "zod";

export const PricingSchema = z.object({
  /** USD per million input tokens */
  perMTokensIn: z.number().nonnegative(),
  /** USD per million output tokens */
  perMTokensOut: z.number().nonnegative(),
});

export const AgentSchema = z.object({
  /** Unique agent identifier (UUID) */
  id: z.string().uuid(),
  /** Provider wallet address or identifier */
  provider: z.string().min(1),
  /** Publicly reachable endpoint for invocation */
  endpoint: z.string().url(),
  /** List of capability tags this agent advertises */
  skills: z.array(z.string()).min(1),
  /** Token pricing for this agent */
  pricing: PricingSchema,
  /** Aggregated reputation score [0, 1] */
  reputation: z.number().min(0).max(1),
  /** Amount staked (in lamports or wei depending on chain) */
  stake: z.number().nonnegative(),
});

export type Pricing = z.infer<typeof PricingSchema>;
export type Agent = z.infer<typeof AgentSchema>;

/** Schema for registering a new agent (id is server-assigned) */
export const CreateAgentSchema = AgentSchema.omit({ id: true, reputation: true });
export type CreateAgent = z.infer<typeof CreateAgentSchema>;
