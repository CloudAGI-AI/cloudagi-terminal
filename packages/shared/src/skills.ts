import { z } from "zod";

/**
 * Well-known skill domain categories registered on the CloudAGI platform.
 * Providers tag their agents with skills from these domains.
 */
export const SKILL_DOMAINS = [
  "sentiment",
  "summarize",
  "classify",
  "extract",
  "translate",
  "code",
  "reason",
  "search",
  "embed",
  "image",
  "audio",
  "custom",
] as const;

/** Union type of all registered skill domain identifiers. */
export type SkillDomain = (typeof SKILL_DOMAINS)[number];

/**
 * Parsed representation of a canonical skill tag.
 * Tags follow the pattern: `{domain}.{action}.{version}` e.g. `sentiment.classify.v1`.
 */
export interface SkillTag {
  /** Top-level capability domain. */
  domain: string;
  /** Specific action within the domain. */
  action: string;
  /** Version string e.g. "v1", "v2". */
  version: string;
}

/** Zod schema for a parsed skill tag object. */
export const SkillTagSchema = z.object({
  domain: z.string().min(1),
  action: z.string().min(1),
  version: z.string().regex(/^v\d+$/, "version must match pattern vN"),
});

/**
 * Zod schema for a raw skill tag string in the format `domain.action.version`.
 * Validates the full string before parsing.
 */
export const SkillTagStringSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.v\d+$/,
    "skill tag must be in format: domain.action.vN (e.g. sentiment.classify.v1)",
  );

/**
 * Parse a canonical skill tag string into its constituent parts.
 *
 * @param tag - A skill tag string in format `domain.action.version`.
 * @returns Parsed `{ domain, action, version }` object.
 * @throws `Error` if the tag does not match the expected format.
 *
 * @example
 * ```ts
 * parseSkillTag("sentiment.classify.v1");
 * // => { domain: "sentiment", action: "classify", version: "v1" }
 * ```
 */
export function parseSkillTag(tag: string): SkillTag {
  const validated = SkillTagStringSchema.parse(tag);
  const parts = validated.split(".");
  // Safe: regex guarantees exactly 3 dot-separated segments.
  const [domain, action, version] = parts as [string, string, string];
  return { domain, action, version };
}

/**
 * Serialize a `SkillTag` object back into its canonical string form.
 *
 * @param skillTag - Parsed skill tag object.
 * @returns Canonical dot-separated string.
 *
 * @example
 * ```ts
 * serializeSkillTag({ domain: "sentiment", action: "classify", version: "v1" });
 * // => "sentiment.classify.v1"
 * ```
 */
export function serializeSkillTag(skillTag: SkillTag): string {
  const validated = SkillTagSchema.parse(skillTag);
  return `${validated.domain}.${validated.action}.${validated.version}`;
}

/**
 * Sample registry of well-known platform skill tags.
 * Agents self-declare skills from this list; unknown tags are accepted but not
 * boost-ranked in discovery.
 */
export const KNOWN_SKILL_TAGS = [
  "sentiment.classify.v1",
  "summarize.doc.v1",
  "summarize.chat.v1",
  "classify.intent.v1",
  "classify.topic.v1",
  "extract.entities.v1",
  "extract.json.v1",
  "translate.text.v1",
  "code.review.v1",
  "code.generate.v1",
  "code.explain.v1",
  "reason.chain.v1",
  "search.semantic.v1",
  "embed.text.v1",
] as const;

/** Union type of all known canonical skill tag strings. */
export type KnownSkillTag = (typeof KNOWN_SKILL_TAGS)[number];
