import { describe, it, expect } from "vitest";
import {
  parseSkillTag,
  serializeSkillTag,
  SkillTagStringSchema,
  KNOWN_SKILL_TAGS,
} from "./skills.js";

describe("parseSkillTag", () => {
  it("parses a valid skill tag into domain/action/version", () => {
    const result = parseSkillTag("sentiment.classify.v1");
    expect(result).toEqual({ domain: "sentiment", action: "classify", version: "v1" });
  });

  it("parses multi-digit version", () => {
    const result = parseSkillTag("code.review.v12");
    expect(result).toEqual({ domain: "code", action: "review", version: "v12" });
  });

  it("parses underscore-containing segments", () => {
    const result = parseSkillTag("extract.json_schema.v2");
    expect(result).toEqual({ domain: "extract", action: "json_schema", version: "v2" });
  });

  it("round-trips: parse then serialize returns original tag", () => {
    const tag = "summarize.doc.v1";
    expect(serializeSkillTag(parseSkillTag(tag))).toBe(tag);
  });

  it("throws on missing version segment", () => {
    expect(() => parseSkillTag("sentiment.classify")).toThrow();
  });

  it("throws on non-v-prefixed version", () => {
    expect(() => parseSkillTag("sentiment.classify.1")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseSkillTag("")).toThrow();
  });

  it("throws on uppercase domain", () => {
    expect(() => parseSkillTag("Sentiment.classify.v1")).toThrow();
  });

  it("throws on extra segments", () => {
    expect(() => parseSkillTag("a.b.v1.extra")).toThrow();
  });
});

describe("serializeSkillTag", () => {
  it("serializes a parsed tag back to string", () => {
    const tag = { domain: "translate", action: "text", version: "v1" };
    expect(serializeSkillTag(tag)).toBe("translate.text.v1");
  });

  it("throws if version does not match vN pattern", () => {
    expect(() =>
      serializeSkillTag({ domain: "code", action: "review", version: "1" }),
    ).toThrow();
  });
});

describe("SkillTagStringSchema", () => {
  it("accepts all KNOWN_SKILL_TAGS", () => {
    for (const tag of KNOWN_SKILL_TAGS) {
      expect(SkillTagStringSchema.safeParse(tag).success).toBe(true);
    }
  });

  it("rejects a tag with spaces", () => {
    expect(SkillTagStringSchema.safeParse("a b.c.v1").success).toBe(false);
  });

  it("rejects a tag with uppercase", () => {
    expect(SkillTagStringSchema.safeParse("Code.review.v1").success).toBe(false);
  });
});

describe("KNOWN_SKILL_TAGS round-trip", () => {
  it("every known tag survives parse/serialize round-trip", () => {
    for (const tag of KNOWN_SKILL_TAGS) {
      expect(serializeSkillTag(parseSkillTag(tag))).toBe(tag);
    }
  });
});
