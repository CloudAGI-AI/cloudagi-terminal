/**
 * Hashing helpers for the CloudAGI Agent SDK.
 *
 * Uses the Web Crypto `SubtleCrypto` API (SHA-256) which is available
 * natively in Node >= 18 and Bun without any external dependencies.
 *
 * All functions are fully implemented — no stubs or TODOs.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Encode a string to a UTF-8 Uint8Array.
 * Works in both Node and browser/Bun environments.
 */
function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/**
 * Convert an ArrayBuffer of SHA-256 digest bytes to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute a SHA-256 digest of arbitrary bytes and return the hex string.
 * Uses `globalThis.crypto.subtle` which is available in Node 20+, Bun, and
 * all modern browsers.
 */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const buffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    data as BufferSource,
  );
  return bufferToHex(buffer);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic SHA-256 hex hash of a prompt combined with its
 * invocation parameters. Used for request deduplication and tamper-detection.
 *
 * The canonical serialisation is:
 *   `"prompt:" + prompt + "\nparams:" + JSON.stringify(params, sortedKeys)`
 *
 * Params keys are sorted before serialisation so that object property order
 * does not affect the resulting hash.
 *
 * @param prompt - The raw prompt string sent by the buyer.
 * @param params - Arbitrary invocation parameters (must be JSON-serialisable).
 * @returns A promise resolving to the lowercase SHA-256 hex digest.
 *
 * @example
 * ```ts
 * const hash = await hashPrompt("Summarise this", { model: "stub" });
 * // → "3f2a..." (64-char hex string)
 * ```
 */
export async function hashPrompt(prompt: string, params: object): Promise<string> {
  const sortedParams = JSON.stringify(params, sortObjectKeys);
  const canonical = `prompt:${prompt}\nparams:${sortedParams}`;
  return sha256Hex(encode(canonical));
}

/**
 * Compute a SHA-256 hex hash of an agent's output text.
 * Used by buyers to verify the integrity of invocation results.
 *
 * @param output - The agent's raw output string.
 * @returns A promise resolving to the lowercase SHA-256 hex digest.
 *
 * @example
 * ```ts
 * const hash = await hashOutput("Hello from the agent");
 * // → "a1b2..." (64-char hex string)
 * ```
 */
export async function hashOutput(output: string): Promise<string> {
  return sha256Hex(encode(output));
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/**
 * JSON replacer that sorts object keys alphabetically, ensuring deterministic
 * serialisation regardless of the insertion order of properties.
 *
 * @param _key   - The property key (unused here; required by JSON.stringify).
 * @param value  - The property value at this position in the object graph.
 */
function sortObjectKeys(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}
