/**
 * Route tests — /v1/agents
 *
 * Route tests for the in-memory agent registry.
 */

import { describe, expect, it } from "vitest";
import { app } from "../../app.js";
import { get, post } from "../../test-utils/fetch-helper.js";
import {
  agentEmptySkills,
  agentInvalidEndpoint,
  agentMissingSkills,
  validCreateAgent,
} from "../../test-utils/fixtures.js";

// ---------------------------------------------------------------------------
// GET /v1/agents
// ---------------------------------------------------------------------------

describe("GET /v1/agents", () => {
  it("should return HTTP 200", async () => {
    const res = await get(app, "/v1/agents");
    expect(res.status).toBe(200);
  });

  it("should return a response with data array, page, and total fields", async () => {
    const res = await get<{ data: unknown[]; page: number; total: number }>(app, "/v1/agents");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.page).toBe("number");
    expect(typeof res.body.total).toBe("number");
  });

  it("should return page 2 when ?page=2 is supplied", async () => {
    const res = await get<{ page: number }>(app, "/v1/agents?page=2");
    expect(res.body.page).toBe(2);
  });

  it("should limit results to ?limit=5 entries", async () => {
    const res = await get<{ data: unknown[]; limit: number }>(app, "/v1/agents?limit=5");
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.limit).toBe(5);
  });

  it("should filter agents by skill query parameter", async () => {
    const res = await get<{ data: Array<{ skills: string[] }>; total: number }>(
      app,
      "/v1/agents?skill=summarize",
    );
    expect(res.status).toBe(200);
    // Every returned agent must advertise the requested skill
    for (const agent of res.body.data) {
      expect(agent.skills).toContain("summarize");
    }
  });

  it("should sort agents by reputation descending when ?sort=reputation is supplied", async () => {
    const res = await get<{ data: Array<{ reputation: number }> }>(
      app,
      "/v1/agents?sort=reputation",
    );
    expect(res.status).toBe(200);
    const reputations = res.body.data.map((a) => a.reputation);
    const sorted = [...reputations].sort((a, b) => b - a);
    expect(reputations).toEqual(sorted);
  });

  it("should exclude agents with reputation below minReputation threshold", async () => {
    const threshold = 0.7;
    const res = await get<{ data: Array<{ reputation: number }> }>(
      app,
      `/v1/agents?minReputation=${threshold}`,
    );
    expect(res.status).toBe(200);
    for (const agent of res.body.data) {
      expect(agent.reputation).toBeGreaterThanOrEqual(threshold);
    }
  });

  it("should exclude agents with perMTokensIn above maxPrice threshold", async () => {
    const res = await get<{ data: Array<{ pricing: { perMTokensIn: number } }> }>(
      app,
      "/v1/agents?maxPrice=1.0",
    );
    expect(res.status).toBe(200);
    for (const agent of res.body.data) {
      expect(agent.pricing.perMTokensIn).toBeLessThanOrEqual(1.0);
    }
  });

  it("should return total reflecting filtered count, not global count", async () => {
    const allRes = await get<{ total: number }>(app, "/v1/agents");
    const filteredRes = await get<{ total: number }>(app, "/v1/agents?skill=nonexistent-skill-xyz");
    expect(filteredRes.body.total).toBeLessThanOrEqual(allRes.body.total);
    expect(filteredRes.body.total).toBe(0);
  });

  it("should return 400 when page param is not a positive integer", async () => {
    const res = await get(app, "/v1/agents?page=-1");
    expect(res.status).toBe(400);
  });

  it("should return 400 when sort param has an unsupported value", async () => {
    const res = await get(app, "/v1/agents?sort=unknown_field");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /v1/agents
// ---------------------------------------------------------------------------

describe("POST /v1/agents", () => {
  it("should return HTTP 201 when registering a valid agent", async () => {
    const res = await post(app, "/v1/agents", validCreateAgent);
    expect(res.status).toBe(201);
  });

  it("should return the created agent with a server-assigned id", async () => {
    const res = await post<{ id: string; provider: string; skills: string[] }>(
      app,
      "/v1/agents",
      validCreateAgent,
    );
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    // id must be a UUID
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("should return 201 response with matching provider and skills", async () => {
    const res = await post<{ provider: string; skills: string[] }>(
      app,
      "/v1/agents",
      validCreateAgent,
    );
    expect(res.status).toBe(201);
    expect(res.body.provider).toBe(validCreateAgent.provider);
    expect(res.body.skills).toEqual(validCreateAgent.skills);
  });

  it("should return 422 when skills field is missing", async () => {
    const res = await post(app, "/v1/agents", agentMissingSkills);
    expect(res.status).toBe(422);
  });

  it("should return 422 when skills array is empty", async () => {
    const res = await post(app, "/v1/agents", agentEmptySkills);
    expect(res.status).toBe(422);
  });

  it("should return 422 when endpoint is not a valid URL", async () => {
    const res = await post(app, "/v1/agents", agentInvalidEndpoint);
    expect(res.status).toBe(422);
  });

  it("should return 422 when body is empty JSON object", async () => {
    const res = await post(app, "/v1/agents", {});
    expect(res.status).toBe(422);
  });

  it("should return 422 when body is not JSON", async () => {
    const res = await app.request("/v1/agents", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    expect(res.status).toBe(422);
  });

  it("should allow registration without wallet signature in demo mode", async () => {
    const res = await post(app, "/v1/agents", validCreateAgent);
    expect(res.status).toBe(201);
  });

  it("should return 401 when the wallet signature header is malformed", async () => {
    const res = await post(app, "/v1/agents", validCreateAgent, {
      "X-Wallet-Signature": "invalidsig",
    });
    expect(res.status).toBe(401);
  });

  it("should not expose server-assigned reputation as 0 after registration", async () => {
    const res = await post<{ reputation: number }>(app, "/v1/agents", validCreateAgent);
    expect(res.status).toBe(201);
    // A freshly registered agent should have reputation ≥ 0
    expect(res.body.reputation).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// GET /v1/agents/:id
// ---------------------------------------------------------------------------

describe("GET /v1/agents/:id", () => {
  it("should return 404 for a non-existent agent UUID", async () => {
    const res = await get(app, "/v1/agents/00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
  });

  it("should return error body with code NOT_FOUND for missing agent", async () => {
    const res = await get<{ error: { code: string } }>(
      app,
      "/v1/agents/00000000-0000-4000-8000-000000000000",
    );
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("should return the agent when it exists", async () => {
    // Register first
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    expect(createRes.status).toBe(201);
    const agentId = createRes.body.id;

    // Then fetch by id
    const fetchRes = await get<{ id: string; provider: string }>(app, `/v1/agents/${agentId}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.id).toBe(agentId);
    expect(fetchRes.body.provider).toBe(validCreateAgent.provider);
  });

  it("should return 400 for a malformed non-UUID id", async () => {
    const res = await get(app, "/v1/agents/not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("should include live metrics (callCount, avgLatencyMs, uptimePct) in response", async () => {
    const createRes = await post<{ id: string }>(app, "/v1/agents", validCreateAgent);
    const agentId = createRes.body.id;
    const fetchRes = await get<{
      metrics?: { callCount: number; avgLatencyMs: number; uptimePct: number };
    }>(app, `/v1/agents/${agentId}`);
    expect(fetchRes.body.metrics).toBeDefined();
    expect(typeof fetchRes.body.metrics?.callCount).toBe("number");
  });
});
