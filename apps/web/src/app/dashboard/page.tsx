"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Mock data — Wave 3 replaces with real API calls
// ---------------------------------------------------------------------------

const MOCK_METRICS = {
  earnings: "$124.50 USDC",
  callCount: 3_847,
  avgLatencyMs: 412,
  disputeRate: "0.3%",
};

interface MockAgent {
  id: string;
  name: string;
  status: "active" | "paused";
  price: number;
}

const MOCK_AGENT: MockAgent = {
  id: "agent_mistral7b",
  name: "mistral-7b-q4",
  status: "active",
  price: 2,
};

interface MockReceipt {
  id: string;
  agentName: string;
  tokensIn: number;
  tokensOut: number;
  settlement: string;
  status: "minted" | "disputed" | "refunded";
  timestamp: string;
}

const MOCK_RECEIPTS: MockReceipt[] = [
  {
    id: "rcpt_001",
    agentName: "mistral-7b-q4",
    tokensIn: 512,
    tokensOut: 384,
    settlement: "$0.0004 USDC",
    status: "minted",
    timestamp: "2024-04-22T10:30:00Z",
  },
  {
    id: "rcpt_002",
    agentName: "mistral-7b-q4",
    tokensIn: 1024,
    tokensOut: 720,
    settlement: "$0.0009 USDC",
    status: "minted",
    timestamp: "2024-04-22T11:15:00Z",
  },
  {
    id: "rcpt_003",
    agentName: "mistral-7b-q4",
    tokensIn: 256,
    tokensOut: 128,
    settlement: "$0.0002 USDC",
    status: "disputed",
    timestamp: "2024-04-22T12:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function exportCSV(receipts: MockReceipt[]) {
  const header = "id,agentName,tokensIn,tokensOut,settlement,status,timestamp\n";
  const rows = receipts
    .map(
      (r) =>
        `${r.id},${r.agentName},${r.tokensIn},${r.tokensOut},${r.settlement},${r.status},${r.timestamp}`
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "receipts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSONL(receipts: MockReceipt[]) {
  const content = receipts.map((r) => JSON.stringify(r)).join("\n");
  const blob = new Blob([content], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "receipts.jsonl";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<"provider" | "buyer">(
    "provider"
  );
  const [agentStatus, setAgentStatus] = React.useState<"active" | "paused">(
    MOCK_AGENT.status
  );
  const [price, setPrice] = React.useState<number>(MOCK_AGENT.price);

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-8">
          Provider Dashboard
        </h1>

        {/* Tab navigation */}
        <div
          role="tablist"
          aria-label="Dashboard views"
          className="flex gap-1 mb-8 border-b border-[var(--color-border,#2a2a2a)]"
        >
          {(["provider", "buyer"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2.5 text-xs font-mono border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-[#00d184] text-[#00d184]"
                  : "border-transparent text-[var(--color-muted,#888)] hover:text-[var(--color-foreground,#f5f5f5)]"
              )}
            >
              {tab === "provider" ? "Provider" : "Buyer"}
            </button>
          ))}
        </div>

        {activeTab === "provider" && (
          <>
            {/* Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Earnings", value: MOCK_METRICS.earnings },
                { label: "Call count", value: MOCK_METRICS.callCount.toLocaleString() },
                {
                  label: "Avg latency",
                  value: `${MOCK_METRICS.avgLatencyMs}ms`,
                },
                { label: "Dispute rate", value: MOCK_METRICS.disputeRate },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-4 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
                >
                  <p className="text-xs font-mono text-[var(--color-muted,#888)] mb-1">
                    {m.label}
                  </p>
                  <p className="text-lg font-mono font-semibold text-[#00d184]">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Agent management */}
            <section
              className="mb-8 p-6 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
              aria-labelledby="agent-mgmt-heading"
            >
              <h2
                id="agent-mgmt-heading"
                className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-4"
              >
                Agent management
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[var(--color-foreground,#f5f5f5)]">
                    {MOCK_AGENT.name}
                  </span>
                  <Badge variant={agentStatus === "active" ? "success" : "warning"}>
                    {agentStatus}
                  </Badge>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAgentStatus("paused")}
                  aria-label="Pause agent"
                  disabled={agentStatus !== "active"}
                >
                  Pause agent
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAgentStatus("active")}
                  aria-label="Resume agent"
                  disabled={agentStatus !== "paused"}
                >
                  Resume agent
                </Button>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="price-update"
                    className="text-xs font-mono text-[var(--color-muted,#888)]"
                  >
                    Price (M-tok)
                  </label>
                  <input
                    id="price-update"
                    type="number"
                    aria-label="Update price per million tokens"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className={cn(
                      "w-20 rounded-md border border-[var(--color-border,#2a2a2a)]",
                      "bg-[var(--color-surface-raised,#1a1a1a)]",
                      "px-2 py-1 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                      "focus:outline-none focus:border-[#00d184]"
                    )}
                  />
                  <Button variant="ghost" size="sm">
                    Save changes
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Receipt history — visible on both tabs */}
        <section aria-labelledby="receipts-heading">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="receipts-heading"
              className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)]"
            >
              Receipt history
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportCSV(MOCK_RECEIPTS)}
                aria-label="Export CSV"
              >
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportJSONL(MOCK_RECEIPTS)}
                aria-label="Export JSONL"
              >
                Export JSONL
              </Button>
            </div>
          </div>

          <table
            aria-label="Receipt history"
            className="w-full text-xs font-mono border-collapse"
          >
            <thead>
              <tr className="border-b border-[var(--color-border,#2a2a2a)] text-[var(--color-muted,#888)]">
                <th className="text-left py-2 pr-4">ID</th>
                <th className="text-left py-2 pr-4">Agent</th>
                <th className="text-right py-2 pr-4">Tok in</th>
                <th className="text-right py-2 pr-4">Tok out</th>
                <th className="text-right py-2 pr-4">Settlement</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECEIPTS.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border,#2a2a2a)] hover:bg-[var(--color-surface-raised,#1a1a1a)]"
                >
                  <td className="py-2 pr-4 text-[var(--color-muted,#888)]">{r.id}</td>
                  <td className="py-2 pr-4 text-[var(--color-foreground,#f5f5f5)]">
                    {r.agentName}
                  </td>
                  <td className="py-2 pr-4 text-right text-[var(--color-foreground,#f5f5f5)]">
                    {r.tokensIn}
                  </td>
                  <td className="py-2 pr-4 text-right text-[var(--color-foreground,#f5f5f5)]">
                    {r.tokensOut}
                  </td>
                  <td className="py-2 pr-4 text-right text-[#00d184]">
                    {r.settlement}
                  </td>
                  <td className="py-2">
                    <Badge
                      variant={
                        r.status === "minted"
                          ? "success"
                          : r.status === "disputed"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
