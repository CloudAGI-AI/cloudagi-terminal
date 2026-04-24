/**
 * Token metering helpers for the CloudAGI Agent SDK.
 *
 * The current implementation uses a simple character-based heuristic
 * (4 characters ≈ 1 token) which is accurate enough for billing estimates
 * on English prose and code.
 *
 * TODO: Replace with a proper BPE tokeniser (e.g. tiktoken) once the wasm
 * bundle size budget is established. The function signatures are stable so
 * swapping the implementation is non-breaking.
 */

/** Average characters per token — empirically ~4 for English + code. */
const CHARS_PER_TOKEN = 4 as const;

/**
 * Estimate the number of tokens in `text` using a character-count heuristic.
 *
 * The result is rounded up so callers never under-count usage.
 *
 * @param text - The string whose token length should be estimated.
 * @returns An integer token count, always >= 1 for non-empty strings and
 *          0 for empty strings.
 *
 * @example
 * ```ts
 * countTokens("Hello, world!"); // → 4
 * ```
 *
 * @remarks
 * TODO: Integrate `tiktoken` (cl100k_base or o200k_base) for production
 * accuracy. The wasm module adds ~3 MB to the bundle so it should be loaded
 * lazily and only in server contexts.
 */
export function countTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
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
  return Math.ceil((tokens / 1_000_000) * perMTokensRate);
}
