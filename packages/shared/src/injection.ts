/**
 * Prompt-injection detector — deterministic, regex + Unicode heuristics only.
 * No LLM calls. High-recall over high-precision for MVP (SPEC §9.3).
 *
 * Public surface:
 *   detectPromptInjection(prompt) → Promise<number>   0–1 score
 *   scanInjectionFlags(prompt)    → InjectionFlag[]   rich detail
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const InjectionFlagSchema = z.object({
  rule: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  span: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  matched: z.string(),
});

export type InjectionFlag = z.infer<typeof InjectionFlagSchema>;

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

type Severity = "low" | "medium" | "high" | "critical";

interface Rule {
  id: string;
  severity: Severity;
  pattern: RegExp;
}

const RULES: readonly Rule[] = [
  // Rule 1 — ignore-previous: "ignore (all) previous instructions" or
  // broader "ignore your instructions / ignore the above (directions)"
  {
    id: "ignore-previous",
    severity: "critical",
    pattern:
      /ignore\s+(all\s+)?(previous|your|the\s+above)\s+(instructions?|directions?|constraints?)/gi,
  },

  // Rule 2 — disregard-system
  {
    id: "disregard-system",
    severity: "critical",
    pattern: /disregard\s+(all\s+)?prior\s+(context|directives|system)/gi,
  },

  // Rule 3 — overwrite-instructions
  {
    id: "overwrite-instructions",
    severity: "high",
    pattern: /(new|updated)\s+instructions\s*:/gi,
  },

  // Rule 4 — reveal-system-prompt
  {
    id: "reveal-system-prompt",
    severity: "high",
    pattern: /reveal\s+(your\s+)?(system\s+|initial\s+|raw\s+)?prompt/gi,
  },

  // Rule 5 — jailbreak-template (DAN, pretend you are, act as if no restrictions)
  {
    id: "jailbreak-template",
    severity: "critical",
    pattern:
      /\bDAN\b|pretend\s+you\s+are|act\s+as\s+if\s+you\s+have\s+no\s+restrictions/gi,
  },

  // Rule 6 — encoded-payload (base64 blobs containing "ignore" or "prompt")
  {
    id: "encoded-payload",
    severity: "high",
    pattern: /[A-Za-z0-9+/]{20,}={0,2}/g,
  },

  // Rule 7 — obfuscation (zero-width chars or dense homoglyph runs)
  {
    id: "obfuscation",
    severity: "medium",
    // Zero-width space, zero-width non-joiner, zero-width joiner, soft hyphen, BOM
    pattern: /[​‌‍­﻿⁠᠎]/g,
  },

  // Rule 8 — nested-instruction (triple-backtick blocks with model-addressed instructions)
  {
    id: "nested-instruction",
    severity: "high",
    pattern: /```[\s\S]{0,500}(ignore|instructions|system|override|jailbreak)[\s\S]{0,500}```/gi,
  },

  // Rule 9 — tool-injection (eval or shell commands)
  {
    id: "tool-injection",
    severity: "critical",
    pattern: /execute\s*:\s*rm\s+-rf|eval\s*\(|system\s*\(|__import__\s*\(/gi,
  },

  // Rule 10 — exfil-attempt (credential/data exfiltration)
  {
    id: "exfil-attempt",
    severity: "critical",
    pattern: /send\s+to\s+attacker|curl\s+.*my_secret|exfiltrate|data.*exfil/gi,
  },

  // Rule 11 — system-override tags
  {
    id: "system-override-tag",
    severity: "high",
    pattern:
      /\{\{\s*SYSTEM_OVERRIDE\s*\}\}|\[SYSTEM[\s_]OVERRIDE\]|\bsystem\s*:\s*ignore\b/gi,
  },

  // Rule 12 — forget-everything directive
  {
    id: "forget-everything",
    severity: "critical",
    pattern: /forget\s+(everything|all)\s+(above|before|prior)/gi,
  },

  // Rule 13 — html/xml injection into model context
  {
    id: "html-comment-injection",
    severity: "high",
    pattern: /<!--\s*(ignore|system|override|above)/gi,
  },

  // Rule 14 — instruction template tags (common in leaked jailbreaks)
  {
    id: "instruction-template-tag",
    severity: "high",
    pattern: /\[INST\]|\[\/INST\]|<\|system\|>|<\|user\|>|<\|assistant\|>/gi,
  },

  // Rule 15 — safety-guideline disable attempts
  {
    id: "disable-safety",
    severity: "critical",
    pattern: /disable\s+all\s+safety|remove\s+all\s+(restrictions|guidelines|filters)/gi,
  },
] as const;

// ---------------------------------------------------------------------------
// Base64 suspicious-blob checker (Rule 6 helper)
// ---------------------------------------------------------------------------

function isBase64SuspiciousBlob(candidate: string): boolean {
  try {
    const decoded = Buffer.from(candidate, "base64").toString("utf8");
    return /ignore|prompt/i.test(decoded);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core scanner
// ---------------------------------------------------------------------------

/**
 * Scan a prompt string and return all matching injection flags.
 * Each flag identifies the rule, severity, byte span, and matched text.
 */
export function scanInjectionFlags(prompt: string): InjectionFlag[] {
  const flags: InjectionFlag[] = [];

  for (const rule of RULES) {
    // Reset lastIndex for global regexes before each scan
    rule.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(prompt)) !== null) {
      const start = match.index;
      const matched = match[0];
      const end = start + matched.length;

      // Special handling for base64 blobs — only flag if decoded payload is suspicious
      if (rule.id === "encoded-payload" && !isBase64SuspiciousBlob(matched)) {
        // Advance manually to avoid infinite loop on zero-length matches
        if (rule.pattern.lastIndex === match.index) rule.pattern.lastIndex++;
        continue;
      }

      flags.push({ rule: rule.id, severity: rule.severity, span: [start, end], matched });

      // Safety: prevent infinite loop on zero-length matches
      if (rule.pattern.lastIndex === match.index) rule.pattern.lastIndex++;
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Score function (SPEC §9.3 contract: returns 0–1 float)
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 0.25,
  medium: 0.45,
  high: 0.65,
  critical: 1.0,
};

/**
 * Returns a 0–1 injection-risk score.
 * Any critical flag → 1.0.
 * Highest severity weight otherwise.
 * 0 flags → 0.0.
 *
 * The integration test contract:
 *   - Known attack strings → score >= 0.5
 *   - Benign prompts       → score < 0.5
 */
export async function detectPromptInjection(prompt: string): Promise<number> {
  const flags = scanInjectionFlags(prompt);
  if (flags.length === 0) return 0.0;

  let maxWeight = 0;
  for (const flag of flags) {
    const w = SEVERITY_WEIGHT[flag.severity];
    if (w > maxWeight) maxWeight = w;
    if (maxWeight >= 1.0) break;
  }
  return maxWeight;
}
