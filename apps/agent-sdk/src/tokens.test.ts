/**
 * Tests for tokens.ts — countTokens + computeCostLamports.
 *
 * Expected status:
 *   GREEN — basic sanity checks (non-zero, non-negative, empty-string edge case)
 *   RED   — 20% BPE accuracy tests (heuristic diverges for short/special strings)
 */

import { describe, expect, it } from "vitest";
import { computeCostLamports, countTokens } from "./tokens.js";

// ---------------------------------------------------------------------------
// countTokens — sanity / always-green
// ---------------------------------------------------------------------------

describe("countTokens — sanity", () => {
  it("returns 0 for an empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("returns a positive integer for any non-empty string", () => {
    expect(countTokens("hello")).toBeGreaterThan(0);
    expect(Number.isInteger(countTokens("hello"))).toBe(true);
  });

  it("never returns a negative number", () => {
    for (const s of ["", "a", "  ", "\n\n\n", "x".repeat(1000)]) {
      expect(countTokens(s)).toBeGreaterThanOrEqual(0);
    }
  });

  it("longer strings produce more tokens than shorter strings", () => {
    const short = countTokens("hi");
    const long = countTokens("hi".repeat(100));
    expect(long).toBeGreaterThan(short);
  });

  it("is deterministic — same string always returns same count", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    expect(countTokens(text)).toBe(countTokens(text));
  });

  it("returns an integer (ceil rounding)", () => {
    // With CHARS_PER_TOKEN=4, "abc" (3 chars) → ceil(3/4)=1
    expect(countTokens("abc")).toBe(1);
    // "abcd" (4 chars) → ceil(4/4)=1
    expect(countTokens("abcd")).toBe(1);
    // "abcde" (5 chars) → ceil(5/4)=2
    expect(countTokens("abcde")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// countTokens — heuristic accuracy (RED until tiktoken integration)
// ---------------------------------------------------------------------------

describe("countTokens — BPE approximation accuracy (RED)", () => {
  /**
   * BPE reference counts (cl100k_base tokeniser, measured offline).
   * The 4-chars-per-token heuristic is expected to be within ±20% for English
   * prose but diverges for short strings and code.
   */
  const BPE_SAMPLES: Array<{ text: string; bpeTokens: number }> = [
    { text: "Hello, world!", bpeTokens: 4 },
    { text: "The quick brown fox jumps over the lazy dog.", bpeTokens: 10 },
    { text: "function add(a, b) { return a + b; }", bpeTokens: 14 },
    { text: "import { useState } from 'react';", bpeTokens: 11 },
    {
      text: "CloudAGI is an open marketplace for AI agents with cryptographic receipts.",
      bpeTokens: 14,
    },
    { text: "a", bpeTokens: 1 },
    { text: "   ", bpeTokens: 1 }, // spaces tokenise as 1
    {
      text: "In software engineering, a design pattern is a general repeatable solution to a commonly occurring problem in software design.",
      bpeTokens: 25,
    },
  ];

  for (const { text, bpeTokens } of BPE_SAMPLES) {
    it(`is within ±20% of BPE count for: "${text.slice(0, 40)}..."`, () => {
      const estimated = countTokens(text);
      const lower = Math.floor(bpeTokens * 0.8);
      const upper = Math.ceil(bpeTokens * 1.2);
      // RED: heuristic will fail for short strings (e.g. "a" → heuristic=1, BPE=1 passes,
      // but "Hello, world!" → heuristic=ceil(13/4)=4, BPE=4, may pass coincidentally).
      // Failures expected for strings where heuristic diverges significantly.
      expect(estimated).toBeGreaterThanOrEqual(lower);
      expect(estimated).toBeLessThanOrEqual(upper);
    });
  }

  it("estimates within 20% across a corpus of ~20 sentences", () => {
    // RED: systematic accuracy test across a mini-corpus.
    const corpus = [
      { text: "Summarise the following document.", bpe: 7 },
      { text: "What is the capital of France?", bpe: 7 },
      { text: "Please translate this sentence to Spanish.", bpe: 8 },
      { text: "Write a Python function to reverse a string.", bpe: 9 },
      { text: "Explain quantum entanglement in simple terms.", bpe: 8 },
      { text: "const x = 42;", bpe: 5 },
      { text: "SELECT * FROM users WHERE id = 1;", bpe: 11 },
      { text: "npm install --save-dev typescript", bpe: 7 },
      { text: "git commit -m 'fix: handle null pointer'", bpe: 11 },
      { text: "docker run -p 3000:3000 my-image", bpe: 10 },
      { text: "The agent returned a malformed response.", bpe: 8 },
      { text: "Receipt hash mismatch detected.", bpe: 6 },
      { text: "Lamport cost exceeds budget cap.", bpe: 7 },
      { text: "Retrying after 402 Payment Required.", bpe: 8 },
      { text: "Solana transaction confirmed in 400ms.", bpe: 8 },
      { text: "Error: wallet keypair must be 64 bytes.", bpe: 9 },
      { text: "Agent registration succeeded.", bpe: 5 },
      { text: "Invoke completed with 1024 output tokens.", bpe: 9 },
      { text: "Skill tag must be a kebab-case slug.", bpe: 9 },
      { text: "perMTokensIn must be a non-negative integer.", bpe: 10 },
    ];

    let withinBound = 0;
    for (const { text, bpe } of corpus) {
      const est = countTokens(text);
      const lower = Math.floor(bpe * 0.8);
      const upper = Math.ceil(bpe * 1.2);
      if (est >= lower && est <= upper) withinBound++;
    }
    const pct = withinBound / corpus.length;
    // RED: require at least 70% of samples within 20%; heuristic may not meet this.
    expect(pct).toBeGreaterThanOrEqual(0.7);
  });
});

// ---------------------------------------------------------------------------
// computeCostLamports
// ---------------------------------------------------------------------------

describe("computeCostLamports", () => {
  it("returns 0 for 0 tokens regardless of rate", () => {
    expect(computeCostLamports(0, 1_000_000)).toBe(0);
    expect(computeCostLamports(0, 0)).toBe(0);
  });

  it("returns 0 for 0 rate regardless of token count", () => {
    expect(computeCostLamports(1_000_000, 0)).toBe(0);
  });

  it("returns the rate exactly for exactly 1M tokens", () => {
    expect(computeCostLamports(1_000_000, 2000)).toBe(2000);
  });

  it("rounds up fractional lamport costs (ceil)", () => {
    // 1 token at 1000 lamports/M = 0.001 lamports → ceil = 1
    expect(computeCostLamports(1, 1000)).toBe(1);
  });

  it("scales linearly with token count", () => {
    const rate = 5000;
    const cost1M = computeCostLamports(1_000_000, rate);
    const cost2M = computeCostLamports(2_000_000, rate);
    expect(cost2M).toBe(cost1M * 2);
  });

  it("returns a non-negative integer", () => {
    const cost = computeCostLamports(42, 1234);
    expect(cost).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(cost)).toBe(true);
  });

  it("handles very large token counts without overflow", () => {
    // 10 billion tokens at 1 lamport/M = 10_000 lamports
    const cost = computeCostLamports(10_000_000_000, 1);
    expect(cost).toBe(10_000);
  });
});
