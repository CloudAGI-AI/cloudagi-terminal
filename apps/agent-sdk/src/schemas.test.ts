/**
 * Tests for schemas.ts — Zod schema round-trip parse/serialize and rejection.
 *
 * Expected status: GREEN (schemas are fully implemented with Zod).
 */

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  buyerClientOptionsSchema,
  endpointSchema,
  invocationOutputSchema,
  registerAgentOptionsSchema,
  skillSchema,
  tokenPricingSchema,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// skillSchema
// ---------------------------------------------------------------------------

describe("skillSchema", () => {
  it("accepts valid kebab-case slugs", () => {
    for (const s of ["summarisation", "code-review", "text-to-sql", "a1-b2"]) {
      expect(() => skillSchema.parse(s)).not.toThrow();
    }
  });

  it("round-trips: parse output equals input for valid slugs", () => {
    expect(skillSchema.parse("code-review")).toBe("code-review");
  });

  it("rejects empty string", () => {
    expect(() => skillSchema.parse("")).toThrow(ZodError);
  });

  it("rejects uppercase characters", () => {
    expect(() => skillSchema.parse("Code-Review")).toThrow(ZodError);
  });

  it("rejects spaces", () => {
    expect(() => skillSchema.parse("code review")).toThrow(ZodError);
  });

  it("rejects trailing hyphen", () => {
    expect(() => skillSchema.parse("code-")).toThrow(ZodError);
  });

  it("rejects leading hyphen", () => {
    expect(() => skillSchema.parse("-code")).toThrow(ZodError);
  });

  it("rejects special characters", () => {
    expect(() => skillSchema.parse("code_review")).toThrow(ZodError);
    expect(() => skillSchema.parse("code.review")).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// endpointSchema
// ---------------------------------------------------------------------------

describe("endpointSchema", () => {
  it("accepts a valid HTTPS URL", () => {
    const url = "https://agent.example.com/invoke";
    expect(endpointSchema.parse(url)).toBe(url);
  });

  it("accepts HTTP URL (schema does not restrict to HTTPS only)", () => {
    expect(() => endpointSchema.parse("http://localhost:3000/invoke")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => endpointSchema.parse("")).toThrow(ZodError);
  });

  it("rejects non-URL strings", () => {
    expect(() => endpointSchema.parse("not-a-url")).toThrow(ZodError);
    expect(() => endpointSchema.parse("agent.example.com")).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// tokenPricingSchema
// ---------------------------------------------------------------------------

describe("tokenPricingSchema", () => {
  const VALID = { perMTokensIn: 1000, perMTokensOut: 2000 };

  it("parses valid pricing", () => {
    const result = tokenPricingSchema.parse(VALID);
    expect(result.perMTokensIn).toBe(1000);
    expect(result.perMTokensOut).toBe(2000);
  });

  it("round-trips: parse → serialize → parse produces same values", () => {
    const parsed = tokenPricingSchema.parse(VALID);
    const reparsed = tokenPricingSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
  });

  it("accepts zero values (free agent)", () => {
    expect(() => tokenPricingSchema.parse({ perMTokensIn: 0, perMTokensOut: 0 })).not.toThrow();
  });

  it("rejects negative perMTokensIn", () => {
    expect(() => tokenPricingSchema.parse({ perMTokensIn: -1, perMTokensOut: 2000 })).toThrow(
      ZodError,
    );
  });

  it("rejects negative perMTokensOut", () => {
    expect(() => tokenPricingSchema.parse({ perMTokensIn: 1000, perMTokensOut: -1 })).toThrow(
      ZodError,
    );
  });

  it("rejects float values (must be integer lamports)", () => {
    expect(() => tokenPricingSchema.parse({ perMTokensIn: 1.5, perMTokensOut: 2000 })).toThrow(
      ZodError,
    );
    expect(() => tokenPricingSchema.parse({ perMTokensIn: 1000, perMTokensOut: 0.1 })).toThrow(
      ZodError,
    );
  });

  it("rejects missing fields", () => {
    expect(() => tokenPricingSchema.parse({ perMTokensIn: 1000 })).toThrow(ZodError);
    expect(() => tokenPricingSchema.parse({ perMTokensOut: 2000 })).toThrow(ZodError);
    expect(() => tokenPricingSchema.parse({})).toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// registerAgentOptionsSchema
// ---------------------------------------------------------------------------

describe("registerAgentOptionsSchema", () => {
  const VALID = {
    name: "My Agent",
    skills: ["summarisation"],
    pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
    endpoint: "https://my-agent.example.com/invoke",
  };

  it("parses a fully valid options object", () => {
    const result = registerAgentOptionsSchema.parse(VALID);
    expect(result.name).toBe("My Agent");
    expect(result.skills).toEqual(["summarisation"]);
  });

  it("round-trips through JSON for non-keypair fields", () => {
    const parsed = registerAgentOptionsSchema.parse(VALID);
    // Serialize the non-Uint8Array fields
    const serialized = JSON.parse(
      JSON.stringify({
        name: parsed.name,
        skills: parsed.skills,
        pricing: parsed.pricing,
        endpoint: parsed.endpoint,
      }),
    );
    const reparsed = registerAgentOptionsSchema.parse(serialized);
    expect(reparsed.name).toBe(parsed.name);
    expect(reparsed.skills).toEqual(parsed.skills);
  });

  it("walletKeypair is optional — parses without it", () => {
    expect(() => registerAgentOptionsSchema.parse(VALID)).not.toThrow();
  });

  it("accepts valid walletKeypair of exactly 64 bytes", () => {
    const withKey = { ...VALID, walletKeypair: new Uint8Array(64) };
    const result = registerAgentOptionsSchema.parse(withKey);
    expect(result.walletKeypair).toBeInstanceOf(Uint8Array);
    expect(result.walletKeypair!.length).toBe(64);
  });

  it("rejects walletKeypair shorter than 64 bytes", () => {
    expect(() =>
      registerAgentOptionsSchema.parse({ ...VALID, walletKeypair: new Uint8Array(32) }),
    ).toThrow(ZodError);
  });

  it("rejects walletKeypair longer than 64 bytes", () => {
    expect(() =>
      registerAgentOptionsSchema.parse({ ...VALID, walletKeypair: new Uint8Array(65) }),
    ).toThrow(ZodError);
  });

  it("rejects empty name", () => {
    expect(() => registerAgentOptionsSchema.parse({ ...VALID, name: "" })).toThrow(ZodError);
  });

  it("rejects name longer than 64 chars", () => {
    expect(() => registerAgentOptionsSchema.parse({ ...VALID, name: "a".repeat(65) })).toThrow(
      ZodError,
    );
  });

  it("accepts name of exactly 64 chars (boundary)", () => {
    expect(() =>
      registerAgentOptionsSchema.parse({ ...VALID, name: "a".repeat(64) }),
    ).not.toThrow();
  });

  it("rejects empty skills array", () => {
    expect(() => registerAgentOptionsSchema.parse({ ...VALID, skills: [] })).toThrow(ZodError);
  });

  it("rejects skills containing non-slugs", () => {
    expect(() =>
      registerAgentOptionsSchema.parse({ ...VALID, skills: ["valid", "INVALID"] }),
    ).toThrow(ZodError);
  });

  it("rejects invalid endpoint URL", () => {
    expect(() => registerAgentOptionsSchema.parse({ ...VALID, endpoint: "not-a-url" })).toThrow(
      ZodError,
    );
  });
});

// ---------------------------------------------------------------------------
// buyerClientOptionsSchema
// ---------------------------------------------------------------------------

describe("buyerClientOptionsSchema", () => {
  it("parses an empty object (all fields optional)", () => {
    expect(() => buyerClientOptionsSchema.parse({})).not.toThrow();
  });

  it("parses a fully populated valid object", () => {
    const result = buyerClientOptionsSchema.parse({
      marketplaceUrl: "https://api.cloudagi.io",
      walletKeypair: new Uint8Array(64),
      maxBudgetLamports: 100_000,
    });
    expect(result.marketplaceUrl).toBe("https://api.cloudagi.io");
    expect(result.maxBudgetLamports).toBe(100_000);
  });

  it("rejects invalid marketplaceUrl", () => {
    expect(() => buyerClientOptionsSchema.parse({ marketplaceUrl: "not-a-url" })).toThrow(ZodError);
  });

  it("rejects non-positive maxBudgetLamports", () => {
    expect(() => buyerClientOptionsSchema.parse({ maxBudgetLamports: 0 })).toThrow(ZodError);
    expect(() => buyerClientOptionsSchema.parse({ maxBudgetLamports: -1 })).toThrow(ZodError);
  });

  it("rejects float maxBudgetLamports", () => {
    expect(() => buyerClientOptionsSchema.parse({ maxBudgetLamports: 0.5 })).toThrow(ZodError);
  });

  it("rejects walletKeypair that is not exactly 64 bytes", () => {
    expect(() => buyerClientOptionsSchema.parse({ walletKeypair: new Uint8Array(63) })).toThrow(
      ZodError,
    );
  });
});

// ---------------------------------------------------------------------------
// invocationOutputSchema
// ---------------------------------------------------------------------------

describe("invocationOutputSchema", () => {
  it("parses minimal valid output (text only)", () => {
    const result = invocationOutputSchema.parse({ text: "hello" });
    expect(result.text).toBe("hello");
    expect(result.data).toBeUndefined();
  });

  it("parses output with optional data", () => {
    const result = invocationOutputSchema.parse({
      text: "hello",
      data: { key: "value", count: 42 },
    });
    expect(result.data).toEqual({ key: "value", count: 42 });
  });

  it("rejects empty text", () => {
    expect(() => invocationOutputSchema.parse({ text: "" })).toThrow(ZodError);
  });

  it("rejects missing text field", () => {
    expect(() => invocationOutputSchema.parse({ data: {} })).toThrow(ZodError);
    expect(() => invocationOutputSchema.parse({})).toThrow(ZodError);
  });

  it("round-trips through JSON serialization", () => {
    const input = { text: "response text", data: { tokens: 42 } };
    const parsed = invocationOutputSchema.parse(input);
    const reparsed = invocationOutputSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed.text).toBe(parsed.text);
    expect(reparsed.data).toEqual(parsed.data);
  });
});
