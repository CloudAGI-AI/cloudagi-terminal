"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { MOCK_AGENTS } from "@/lib/mock-agents";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Agent } from "@cloudagi/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(agent: Agent): string {
  if (agent.pricing.kind === "per_token") {
    return `$${agent.pricing.perMTokensIn}/M-tok`;
  }
  return `$${agent.pricing.flatCallPrice}/call`;
}

const REPUTATION_TIERS = [
  { label: "All", value: "" },
  { label: "Elite (95+)", value: "95" },
  { label: "Trusted (80+)", value: "80" },
  { label: "New (0+)", value: "0" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketplacePage() {
  const [skillFilter, setSkillFilter] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState<number | "">("");
  const [minReputation, setMinReputation] = React.useState("");

  const filtered = MOCK_AGENTS.filter((agent) => {
    if (
      skillFilter &&
      !agent.skills.some((s) =>
        s.toLowerCase().includes(skillFilter.toLowerCase())
      ) &&
      !agent.displayName.toLowerCase().includes(skillFilter.toLowerCase())
    ) {
      return false;
    }
    if (maxPrice !== "") {
      const price =
        agent.pricing.kind === "per_token"
          ? agent.pricing.perMTokensIn
          : agent.pricing.flatCallPrice;
      if (price > Number(maxPrice)) return false;
    }
    if (minReputation !== "") {
      if (agent.reputation < Number(minReputation)) return false;
    }
    return true;
  });

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-8">
          Marketplace
        </h1>

        {/* Filter region */}
        <div
          role="search"
          aria-label="Filter agents"
          className="flex flex-col sm:flex-row gap-4 mb-8 p-4 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
        >
          <div className="flex flex-col gap-1 flex-1">
            <label
              htmlFor="skill-filter"
              className="text-xs font-mono text-[var(--color-muted,#888)]"
            >
              Skill
            </label>
            <input
              id="skill-filter"
              role="textbox"
              aria-label="Skill"
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="e.g. summarize"
              className={cn(
                "rounded-md border border-[var(--color-border,#2a2a2a)]",
                "bg-[var(--color-surface-raised,#1a1a1a)]",
                "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                "focus:outline-none focus:border-[#00d184]"
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="max-price"
              className="text-xs font-mono text-[var(--color-muted,#888)]"
            >
              Max price (per M-tok)
            </label>
            <input
              id="max-price"
              type="number"
              aria-label="Max price per million tokens"
              min={0}
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="No limit"
              className={cn(
                "rounded-md border border-[var(--color-border,#2a2a2a)]",
                "bg-[var(--color-surface-raised,#1a1a1a)]",
                "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                "focus:outline-none focus:border-[#00d184] w-36"
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="rep-filter"
              className="text-xs font-mono text-[var(--color-muted,#888)]"
            >
              Reputation (min)
            </label>
            <select
              id="rep-filter"
              aria-label="Minimum reputation tier"
              value={minReputation}
              onChange={(e) => setMinReputation(e.target.value)}
              className={cn(
                "rounded-md border border-[var(--color-border,#2a2a2a)]",
                "bg-[var(--color-surface-raised,#1a1a1a)]",
                "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                "focus:outline-none focus:border-[#00d184]"
              )}
            >
              {REPUTATION_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agent grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-[var(--color-muted,#888)] font-mono py-16">
            No agents found matching your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{agent.displayName}</CardTitle>
                    <Badge
                      variant={
                        agent.status === "active"
                          ? "success"
                          : agent.status === "paused"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  <CardDescription>{formatPrice(agent)}</CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Skill tags">
                    {agent.skills.map((skill) => (
                      <li key={skill}>
                        <Badge variant="outline">{skill}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs font-mono text-[var(--color-muted,#888)]">
                    Rep: {agent.reputation} · Latency: {agent.avgLatencyMs}ms
                  </p>
                </CardContent>

                <CardFooter>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { window.history.pushState({}, "", `/session/${agent.id}`); }}
                    aria-label={`Open terminal for ${agent.displayName}`}
                  >
                    Open terminal
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
