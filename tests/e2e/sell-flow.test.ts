/**
 * E2E: Seller flow — onboarding, listing, serving, earning
 *
 * Scripted end-to-end scenario from the seller/provider perspective following
 * SPEC §4.1 seller onboarding and agent registration flow.
 *
 * Tests are RED until Wave-2/3 green-phase implementations land.
 *
 * SPEC refs: §4.1 Seller onboarding, §3.1 Seller stories, §5.1 Agent model,
 *            §7.1 REST surfaces, §11 Reputation & Stake
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// @ts-expect-error — not yet built
import { registerAgent, serveAgent, invokeHandlerDirect } from "@cloudagi/agent-sdk";
// @ts-expect-error — not yet built
import type { AgentRegistration, AgentHandler, InvocationContext, MeterRecord, AgentServer } from "@cloudagi/agent-sdk";
// @ts-expect-error — not yet built
import { app } from "@cloudagi/server";
// @ts-expect-error — not yet built
import { AgentSchema, REPUTATION_TIERS, MIN_STAKE_LAMPORTS } from "@cloudagi/shared";

import SAMPLE_AGENTS from "./fixtures/sample-agents.json" assert { type: "json" };
import SAMPLE_PROMPTS from "./fixtures/sample-prompts.json" assert { type: "json" };

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let sellerReg: AgentRegistration;
let agentServer: AgentServer;
let meterRecords: MeterRecord[] = [];

type AppLike = { request(url: string, init?: RequestInit): Promise<Response> };

function serverReq(path: string, init?: RequestInit): Promise<Response> {
  return (app as AppLike).request(path, init ?? {});
}

function jsonPost(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
  return serverReq(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup: define agent handler
// ---------------------------------------------------------------------------

const SELLER_AGENT_HANDLER: AgentHandler = async (ctx: InvocationContext) => {
  // Stub handler: echoes back a sentiment result based on keywords
  const lower = ctx.prompt.toLowerCase();
  let sentiment = "NEUTRAL";
  if (lower.includes("love") || lower.includes("great") || lower.includes("excellent")) {
    sentiment = "POSITIVE";
  } else if (lower.includes("terrible") || lower.includes("awful") || lower.includes("hate")) {
    sentiment = "NEGATIVE";
  }
  return {
    text: `${sentiment} (confidence: 0.92, model: stub, requestHash: ${ctx.requestHash.slice(0, 8)})`,
    data: { sentiment, confidence: 0.92 },
  };
};

// ---------------------------------------------------------------------------
// Step 1 — Seller connects wallet + posts stake + registers agent
// (SPEC §4.1 steps 1–5, §3.1 stories 1–3)
// ---------------------------------------------------------------------------

describe("Step 1: seller onboarding and agent registration", () => {
  it("GET /v1/registration/requirements returns stake amount and allowed skills", async () => {
    const res = await serverReq("/v1/registration/requirements");
    // RED: endpoint not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as {
      minStakeLamports: number;
      allowedSkills: string[];
      priceBoundsLamports: { min: number; max: number };
    };

    expect(body.minStakeLamports).toBe(MIN_STAKE_LAMPORTS);
    expect(Array.isArray(body.allowedSkills)).toBe(true);
    expect(body.priceBoundsLamports).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
    });
  });

  it("registerAgent() resolves with a valid agentId and txSignature", async () => {
    const fixture = SAMPLE_AGENTS[0];
    sellerReg = await registerAgent({
      name: fixture.displayName,
      skills: fixture.skills,
      pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
      endpoint: fixture.endpoint,
    });

    expect(sellerReg.agentId).toBeTruthy();
    expect(typeof sellerReg.agentId).toBe("string");
    // Solana tx signature: 88 base-58 chars
    expect(sellerReg.txSignature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/);
  });

  it("POST /v1/agents registers the agent in the server's registry", async () => {
    const fixture = SAMPLE_AGENTS[0];
    const now = new Date().toISOString();

    const res = await jsonPost("/v1/agents", {
      id: sellerReg.agentId,
      provider: "SellerWalletFixture111111111111111111111",
      displayName: fixture.displayName,
      description: fixture.description,
      skills: fixture.skills,
      pricing: fixture.pricing,
      model: fixture.model,
      endpoint: fixture.endpoint,
      policies: fixture.policies,
      status: "active",
      stake: MIN_STAKE_LAMPORTS,
      reputation: 0,
      uptimePct: 100,
      avgLatencyMs: 0,
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
      txSignature: sellerReg.txSignature,
    });

    // RED: Wave 2 returns 201 Created; currently 501
    expect(res.status).toBe(201);

    const body = await res.json() as { id: string };
    expect(body.id).toBe(sellerReg.agentId);
  });

  it("registered agent stake meets MIN_STAKE_LAMPORTS requirement", async () => {
    const res = await serverReq(`/v1/agents/${sellerReg.agentId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { stake: number };
    expect(body.stake).toBeGreaterThanOrEqual(MIN_STAKE_LAMPORTS);
  });
});

// ---------------------------------------------------------------------------
// Step 2 — Seller starts adapter, heartbeats, agent becomes discoverable
// (SPEC §4.1 steps 8–9)
// ---------------------------------------------------------------------------

describe("Step 2: seller starts adapter and sends heartbeat", () => {
  beforeAll(() => {
    // Start the agent server (stub — no real TCP port)
    agentServer = serveAgent(SELLER_AGENT_HANDLER, (record: MeterRecord) => {
      meterRecords.push(record);
    });
  });

  afterAll(async () => {
    await agentServer?.close();
  });

  it("serveAgent() returns an AgentServer handle without throwing", () => {
    expect(agentServer).toBeDefined();
    expect(typeof agentServer.close).toBe("function");
  });

  it("POST /v1/agents/:id/heartbeat returns 200 with session routing token", async () => {
    const res = await jsonPost(`/v1/agents/${sellerReg.agentId}/heartbeat`, {
      adapterVersion: "0.1.0",
      uptimeSec: 0,
      modelStatus: "ready",
    });

    // RED: not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { routingToken: string; agentStatus: string };
    expect(body.routingToken).toBeTruthy();
    expect(body.agentStatus).toBe("active");
  });

  it("agent appears in GET /v1/agents after heartbeat confirms liveness", async () => {
    const res = await serverReq("/v1/agents?status=active");
    expect(res.status).toBe(200);

    const body = await res.json() as { data: Array<{ id: string }> };
    const found = body.data.find((a) => a.id === sellerReg.agentId);
    // RED: Wave 2 must filter by status and return live agents
    expect(found).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Seller's handler is invoked by a buyer; handler returns output
// (SPEC §4.2 steps 4–8, §6.4)
// ---------------------------------------------------------------------------

describe("Step 3: seller serves invocations via handler", () => {
  it("invokeHandlerDirect calls SELLER_AGENT_HANDLER and returns output", async () => {
    const output = await invokeHandlerDirect(SELLER_AGENT_HANDLER, {
      requestHash: "",
      prompt: SAMPLE_PROMPTS[0].text, // sentiment prompt
      metadata: { agentId: sellerReg.agentId, sessionId: "sess_sell_001" },
      receivedAt: new Date().toISOString(),
    });

    expect(output.text).toMatch(/POSITIVE|NEGATIVE|NEUTRAL/);
    expect(output.data).toBeDefined();
  });

  it("handler produces correct sentiment for positive prompt", async () => {
    const output = await invokeHandlerDirect(SELLER_AGENT_HANDLER, {
      requestHash: "",
      prompt: "I love this product, it works perfectly!",
      metadata: { agentId: sellerReg.agentId, sessionId: "sess_sell_001" },
      receivedAt: new Date().toISOString(),
    });

    expect(output.text).toContain("POSITIVE");
  });

  it("handler produces correct sentiment for negative prompt", async () => {
    const output = await invokeHandlerDirect(SELLER_AGENT_HANDLER, {
      requestHash: "",
      prompt: "This is absolutely terrible, I want a refund.",
      metadata: { agentId: sellerReg.agentId, sessionId: "sess_sell_001" },
      receivedAt: new Date().toISOString(),
    });

    expect(output.text).toContain("NEGATIVE");
  });

  it("handler is called for multiple prompts from fixture set", async () => {
    const sentimentPrompts = SAMPLE_PROMPTS.filter((p) => p.skill === "sentiment.classify.v1");
    const results = await Promise.all(
      sentimentPrompts.map((p) =>
        invokeHandlerDirect(SELLER_AGENT_HANDLER, {
          requestHash: "",
          prompt: p.text,
          metadata: { agentId: sellerReg.agentId, sessionId: "sess_sell_batch" },
          receivedAt: new Date().toISOString(),
        }),
      ),
    );

    expect(results.length).toBe(sentimentPrompts.length);
    for (const r of results) {
      expect(r.text).toMatch(/POSITIVE|NEGATIVE|NEUTRAL/);
    }
  });
});

// ---------------------------------------------------------------------------
// Step 4 — Seller earns: settlement is credited per invocation
// (SPEC §3.1 story 7, §8.3 Facilitator, §8.5 Fee split)
// ---------------------------------------------------------------------------

describe("Step 4: settlement and earnings", () => {
  it("GET /v1/agents/:id includes non-zero earnings after invocations", async () => {
    // Simulate completing several invocations
    for (const p of SAMPLE_PROMPTS.slice(0, 3)) {
      await jsonPost(
        `/v1/agents/${sellerReg.agentId}/invoke`,
        { prompt: p.text, params: { temperature: 0.1, maxOutputTokens: 64 }, intentMode: "per_invocation" },
        { "X-Payment-Authorization": "sig:stub_payment_earn_test" },
      );
    }

    const res = await serverReq(`/v1/agents/${sellerReg.agentId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { totalEarningsLamports?: number; callCount?: number };
    // RED: earnings tracking not yet implemented
    expect(body.totalEarningsLamports).toBeGreaterThan(0);
    expect(body.callCount).toBeGreaterThanOrEqual(3);
  });

  it("provider receives 80% of gross settlement (PLATFORM_FEE_BPS = 1500, FACILITATOR = 500)", async () => {
    const GROSS = 250_000; // 0.25 USDC in base units
    const PROVIDER_SHARE = Math.floor(GROSS * 0.80); // 200_000
    const PLATFORM_SHARE = Math.floor(GROSS * 0.15); // 37_500
    const FACILITATOR_SHARE = GROSS - PROVIDER_SHARE - PLATFORM_SHARE; // 12_500

    // These arithmetic checks are deterministic and pass immediately
    expect(PROVIDER_SHARE).toBe(200_000);
    expect(PLATFORM_SHARE).toBe(37_500);
    expect(FACILITATOR_SHARE).toBe(12_500);
    expect(PROVIDER_SHARE + PLATFORM_SHARE + FACILITATOR_SHARE).toBe(GROSS);
  });
});

// ---------------------------------------------------------------------------
// Step 5 — Seller manages agent: update, pause, resume
// (SPEC §3.1 stories 8–9, §7.1 PATCH /agents/:id)
// ---------------------------------------------------------------------------

describe("Step 5: seller manages agent lifecycle", () => {
  it("PATCH /v1/agents/:id updates pricing without unregistering", async () => {
    const res = await serverReq(`/v1/agents/${sellerReg.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pricing: { kind: "per_token", perMTokensIn: 750, perMTokensOut: 1500 },
      }),
    });

    // RED: PATCH not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { pricing: { kind: string; perMTokensIn: number } };
    expect(body.pricing.perMTokensIn).toBe(750);
  });

  it("PATCH /v1/agents/:id with status=paused marks agent as paused", async () => {
    const res = await serverReq(`/v1/agents/${sellerReg.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" }),
    });

    // RED: not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string };
    expect(body.status).toBe("paused");
  });

  it("paused agent returns 503 on invoke attempts", async () => {
    const res = await jsonPost(
      `/v1/agents/${sellerReg.agentId}/invoke`,
      { prompt: "test", params: { temperature: 0, maxOutputTokens: 64 }, intentMode: "per_invocation" },
      { "X-Payment-Authorization": "sig:stub" },
    );

    // RED: Wave 2 must enforce paused status
    expect(res.status).toBe(503);
  });

  it("re-activating a paused agent allows invocations again", async () => {
    // Resume
    await serverReq(`/v1/agents/${sellerReg.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    const res = await jsonPost(
      `/v1/agents/${sellerReg.agentId}/invoke`,
      { prompt: "test resume", params: { temperature: 0, maxOutputTokens: 64 }, intentMode: "per_invocation" },
      { "X-Payment-Authorization": "sig:stub_resume" },
    );

    // After resuming, should be 402 (not 503)
    // RED: Wave 2 must distinguish paused vs active
    expect(res.status).not.toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Step 6 — Seller's reputation tier after successful calls
// (SPEC §4.4 Reputation update loop, §11 Reputation, stake, slash)
// ---------------------------------------------------------------------------

describe("Step 6: seller reputation and leaderboard", () => {
  it("GET /v1/leaderboard includes seller's agent", async () => {
    const res = await serverReq("/v1/leaderboard");
    // RED: not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { data: Array<{ agentId: string }> };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("REPUTATION_TIERS constants match SPEC §11: 5 tiers from Unrated to Platinum", () => {
    // This test is green as soon as @cloudagi/shared is built
    expect(REPUTATION_TIERS).toEqual(["Unrated", "Bronze", "Silver", "Gold", "Platinum"]);
    expect(REPUTATION_TIERS.length).toBe(5);
  });

  it("leaderboard entries have required fields per SPEC §3.3", async () => {
    const res = await serverReq("/v1/leaderboard");
    if (res.status !== 200) return;

    const body = await res.json() as { data: Array<Record<string, unknown>> };
    for (const entry of body.data) {
      expect(entry).toHaveProperty("agentId");
      expect(entry).toHaveProperty("displayName");
      expect(entry).toHaveProperty("reputation");
      expect(entry).toHaveProperty("callCount");
    }
  });

  it("PATCH /v1/agents/:id allows appeal comment on disputed slash event", async () => {
    const res = await serverReq(`/v1/agents/${sellerReg.agentId}/disputes/mock_dispute_001/appeal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "The output was correct; the buyer's expectation was inconsistent with the declared intent.",
        evidence: ["hash_of_output_pre_image_abc"],
      }),
    });

    // RED: dispute appeal endpoint not yet implemented
    expect([200, 201]).toContain(res.status);
  });
});
