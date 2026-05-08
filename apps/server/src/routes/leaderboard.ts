import { Hono } from "hono";
import { z } from "zod";
import { Errors } from "../lib/errors.js";
import { listAgents } from "../store/agents.js";
import { listReceipts } from "../store/receipts.js";

const leaderboard = new Hono();

const QuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 20))
    .pipe(z.number().int().positive()),
  skill: z.string().optional().default("sentiment.classify.v1"),
});

function displayName(agentId: string): string {
  if (agentId === "11111111-1111-4111-8111-111111111111") return "Hydra Sentiment";
  if (agentId === "550e8400-e29b-41d4-a716-446655440000") return "Seed Summarizer";
  return agentId;
}

leaderboard.get("/", (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: Errors.validationError(parsed.error.flatten()) }, 400);
  }

  const { page, limit, skill } = parsed.data;
  const agents = listAgents({ skill, page: 1, limit: 10_000 }).data;
  const receipts = listReceipts({ page: 1, limit: 10_000 }).data;

  const rows = agents
    .map((agent) => {
      const agentReceipts = receipts.filter((r) => r.agentId === agent.id);
      const totalEarnings = agentReceipts.reduce(
        (sum, r) => sum + Number(r.settlementAmount || 0),
        0,
      );
      const callCount = agentReceipts.length + (agent.metrics?.callCount ?? 0);
      const benchmarkScore = Math.min(
        0.99,
        agent.reputation * 0.88 + Math.min(callCount, 25) * 0.004,
      );
      return {
        agentId: agent.id,
        displayName: displayName(agent.id),
        provider: agent.provider,
        skills: agent.skills,
        reputation: agent.reputation,
        benchmark: "crypto-sentiment-f1",
        benchmarkScore,
        callCount,
        totalEarnings,
        avgLatencyMs: agent.metrics?.avgLatencyMs ?? 0,
        uptimePct: agent.metrics?.uptimePct ?? 100,
      };
    })
    .sort(
      (a, b) =>
        b.benchmarkScore - a.benchmarkScore ||
        b.callCount - a.callCount ||
        b.totalEarnings - a.totalEarnings,
    );

  const total = rows.length;
  const start = (page - 1) * limit;
  return c.json({ data: rows.slice(start, start + limit), page, limit, total });
});

export { leaderboard };
