/**
 * @cloudagi/shared — types, zod schemas, constants, and helpers shared
 * across apps/web, apps/server, and apps/agent-sdk.
 *
 * @example
 * ```ts
 * import { AgentSchema, type Agent } from '@cloudagi/shared';
 *
 * const agent: Agent = AgentSchema.parse(rawData);
 * ```
 */

// --- Schemas ---
export {
  AgentSchema,
  AgentModelSchema,
  AgentPolicySchema,
  PricingModelSchema,
} from "./schemas/agent.js";

export { SessionSchema } from "./schemas/session.js";

export {
  InvocationSchema,
  ToolCallSchema,
  InvocationFlagsSchema,
  InvocationParamsSchema,
  InjectionFlagSchema,
} from "./schemas/invocation.js";

// --- Injection detection ---
export { detectPromptInjection, scanInjectionFlags } from "./injection.js";

export { ReceiptSchema } from "./schemas/receipt.js";

export { StakeEventSchema } from "./schemas/stakeEvent.js";

export {
  ReputationSchema,
  ReputationCountsSchema,
  ReputationRatingsSchema,
  ReputationTimingSchema,
} from "./schemas/reputation.js";

export {
  IntentApprovalSchema,
  IntentScopeSchema,
} from "./schemas/intentApproval.js";

// --- Types ---
export type {
  Agent,
  AgentModel,
  AgentPolicy,
  PricingModel,
  Session,
  Invocation,
  ToolCall,
  InvocationFlags,
  InvocationParams,
  Receipt,
  StakeEvent,
  Reputation,
  ReputationCounts,
  ReputationRatings,
  ReputationTiming,
  IntentApproval,
  IntentScope,
  InjectionFlag,
} from "./types/index.js";

// --- Constants ---
export {
  PLATFORM_FEE_BPS,
  PROVIDER_FEE_BPS,
  FACILITATOR_FEE_BPS,
  TOTAL_FEE_BPS,
  MIN_STAKE_LAMPORTS,
  DEFAULT_DISPUTE_WINDOW_MS,
  REPUTATION_TIERS,
  ALGORITHM_VERSION,
  FLAGS_BITMAP_MAX,
  BPS_DENOMINATOR,
} from "./constants.js";

export type { ReputationTierLabel } from "./constants.js";

// --- Errors ---
export {
  CloudAGIError,
  ValidationError,
  PaymentError,
  ReceiptError,
  AgentNotFoundError,
} from "./errors.js";

// --- Skills ---
export {
  SKILL_DOMAINS,
  KNOWN_SKILL_TAGS,
  SkillTagSchema,
  SkillTagStringSchema,
  parseSkillTag,
  serializeSkillTag,
} from "./skills.js";

export type { SkillTag, SkillDomain, KnownSkillTag } from "./skills.js";
