/**
 * Token metering helpers for the CloudAGI Agent SDK.
 *
 * Uses an improved heuristic that approximates BPE (cl100k_base) tokenisation:
 *   - Splits on whitespace and punctuation boundaries first.
 *   - Applies 3 chars/token for code-like segments (high symbol/digit ratio).
 *   - Applies 4 chars/token for prose segments.
 *   - Accounts for punctuation tokens separately.
 *
 * Target: within ±20% of GPT-style tokenisation for common prose and code.
 */

// ---------------------------------------------------------------------------
// Heuristic constants
// ---------------------------------------------------------------------------

/** Characters per token for prose text. */
const PROSE_CHARS_PER_TOKEN = 4 as const;

/** Characters per token for code-like text. */
const CODE_CHARS_PER_TOKEN = 3 as const;

/**
 * Regex matching "word-like" tokens: sequences of letters/digits.
 * Punctuation and whitespace are counted separately.
 */
const WORD_RE = /[a-zA-Z0-9']+/g;

/**
 * Regex matching punctuation characters that typically form their own tokens.
 */
const PUNCT_RE = /[^a-zA-Z0-9'\s]/g;

/**
 * Detect whether a string is "code-like" by measuring the ratio of
 * non-alphabetic characters (digits, operators, braces, etc.).
 *
 * Threshold: if >25% of non-whitespace chars are symbols/digits → code mode.
 */
function isCodeLike(text: string): boolean {
  const nonSpace = text.replace(/\s/g, "");
  if (nonSpace.length === 0) return false;
  const symbolCount = (nonSpace.match(/[^a-zA-Z]/g) ?? []).length;
  return symbolCount / nonSpace.length > 0.25;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate the number of tokens in `text` using a character-count heuristic
 * tuned to approximate cl100k_base BPE tokenisation within ±20%.
 *
 * @param text - The string whose token length should be estimated.
 * @returns An integer token count (0 for empty strings).
 */
export function countTokens(text: string): number {
  if (text.length === 0) return 0;

  // Count word-like sequences and punctuation tokens separately.
  const words = text.match(WORD_RE) ?? [];
  const puncts = text.match(PUNCT_RE) ?? [];

  const charsPerToken = isCodeLike(text) ? CODE_CHARS_PER_TOKEN : PROSE_CHARS_PER_TOKEN;

  // Word tokens: ceil(totalWordChars / charsPerToken).
  const wordCharCount = words.reduce((sum, w) => sum + w.length, 0);
  const wordTokens = wordCharCount > 0 ? Math.ceil(wordCharCount / charsPerToken) : 0;

  // Punctuation: each distinct punctuation character is approximately 1 token,
  // but sequences of the same punct merge (e.g. "..." = 1 token). Group runs.
  // Simple approximation: ceil(punctCount / 1.5) for typical prose punct density.
  const punctTokens = puncts.length > 0 ? Math.ceil(puncts.length / 1.5) : 0;

  // Whitespace-only strings (no words, no punct) get 1 token minimum.
  const total = wordTokens + punctTokens;
  if (total === 0 && text.trim().length === 0 && text.length > 0) {
    return 1;
  }

  return Math.max(total, text.length > 0 ? 1 : 0);
}

/**
 * Compute the lamport cost for a given number of tokens at the specified rate.
 *
 * @param tokens         - Number of tokens to price.
 * @param perMTokensRate - Lamports per 1 million tokens.
 * @returns Cost in lamports, rounded up to the nearest integer.
 */
export function computeCostLamports(tokens: number, perMTokensRate: number): number {
  if (tokens <= 0) return 0;
  if (perMTokensRate <= 0) return 0;
  return Math.ceil((tokens / 1_000_000) * perMTokensRate);
}
