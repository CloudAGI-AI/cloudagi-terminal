import { randomUUID } from "node:crypto";
import type { Agent, CreateAgent } from "../schemas/agent.js";

// In-memory store — replaced by DB in later waves
const store = new Map<string, Agent>();

/**
 * Seed the well-known TEST_AGENT_ID used in invoke.test.ts so those tests
 * can exercise 402/200 paths without needing to register the agent first.
 * This matches the `validAgent` fixture exactly.
 */
const SEED_AGENT: Agent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  provider: "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk",
  endpoint: "https://agent.example.com/invoke",
  skills: ["summarize", "classify"],
  pricing: { perMTokensIn: 0.5, perMTokensOut: 1.5 },
  reputation: 0.85,
  stake: 1_000_000_000,
};
store.set(SEED_AGENT.id, SEED_AGENT);

export function createAgent(input: CreateAgent): Agent {
  const agent: Agent = {
    id: randomUUID(),
    reputation: 0,
    ...input,
  };
  store.set(agent.id, agent);
  return agent;
}

export function getAgent(id: string): Agent | undefined {
  return store.get(id);
}

export interface ListAgentsOptions {
  page?: number;
  limit?: number;
  skill?: string;
  sort?: "reputation";
  minReputation?: number;
  maxPrice?: number;
}

export interface ListAgentsResult {
  data: Agent[];
  page: number;
  limit: number;
  total: number;
}

export function listAgents(opts: ListAgentsOptions = {}): ListAgentsResult {
  const { page = 1, limit = 20, skill, sort, minReputation, maxPrice } = opts;

  let items = Array.from(store.values());

  if (skill !== undefined) {
    items = items.filter((a) => a.skills.includes(skill));
  }

  if (minReputation !== undefined) {
    items = items.filter((a) => a.reputation >= minReputation);
  }

  if (maxPrice !== undefined) {
    items = items.filter((a) => a.pricing.perMTokensIn <= maxPrice);
  }

  if (sort === "reputation") {
    items = [...items].sort((a, b) => b.reputation - a.reputation);
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);

  return { data, page, limit, total };
}

export function updateAgent(id: string, patch: Partial<Omit<Agent, "id">>): Agent | undefined {
  const existing = store.get(id);
  if (existing === undefined) return undefined;
  const updated: Agent = { ...existing, ...patch };
  store.set(id, updated);
  return updated;
}

export function removeAgent(id: string): boolean {
  return store.delete(id);
}

/** Exposed for test isolation — clears agents but re-seeds the test agent */
export function _clearAgentStore(): void {
  store.clear();
  store.set(SEED_AGENT.id, SEED_AGENT);
}
