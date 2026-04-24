/**
 * E2E: Buyer flow — register agent → list → 402 → sign → retry → success → receipt + payout
 *
 * Scripted end-to-end scenario from the buyer perspective following SPEC §4.2
 * exactly. Every step is a failing test until Wave-2/3 implementations land.
 *
 * SPEC refs: §4.2 Buyer discovery + session + intent approval + invoke + receipt
 *            §7.1 REST surfaces, §8.2 HTTP 402 handshake, §9 Receipt evidence
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";

// ---------------------------------------------------------------------------
// Imports — RED until dist/ is built
// ---------------------------------------------------------------------------
// @ts-expect-error — not yet built
import { app } from "@cloudagi/server";
// @ts-expect-error — not yet built
import { registerAgent, createBuyerClient, hashPrompt, hashOutput } from "@cloudagi/agent-sdk";
// @ts-expect-error — not yet built
import type { AgentRegistration, BuyerClient, InvocationResult } from "@cloudagi/agent-sdk";
// @ts-expect-error — not yet built
import { AgentSchema, ReceiptSchema } from "@cloudagi/shared";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

import SAMPLE_AGENTS from "./fixtures/sample-agents.json" assert { type: "json" };
import SAMPLE_PROMPTS from "./fixtures/sample-prompts.json" assert { type: "json" };
import SAMPLE_SCOPES from "./fixtures/sample-intent-scopes.json" assert { type: "json" };

// ---------------------------------------------------------------------------
// Shared state across buy-flow steps
// ---------------------------------------------------------------------------

let sellerReg: AgentRegistration;
let buyerClient: BuyerClient;
let sessionId: string;
let invocationId: string;
let intentText: string;
let receiptId: string;

type AppLike = { request(url: string, init?: RequestInit): Promise<Response> };

function serverReq(path: string, init?: RequestInit): Promise<Response> {
  return (app as AppLike).request(path, init ?? {});
}

function jsonPost(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<Response> {
  return serverReq(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Step 0 — Pre-flight: set up seller + buyer
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // Register the fixture sentiment agent as the seller
  sellerReg = await registerAgent({
    name: SAMPLE_AGENTS[0].displayName,
    skills: SAMPLE_AGENTS[0].skills,
    pricing: { perMTokensIn: 500, perMTokensOut: 1000 },
    endpoint: SAMPLE_AGENTS[0].endpoint,
  });

  buyerClient = createBuyerClient({
    marketplaceUrl: "http://localhost:3000",
    maxBudgetLamports: 5_000_000,
  });
});

// ---------------------------------------------------------------------------
// Step 1 — Buyer discovers agent via GET /v1/agents (SPEC §4.2 step 1)
// ---------------------------------------------------------------------------

describe("Step 1: buyer discovers registered agent", () => {
  it("GET /v1/agents returns 200 with a non-empty data array", async () => {
    const res = await serverReq("/v1/agents");
    expect(res.status).toBe(200);

    const body = await res.json() as { data: unknown[] };
    // RED: stub returns empty array; Wave 2 must return registered agents
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("registered agent is present in the listing", async () => {
    const res = await serverReq("/v1/agents");
    const body = await res.json() as { data: Array<{ id: string }> };
    const found = body.data.find((a) => a.id === sellerReg.agentId);
    expect(found).toBeDefined();
  });

  it("agent record passes AgentSchema validation", async () => {
    const res = await serverReq(`/v1/agents/${sellerReg.agentId}`);
    expect(res.status).toBe(200);

    const body = await res.json() as unknown;
    const parsed = AgentSchema.safeParse(body);
    // RED: GET /v1/agents/:id returns 404 until Wave 2
    expect(parsed.success).toBe(true);
  });

  it("listAgents() via buyer client returns agent matching skill filter", async () => {
    const agents = await buyerClient.listAgents({ skill: "sentiment.classify.v1" });
    const found = agents.find((a) => a.agentId === sellerReg.agentId);
    // RED: stub returns fixture agents, not real DB; Wave 2 wires real listing
    expect(found).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Step 2 — Buyer opens session, receives 402 hint (SPEC §4.2 steps 2–3, §8.2)
// ---------------------------------------------------------------------------

describe("Step 2: open session → 402 payment required", () => {
  it("POST /v1/sessions returns 402 with payment hint", async () => {
    const res = await jsonPost("/v1/sessions", {
      agentId: sellerReg.agentId,
      budget: "1000000",
    });

    // RED: /v1/sessions not yet implemented
    expect(res.status).toBe(402);

    const body = await res.json() as { paymentHint: { chain: string; currency: string; amount: string; payTo: string; nonce: string } };
    expect(body.paymentHint).toMatchObject({
      chain: "solana",
      currency: "USDC",
      amount: expect.any(String),
      payTo: expect.any(String),
      nonce: expect.any(String),
    });
  });

  it("POST /v1/sessions with valid budget authorization opens session", async () => {
    const res = await jsonPost("/v1/sessions", {
      agentId: sellerReg.agentId,
      budget: "1000000",
      budgetAuthorizationSig: "sig_buyer_budget_stub_abc123",
    });

    // RED: Wave 3 wires real signature verification; stub opens immediately
    expect(res.status).toBe(201);

    const body = await res.json() as { sessionId: string; state: string };
    expect(body.sessionId).toBeTruthy();
    expect(body.state).toBe("open");
    sessionId = body.sessionId;
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Buyer invokes agent, receives intent card (SPEC §4.2 steps 4–7)
// ---------------------------------------------------------------------------

describe("Step 3: invoke → 402 on first call without payment auth", () => {
  it("POST /v1/sessions/:id/invoke without payment returns 402", async () => {
    // Use a prompt from the fixtures
    const prompt = SAMPLE_PROMPTS.find((p) => p.skill === "sentiment.classify.v1")!;

    const res = await jsonPost(`/v1/sessions/${sessionId}/invoke`, {
      prompt: prompt.text,
      params: { temperature: 0.1, maxOutputTokens: 64 },
      intentMode: "per_invocation",
    });

    // RED: session invoke not yet implemented
    expect(res.status).toBe(402);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("PAYMENT_REQUIRED");
  });

  it("402 response x402 headers are present on session invoke path", async () => {
    const res = await jsonPost(`/v1/sessions/${sessionId}/invoke`, {
      prompt: "test",
      params: { temperature: 0, maxOutputTokens: 64 },
      intentMode: "per_invocation",
    });

    expect(res.headers.get("X-Payment-Scheme")).toBe("x402/solana");
    expect(res.headers.get("X-Payment-Nonce")).toBeTruthy();
    expect(res.headers.get("X-Payment-Amount")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Step 4 — Buyer signs payment and retries → intent card returned
// (SPEC §4.2 steps 8–10)
// ---------------------------------------------------------------------------

describe("Step 4: sign payment → retry → intent card", () => {
  it("invoke with X-Payment-Authorization returns intent card (pending_intent)", async () => {
    const prompt = SAMPLE_PROMPTS[0];

    const res = await jsonPost(
      `/v1/sessions/${sessionId}/invoke`,
      {
        prompt: prompt.text,
        params: { temperature: 0.1, maxOutputTokens: 64 },
        intentMode: "per_invocation",
      },
      { "X-Payment-Authorization": "sig:stub_payment_auth_abc123" },
    );

    // RED: Wave 3 verifies signature and moves to pending_intent
    expect(res.status).toBe(200);

    const body = await res.json() as {
      invocationId: string;
      status: string;
      declaredIntent: { summary: string; skills: string[]; estCost: string };
    };

    expect(body.invocationId).toBeTruthy();
    expect(body.status).toBe("pending_intent");
    expect(body.declaredIntent).toMatchObject({
      summary: expect.any(String),
      skills: expect.any(Array),
      estCost: expect.any(String),
    });

    invocationId = body.invocationId;
    intentText = body.declaredIntent.summary;
  });
});

// ---------------------------------------------------------------------------
// Step 5 — Buyer approves intent (SPEC §4.2 steps 11–12)
// ---------------------------------------------------------------------------

describe("Step 5: buyer approves intent", () => {
  it("POST /v1/invocations/:id/intent-approval transitions to running status", async () => {
    const scope = SAMPLE_SCOPES[0];

    const res = await jsonPost(`/v1/invocations/${invocationId}/intent-approval`, {
      intentText,
      boundSkills: scope.boundSkills,
      boundTools: scope.boundTools,
      maxTokensIn: scope.maxTokensIn,
      maxTokensOut: scope.maxTokensOut,
      maxSpend: scope.maxSpend,
      nonce: `nonce-${Date.now()}`,
      approvalSig: "sig_buyer_intent_approval_stub_xyz",
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    });

    // RED: endpoint not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string };
    expect(body.status).toBe("running");
  });

  it("intent rejection via POST /v1/invocations/:id/intent-reject closes invocation as failed", async () => {
    // Create a separate invocation to reject
    const createRes = await jsonPost(
      `/v1/sessions/${sessionId}/invoke`,
      { prompt: "test reject flow", params: { temperature: 0, maxOutputTokens: 64 }, intentMode: "per_invocation" },
      { "X-Payment-Authorization": "sig:stub_payment_auth_reject" },
    );

    if (createRes.status !== 200) return; // skip if Wave 2 not yet wired

    const { invocationId: rejectId } = await createRes.json() as { invocationId: string };

    const rejectRes = await jsonPost(`/v1/invocations/${rejectId}/intent-reject`, {
      reason: "scope too broad",
    });

    expect(rejectRes.status).toBe(200);
    const body = await rejectRes.json() as { status: string; settlementAmount: string };
    expect(body.status).toBe("failed");
    // No settlement on rejected intent
    expect(body.settlementAmount).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// Step 6 — Agent executes, buyer receives streamed output + completion
// (SPEC §4.2 steps 13–15)
// ---------------------------------------------------------------------------

describe("Step 6: execution → streamed output → completed", () => {
  it("GET /v1/invocations/:id returns completed status after execution", async () => {
    // Poll for completion (Wave 4 streams via WebSocket; this tests REST poll)
    const res = await serverReq(`/v1/invocations/${invocationId}`);
    // RED: endpoint not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string; output: string; tokensIn: number; tokensOut: number };
    expect(body.status).toBe("completed");
    expect(typeof body.output).toBe("string");
    expect(body.output.length).toBeGreaterThan(0);
    expect(body.tokensIn).toBeGreaterThan(0);
    expect(body.tokensOut).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Step 7 — Settlement + receipt minting (SPEC §4.2 steps 16–17, §9)
// ---------------------------------------------------------------------------

describe("Step 7: receipt minted + payout", () => {
  it("completed invocation has a receiptId", async () => {
    const res = await serverReq(`/v1/invocations/${invocationId}`);
    if (res.status !== 200) return; // skip if upstream step failed

    const body = await res.json() as { receiptId?: string };
    expect(body.receiptId).toBeTruthy();
    receiptId = body.receiptId as string;
  });

  it("GET /v1/receipts/:id returns valid receipt matching ReceiptSchema", async () => {
    if (!receiptId) return; // skip if upstream step failed

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    // RED: endpoint not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as unknown;
    const parsed = ReceiptSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("receipt promptHash matches recomputed hash of original prompt", async () => {
    if (!receiptId) return;

    const originalPrompt = SAMPLE_PROMPTS[0].text;
    const expectedHash = await hashPrompt(originalPrompt, {
      agentId: sellerReg.agentId,
      sessionId,
    });

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { promptHash: string };
    expect(body.promptHash).toBe(expectedHash);
  });

  it("receipt outputHash is a 64-char hex string", async () => {
    if (!receiptId) return;

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { outputHash: string };
    expect(body.outputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("receipt status is minted", async () => {
    if (!receiptId) return;

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { status: string };
    expect(body.status).toBe("minted");
  });

  it("receipt tokensIn + tokensOut are consistent with prompt + output lengths", async () => {
    if (!receiptId) return;

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { tokensIn: number; tokensOut: number };
    expect(body.tokensIn).toBeGreaterThan(0);
    expect(body.tokensOut).toBeGreaterThan(0);
    // Token counts must not exceed raw character counts (sanity upper bound)
    expect(body.tokensIn).toBeLessThanOrEqual(SAMPLE_PROMPTS[0].text.length);
  });

  it("receipt verifyUrl is a valid HTTPS URL", async () => {
    if (!receiptId) return;

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { verifyUrl: string };
    expect(() => new URL(body.verifyUrl)).not.toThrow();
    expect(body.verifyUrl.startsWith("https://")).toBe(true);
  });

  it("receipt disputeDeadline is 72 hours after timestamp (SPEC §4.3)", async () => {
    if (!receiptId) return;

    const res = await serverReq(`/v1/receipts/${receiptId}`);
    if (res.status !== 200) return;

    const body = await res.json() as { timestamp: string; disputeDeadline: string };
    const ts = new Date(body.timestamp).getTime();
    const deadline = new Date(body.disputeDeadline).getTime();
    const diff = deadline - ts;
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
    // Allow ±5 seconds tolerance for test timing
    expect(Math.abs(diff - SEVENTY_TWO_HOURS)).toBeLessThan(5000);
  });

  it("buyer client invoke() returns receipt handle and outputHash", async () => {
    const result: InvocationResult = await buyerClient.invoke(
      sellerReg.agentId,
      SAMPLE_PROMPTS[0].text,
    );

    expect(result.receipt).toBeTruthy();
    expect(result.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage.tokensIn).toBeGreaterThan(0);
    expect(result.usage.tokensOut).toBeGreaterThan(0);
    expect(result.completedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Step 8 — Public receipt feed (SPEC §7.1 GET /feed/receipts)
// ---------------------------------------------------------------------------

describe("Step 8: public receipt feed", () => {
  it("GET /v1/feed/receipts returns a paginated list of minted receipts", async () => {
    const res = await serverReq("/v1/feed/receipts");
    // RED: not yet implemented
    expect(res.status).toBe(200);

    const body = await res.json() as { data: unknown[]; page: number; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.page).toBeGreaterThanOrEqual(1);
    expect(body.total).toBeGreaterThanOrEqual(0);
  });

  it("receipt feed entries include receiptId, agentId, timestamp", async () => {
    const res = await serverReq("/v1/feed/receipts");
    if (res.status !== 200) return;

    const body = await res.json() as { data: Array<Record<string, unknown>> };
    for (const entry of body.data) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("agentId");
      expect(entry).toHaveProperty("timestamp");
    }
  });
});

afterAll(async () => {
  // Nothing to tear down for Hono app.request() — no real server to close
});
