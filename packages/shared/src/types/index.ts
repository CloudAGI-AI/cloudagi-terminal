import type { z } from "zod";
import type {
  AgentSchema,
  AgentModelSchema,
  AgentPolicySchema,
  PricingModelSchema,
} from "../schemas/agent.js";
import type { SessionSchema } from "../schemas/session.js";
import type {
  InvocationSchema,
  ToolCallSchema,
  InvocationFlagsSchema,
  InvocationParamsSchema,
} from "../schemas/invocation.js";
import type { ReceiptSchema } from "../schemas/receipt.js";
import type { StakeEventSchema } from "../schemas/stakeEvent.js";
import type {
  ReputationSchema,
  ReputationCountsSchema,
  ReputationRatingsSchema,
  ReputationTimingSchema,
} from "../schemas/reputation.js";
import type {
  IntentApprovalSchema,
  IntentScopeSchema,
} from "../schemas/intentApproval.js";

/** TypeScript type for a fully validated Agent record. */
export type Agent = z.infer<typeof AgentSchema>;

/** TypeScript type for the Agent model descriptor. */
export type AgentModel = z.infer<typeof AgentModelSchema>;

/** TypeScript type for Agent execution policies. */
export type AgentPolicy = z.infer<typeof AgentPolicySchema>;

/** TypeScript type for the discriminated pricing model. */
export type PricingModel = z.infer<typeof PricingModelSchema>;

/** TypeScript type for a validated Session record. */
export type Session = z.infer<typeof SessionSchema>;

/** TypeScript type for a validated Invocation record. */
export type Invocation = z.infer<typeof InvocationSchema>;

/** TypeScript type for a single tool call within an invocation. */
export type ToolCall = z.infer<typeof ToolCallSchema>;

/** TypeScript type for per-invocation safety flags. */
export type InvocationFlags = z.infer<typeof InvocationFlagsSchema>;

/** TypeScript type for invocation model params. */
export type InvocationParams = z.infer<typeof InvocationParamsSchema>;

/** TypeScript type for a validated Receipt record. */
export type Receipt = z.infer<typeof ReceiptSchema>;

/** TypeScript type for a validated StakeEvent record. */
export type StakeEvent = z.infer<typeof StakeEventSchema>;

/** TypeScript type for a validated Reputation aggregate. */
export type Reputation = z.infer<typeof ReputationSchema>;

/** TypeScript type for reputation window counts. */
export type ReputationCounts = z.infer<typeof ReputationCountsSchema>;

/** TypeScript type for reputation rating tallies. */
export type ReputationRatings = z.infer<typeof ReputationRatingsSchema>;

/** TypeScript type for reputation latency timing. */
export type ReputationTiming = z.infer<typeof ReputationTimingSchema>;

/** TypeScript type for a validated IntentApproval record. */
export type IntentApproval = z.infer<typeof IntentApprovalSchema>;

/** TypeScript type for intent scope constraints. */
export type IntentScope = z.infer<typeof IntentScopeSchema>;
