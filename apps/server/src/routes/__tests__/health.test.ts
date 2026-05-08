/**
 * Route tests — GET /health
 *
 * RED PHASE: expand the smoke test from index.test.ts with full shape assertions.
 * Most pass against the stub; uptimeMs type/range test is new documentation.
 */

import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { get } from "../../test-utils/fetch-helper.js";

describe("GET /health", () => {
  it("should return HTTP 200", async () => {
    const res = await get(app, "/health");
    expect(res.status).toBe(200);
  });

  it("should return content-type application/json", async () => {
    const res = await get(app, "/health");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("should return status field equal to 'ok'", async () => {
    const res = await get<{ status: string; uptimeMs: number }>(app, "/health");
    expect(res.body.status).toBe("ok");
  });

  it("should return uptimeMs as a non-negative number", async () => {
    const res = await get<{ status: string; uptimeMs: number }>(app, "/health");
    expect(typeof res.body.uptimeMs).toBe("number");
    expect(res.body.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return uptimeMs that increases between two calls", async () => {
    const first = await get<{ uptimeMs: number }>(app, "/health");
    await new Promise((r) => setTimeout(r, 5));
    const second = await get<{ uptimeMs: number }>(app, "/health");
    expect(second.body.uptimeMs).toBeGreaterThanOrEqual(first.body.uptimeMs);
  });

  // RED: SPEC §7.1 requires a version field in the health response
  it("should return a version field matching the package version", async () => {
    const res = await get<{ status: string; uptimeMs: number; version: string }>(app, "/health");
    expect(res.body.version).toBeDefined();
    expect(typeof res.body.version).toBe("string");
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  // RED: SPEC requires a commit/build hash for observability
  it("should return a build field with deployment metadata", async () => {
    const res = await get<{ build?: unknown }>(app, "/health");
    expect(res.body.build).toBeDefined();
  });
});
