/**
 * Schema unit tests — apps/server/src/schemas/agent.ts
 *
 * RED PHASE: these tests verify the Zod schema contracts.
 * Most shape-based tests pass because the schema already exists.
 * Tests for missing/extended behavior will fail until Wave 2.
 */

import { describe, it, expect } from "vitest";
import {
  AgentSchema,
  CreateAgentSchema,
  PricingSchema,
} from "../../schemas/agent.js";
import {
  validAgent,
  validCreateAgent,
  agentMissingSkills,
  agentEmptySkills,
  agentInvalidEndpoint,
  agentNegativePricing,
  agentMissingProvider,
} from "../../test-utils/fixtures.js";

// ---------------------------------------------------------------------------
// PricingSchema
// ---------------------------------------------------------------------------

describe("PricingSchema", () => {
  it("should accept valid pricing with positive rates", () => {
    const result = PricingSchema.safeParse({
      perMTokensIn: 0.50,
      perMTokensOut: 1.50,
    });
    expect(result.success).toBe(true);
  });

  it("should accept zero rates (free tier)", () => {
    const result = PricingSchema.safeParse({
      perMTokensIn: 0,
      perMTokensOut: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject negative perMTokensIn", () => {
    const result = PricingSchema.safeParse({ perMTokensIn: -0.01, perMTokensOut: 1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("perMTokensIn");
  });

  it("should reject negative perMTokensOut", () => {
    const result = PricingSchema.safeParse({ perMTokensIn: 1, perMTokensOut: -1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("perMTokensOut");
  });

  it("should reject missing perMTokensIn", () => {
    const result = PricingSchema.safeParse({ perMTokensOut: 1 });
    expect(result.success).toBe(false);
  });

  it("should reject non-numeric pricing fields", () => {
    const result = PricingSchema.safeParse({ perMTokensIn: "free", perMTokensOut: 1 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AgentSchema
// ---------------------------------------------------------------------------

describe("AgentSchema", () => {
  it("should accept a fully valid agent object", () => {
    const result = AgentSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
  });

  it("should parse and expose all required fields", () => {
    const result = AgentSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        id: validAgent.id,
        provider: validAgent.provider,
        endpoint: validAgent.endpoint,
        skills: validAgent.skills,
        reputation: validAgent.reputation,
        stake: validAgent.stake,
      });
    }
  });

  it("should reject an agent with non-UUID id", () => {
    const result = AgentSchema.safeParse({ ...validAgent, id: "not-a-uuid" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("id");
  });

  it("should reject reputation above 1.0", () => {
    const result = AgentSchema.safeParse({ ...validAgent, reputation: 1.001 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("reputation");
  });

  it("should reject reputation below 0", () => {
    const result = AgentSchema.safeParse({ ...validAgent, reputation: -0.1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("reputation");
  });

  it("should reject an empty skills array", () => {
    const result = AgentSchema.safeParse(agentEmptySkills);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("skills");
  });

  it("should reject an agent with invalid endpoint URL", () => {
    const result = AgentSchema.safeParse({ ...validAgent, ...agentInvalidEndpoint });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("endpoint");
  });

  it("should reject negative stake", () => {
    const result = AgentSchema.safeParse({ ...validAgent, stake: -1 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("stake");
  });

  it("should reject empty provider string", () => {
    const result = AgentSchema.safeParse({ ...validAgent, provider: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("provider");
  });

  it("should reject null nested pricing", () => {
    const result = AgentSchema.safeParse({ ...validAgent, pricing: null });
    expect(result.success).toBe(false);
  });

  it("should reject missing id field", () => {
    const { id: _id, ...withoutId } = validAgent;
    const result = AgentSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("should strip unknown keys silently and still parse valid fields", () => {
    const result = AgentSchema.safeParse({ ...validAgent, unknownField: "xyz" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["unknownField"]).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// CreateAgentSchema (omits id + reputation — server-assigned)
// ---------------------------------------------------------------------------

describe("CreateAgentSchema", () => {
  it("should accept a valid create payload without id or reputation", () => {
    const result = CreateAgentSchema.safeParse(validCreateAgent);
    expect(result.success).toBe(true);
  });

  it("should strip id from create payload (client must not set id)", () => {
    const result = CreateAgentSchema.safeParse({
      ...validCreateAgent,
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("id" in result.data).toBe(false);
    }
  });

  it("should reject missing skills", () => {
    const result = CreateAgentSchema.safeParse(agentMissingSkills);
    expect(result.success).toBe(false);
  });

  it("should reject missing provider", () => {
    const result = CreateAgentSchema.safeParse(agentMissingProvider);
    expect(result.success).toBe(false);
  });

  it("should reject negative pricing in create payload", () => {
    const result = CreateAgentSchema.safeParse(agentNegativePricing);
    expect(result.success).toBe(false);
  });

  it("should reject payload with skills as non-array", () => {
    const result = CreateAgentSchema.safeParse({ ...validCreateAgent, skills: "summarize" });
    expect(result.success).toBe(false);
  });

  it("should reject payload with numeric endpoint", () => {
    const result = CreateAgentSchema.safeParse({ ...validCreateAgent, endpoint: 12345 });
    expect(result.success).toBe(false);
  });

  // RED: CreateAgentSchema should enforce minimum stake requirement per SPEC §4.1
  // Currently the schema has no minimum stake beyond nonnegative — this test will fail.
  it("should reject zero stake (minimum stake required per SPEC §4.1)", () => {
    const result = CreateAgentSchema.safeParse({ ...validCreateAgent, stake: 0 });
    // SPEC: providers must post stake > 0 to register
    expect(result.success).toBe(false);
  });
});
