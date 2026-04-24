/**
 * Tests for hashes.ts — hashPrompt + hashOutput.
 *
 * These tests should be GREEN because hashes.ts is fully implemented.
 * They serve as a baseline / regression guard for the rest of the suite.
 */

import { describe, expect, it } from "vitest";
import { hashOutput, hashPrompt } from "./hashes.js";

// ---------------------------------------------------------------------------
// hashOutput
// ---------------------------------------------------------------------------

describe("hashOutput", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const h = await hashOutput("Hello, world!");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always yields same hash", async () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const h1 = await hashOutput(text);
    const h2 = await hashOutput(text);
    expect(h1).toBe(h2);
  });

  it("produces the correct SHA-256 for a known input", async () => {
    // echo -n "abc" | sha256sum
    // → ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const h = await hashOutput("abc");
    expect(h).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashOutput("foo");
    const h2 = await hashOutput("bar");
    expect(h1).not.toBe(h2);
  });

  it("handles empty string — known SHA-256 of empty bytes", async () => {
    const h = await hashOutput("");
    expect(h).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("handles unicode input without throwing", async () => {
    const h = await hashOutput("こんにちは");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is sensitive to single-character differences", async () => {
    const h1 = await hashOutput("aaa");
    const h2 = await hashOutput("aab");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// hashPrompt
// ---------------------------------------------------------------------------

describe("hashPrompt", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const h = await hashPrompt("Summarise this", { model: "stub" });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same prompt + params yields same hash", async () => {
    const h1 = await hashPrompt("My prompt", { a: 1, b: "x" });
    const h2 = await hashPrompt("My prompt", { a: 1, b: "x" });
    expect(h1).toBe(h2);
  });

  it("is order-independent — params key order does not affect hash", async () => {
    const h1 = await hashPrompt("test", { z: 3, a: 1, m: 2 });
    const h2 = await hashPrompt("test", { a: 1, m: 2, z: 3 });
    const h3 = await hashPrompt("test", { m: 2, z: 3, a: 1 });
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it("differs when prompt changes but params are the same", async () => {
    const h1 = await hashPrompt("Prompt A", { x: 1 });
    const h2 = await hashPrompt("Prompt B", { x: 1 });
    expect(h1).not.toBe(h2);
  });

  it("differs when params change but prompt is the same", async () => {
    const h1 = await hashPrompt("Same prompt", { temp: 0.5 });
    const h2 = await hashPrompt("Same prompt", { temp: 0.9 });
    expect(h1).not.toBe(h2);
  });

  it("handles empty params object", async () => {
    const h = await hashPrompt("hello", {});
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles nested params with key-order independence", async () => {
    const h1 = await hashPrompt("p", { nested: { b: 2, a: 1 }, top: "val" });
    const h2 = await hashPrompt("p", { top: "val", nested: { a: 1, b: 2 } });
    expect(h1).toBe(h2);
  });

  it("produces a different hash from hashOutput for the same string", async () => {
    const text = "hello";
    const hOut = await hashOutput(text);
    const hPrompt = await hashPrompt(text, {});
    // canonical prefix differs so hashes must differ
    expect(hOut).not.toBe(hPrompt);
  });
});
