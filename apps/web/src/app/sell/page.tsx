"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = "wallet" | "register" | "policies" | "confirm";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "wallet", label: "Connect Wallet" },
  { id: "register", label: "Register Agent" },
  { id: "policies", label: "Set Policies" },
  { id: "confirm", label: "Confirm" },
];

// ---------------------------------------------------------------------------
// Mock wallet connection
// ---------------------------------------------------------------------------

function useMockWallet() {
  const [address, setAddress] = React.useState<string | null>(null);
  const connect = () => {
    // Simulated wallet connection — Wave 3 replaces with real adapter
    setAddress("MockWallet1111111111111111111111111111111");
  };
  const disconnect = () => setAddress(null);
  return { address, connect, disconnect };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SellPage() {
  const { address, connect, disconnect } = useMockWallet();
  const [_step, _setStep] = React.useState<WizardStep>("wallet");

  // Form fields
  const [agentName, setAgentName] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [model, setModel] = React.useState("");
  const [price, setPrice] = React.useState<number | "">("");
  const [endpoint, setEndpoint] = React.useState("");
  const [endpointError, setEndpointError] = React.useState("");
  const [maxPromptTokens, setMaxPromptTokens] = React.useState<number | "">("");
  const [maxOutputTokens, setMaxOutputTokens] = React.useState<number | "">("");

  const isFormComplete =
    agentName.trim() !== "" &&
    model.trim() !== "" &&
    price !== "" &&
    endpoint.trim() !== "" &&
    isValidHttpsUrl(endpoint);

  const handleEndpointBlur = () => {
    if (endpoint && !isValidHttpsUrl(endpoint)) {
      setEndpointError("Please enter a valid HTTPS URL");
    } else {
      setEndpointError("");
    }
  };

  return (
    <main>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-8">
          List your agent
        </h1>

        {/* Step indicator */}
        <nav aria-label="Registration steps" className="mb-10">
          <ol role="list" aria-label="steps" className="flex gap-2">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "flex-1 text-center text-xs font-mono py-1.5 rounded border",
                  s.id === _step
                    ? "border-[#00d184] text-[#00d184]"
                    : "border-[var(--color-border,#2a2a2a)] text-[var(--color-muted,#888)]",
                )}
              >
                {i + 1}. {s.label}
              </li>
            ))}
          </ol>
        </nav>

        {/* Wallet section */}
        <section
          className="mb-8 p-6 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
          aria-labelledby="wallet-heading"
        >
          <h2
            id="wallet-heading"
            className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-4"
          >
            Wallet
          </h2>

          {address ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-[var(--color-muted,#888)] truncate">
                {address}
              </span>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={connect}>
              Connect wallet
            </Button>
          )}
        </section>

        {/* Stake requirement */}
        <section
          className="mb-8 p-6 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
          aria-labelledby="stake-heading"
        >
          <h2
            id="stake-heading"
            className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-4"
          >
            Collateral deposit
          </h2>
          <p className="text-xs font-mono text-[var(--color-muted,#888)] mb-3">
            Minimum stake: <span className="text-[#00d184]">0.5 SOL</span> — locked during the
            agent&apos;s active period as slashing collateral.
          </p>
          <Button variant="secondary" size="sm">
            Post stake
          </Button>
        </section>

        {/* Registration form */}
        <section
          className="mb-8 p-6 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
          aria-labelledby="reg-heading"
        >
          <h2
            id="reg-heading"
            className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-6"
          >
            Agent details
          </h2>

          <div className="flex flex-col gap-5">
            {/* Agent name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="agent-name"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Agent name
              </label>
              <input
                id="agent-name"
                type="text"
                aria-label="Agent name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. mistral-7b-q4"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
            </div>

            {/* Skill tags */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="skill-tags"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Skill tags (comma-separated)
              </label>
              <input
                id="skill-tags"
                type="text"
                aria-label="Skill tags"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="summarize.text.v1, sentiment.classify.v1"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
            </div>

            {/* Model */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="model-name"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Model descriptor
              </label>
              <input
                id="model-name"
                type="text"
                aria-label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. llama-3.1-8b-instruct"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="price-input"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Price per million tokens (USDC base units)
              </label>
              <input
                id="price-input"
                type="number"
                aria-label="Price per million tokens (M-tok)"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 2"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184] w-40",
                )}
              />
            </div>

            {/* Endpoint URL */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="endpoint-url"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Endpoint URL
              </label>
              <input
                id="endpoint-url"
                type="url"
                aria-label="Endpoint URL"
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                  if (endpointError) setEndpointError("");
                }}
                onBlur={handleEndpointBlur}
                placeholder="https://your-agent.example.com/api"
                className={cn(
                  "rounded-md border",
                  endpointError ? "border-red-500" : "border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
              {endpointError && <p className="text-xs font-mono text-red-400">{endpointError}</p>}
            </div>
          </div>
        </section>

        {/* Per-call policies */}
        <section
          className="mb-8 p-6 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
          aria-labelledby="policy-heading"
        >
          <h2
            id="policy-heading"
            className="text-sm font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-6"
          >
            Per-call policies
          </h2>

          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="max-prompt-tokens"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Max prompt tokens
              </label>
              <input
                id="max-prompt-tokens"
                type="number"
                aria-label="Max prompt tokens"
                min={1}
                value={maxPromptTokens}
                onChange={(e) =>
                  setMaxPromptTokens(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="8192"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="max-output-tokens"
                className="text-xs font-mono text-[var(--color-muted,#888)]"
              >
                Max output tokens
              </label>
              <input
                id="max-output-tokens"
                type="number"
                aria-label="Max output tokens"
                min={1}
                value={maxOutputTokens}
                onChange={(e) =>
                  setMaxOutputTokens(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="2048"
                className={cn(
                  "rounded-md border border-[var(--color-border,#2a2a2a)]",
                  "bg-[var(--color-surface-raised,#1a1a1a)]",
                  "px-3 py-2 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                  "focus:outline-none focus:border-[#00d184]",
                )}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          disabled={!isFormComplete}
          aria-label="Register agent"
          className="w-full"
        >
          Register agent
        </Button>
      </div>
    </main>
  );
}
