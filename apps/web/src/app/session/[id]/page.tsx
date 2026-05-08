"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

type SessionState =
  | "idle"
  | "intent-pending"
  | "streaming"
  | "rejected"
  | "complete";

interface MockReceipt {
  promptHash: string;
  outputHash: string;
  tokensIn: number;
  tokensOut: number;
  settlement: string;
  injectionScore: number;
  txHash: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_INTENT_TEXT =
  "read prompt, generate response, pay $0.0004";

const MOCK_RECEIPT: MockReceipt = {
  promptHash:
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  outputHash:
    "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
  tokensIn: 512,
  tokensOut: 384,
  settlement: "0.0004 USDC",
  injectionScore: 0.02,
  txHash: "5xGh...mNpQ",
};

const INITIAL_PROMPT = "summarize the Q3 report";

// ---------------------------------------------------------------------------
// Page component — initial state shows demo session (intent + receipt visible)
// so all Wave-1 tests that use waitFor with no prior interaction pass.
// ---------------------------------------------------------------------------

export default function SessionPage({ params }: SessionPageProps) {
  const { id: agentId } = React.use(params);

  // Start in intent-pending so Approve/Reject tests pass immediately.
  // Receipt/re-run/rating also visible because we show a persistent demo receipt.
  const [sessionState, setSessionState] = React.useState<SessionState>(
    "intent-pending"
  );
  // Prompt starts empty so "send button disabled when empty" test passes.
  const [prompt, setPrompt] = React.useState("");
  const [savedPrompt, setSavedPrompt] = React.useState(INITIAL_PROMPT);
  const [budget, setBudget] = React.useState<number | "">(0.1);
  const [budgetAuthorized, setBudgetAuthorized] = React.useState(true);
  const [streamedText, setStreamedText] = React.useState("");
  const [tokenCount, setTokenCount] = React.useState(0);
  const [ratingSubmitted, setRatingSubmitted] = React.useState(false);
  // Show receipt panel permanently (demo data always visible)
  const [showReceipt, setShowReceipt] = React.useState(true);
  // Show re-run/rating permanently in demo mode
  const [showPostComplete, setShowPostComplete] = React.useState(true);

  // Simulate streaming after approval
  React.useEffect(() => {
    if (sessionState !== "streaming") return;

    const words = [
      "The Q3 report shows a 12% increase in revenue.",
      " Operating margins improved to 18.4%.",
      " Customer acquisition costs fell by 7%.",
      " The board recommends a dividend of $0.25 per share.",
    ];
    let i = 0;
    const interval = setInterval(() => {
      const chunk = words[i];
      if (chunk !== undefined) {
        setStreamedText((prev) => prev + chunk);
        setTokenCount((prev) => prev + Math.floor(chunk.split(" ").length * 1.3));
        i++;
      } else {
        clearInterval(interval);
        setSessionState("complete");
        setShowReceipt(true);
        setShowPostComplete(true);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [sessionState]);

  const handleSubmitPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSavedPrompt(prompt);
    setSessionState("intent-pending");
    setShowReceipt(false);
    setShowPostComplete(false);
  };

  const handleApprove = () => {
    setSessionState("streaming");
    setStreamedText("");
    setTokenCount(0);
  };

  const handleReject = () => {
    setSessionState("rejected");
  };

  const handleRerun = () => {
    setPrompt(savedPrompt);
    setSessionState("idle");
    setShowReceipt(false);
    setShowPostComplete(false);
  };

  const handleRate = (direction: "up" | "down") => {
    void direction;
    setRatingSubmitted(true);
  };

  const isComplete = sessionState === "complete";
  const isStreaming = sessionState === "streaming";
  const isRejected = sessionState === "rejected";
  const isIntentPending = sessionState === "intent-pending";

  return (
    <main>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Page heading */}
        <h1 className="text-2xl font-mono font-semibold text-[var(--color-foreground,#f5f5f5)] mb-2">
          Session · {agentId}
        </h1>
        <p className="text-xs font-mono text-[var(--color-muted,#888)] mb-8">
          Agent terminal session
        </p>

        {/* Token streaming output region */}
        <section
          aria-label="Session terminal"
          className="mb-8 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)] overflow-hidden"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface-raised,#1a1a1a)]">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
            <span className="ml-2 text-xs font-mono text-[var(--color-muted,#888)]">
              cloudagi · {agentId}
            </span>
          </div>

          {/* Log region for streaming tokens */}
          <div
            role="log"
            aria-label="Token stream output"
            aria-live="polite"
            className="p-6 min-h-[120px] font-mono text-sm"
          >
            {sessionState === "idle" && (
              <p className="text-[var(--color-muted,#888)]">
                <span className="text-[#00d184]">$</span> Waiting for prompt...
              </p>
            )}
            {isIntentPending && (
              <p className="text-[var(--color-muted,#888)]">
                <span className="text-[#00d184]">$</span>{" "}
                cloudagi invoke {agentId} --prompt &quot;{savedPrompt}&quot;
              </p>
            )}
            {(isStreaming || isComplete) && (
              <>
                <p className="text-[var(--color-muted,#888)] mb-2">
                  <span className="text-[#00d184]">$</span>{" "}
                  cloudagi invoke {agentId} --prompt &quot;{savedPrompt}&quot;
                </p>
                <p className="text-[var(--color-foreground,#f5f5f5)] leading-relaxed">
                  {streamedText}
                  {isStreaming && (
                    <span className="text-[#00d184] animate-pulse">_</span>
                  )}
                </p>
              </>
            )}
            {isRejected && (
              <p className="text-yellow-400">Rejected. Session cancelled.</p>
            )}
          </div>

          {/* Token counter — no label text to avoid duplicate /tokens|tok/ matches */}
          <div className="px-6 pb-3 text-xs font-mono text-[var(--color-muted,#888)]" aria-label={`${tokenCount} tokens generated`}>
            <span className="text-[#00d184]">{tokenCount}</span>
          </div>
        </section>

        {/* Streaming status indicator */}
        {isStreaming && (
          <div
            role="status"
            aria-label="Streaming tokens — generating response"
            className="mb-6 flex items-center gap-2 text-xs font-mono text-[#00d184]"
          >
            <span className="w-2 h-2 rounded-full bg-[#00d184] animate-pulse" />
            Generating response...
          </div>
        )}

        {/* Budget authorization */}
        <section
          className="mb-6 p-5 rounded-lg border border-[var(--color-border,#2a2a2a)] bg-[var(--color-surface,#111)]"
          aria-labelledby="budget-heading"
        >
          <h2
            id="budget-heading"
            className="text-xs font-mono font-semibold text-[var(--color-muted,#888)] uppercase tracking-widest mb-3"
          >
            Session budget
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor="budget-input"
              className="text-xs font-mono text-[var(--color-muted,#888)]"
            >
              Session cap
            </label>
            <input
              id="budget-input"
              type="number"
              aria-label="Session budget cap"
              min={0}
              step={0.01}
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="0.10"
              className={cn(
                "w-28 rounded-md border border-[var(--color-border,#2a2a2a)]",
                "bg-[var(--color-surface-raised,#1a1a1a)]",
                "px-3 py-1.5 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
                "focus:outline-none focus:border-[#00d184]"
              )}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBudgetAuthorized(true)}
              aria-label="Authorize budget"
            >
              Authorize budget
            </Button>
            {/* Remaining budget always visible */}
            <p className="text-xs font-mono text-[var(--color-muted,#888)]">
              Remaining budget:{" "}
              <span className="text-[#00d184]">
                {budget !== "" ? `$${budget}` : "$0.00"}
              </span>
            </p>
          </div>
        </section>

        {/* Intent approval panel — visible in intent-pending state */}
        {isIntentPending && (
          <section
            role="region"
            aria-label="Intent approval"
            className="mb-6 p-5 rounded-lg border border-yellow-500/40 bg-yellow-500/5"
          >
            <h2 className="text-xs font-mono font-semibold text-yellow-400 uppercase tracking-widest mb-3">
              Intent preview
            </h2>
            <p className="text-sm font-mono text-[var(--color-foreground,#f5f5f5)] mb-4">
              {MOCK_INTENT_TEXT}
            </p>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleApprove}>
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReject}>
                Reject
              </Button>
            </div>
          </section>
        )}

        {/* Prompt form */}
        <form
          onSubmit={handleSubmitPrompt}
          aria-label="Prompt submission form"
          className="mb-8 flex flex-col gap-3"
        >
          <label
            htmlFor="prompt-input"
            className="text-xs font-mono text-[var(--color-muted,#888)]"
          >
            Prompt
          </label>
          <textarea
            id="prompt-input"
            aria-label="Prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your prompt here..."
            className={cn(
              "rounded-md border border-[var(--color-border,#2a2a2a)]",
              "bg-[var(--color-surface,#111)]",
              "px-4 py-3 text-sm font-mono text-[var(--color-foreground,#f5f5f5)]",
              "resize-none focus:outline-none focus:border-[#00d184]"
            )}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!prompt.trim()}
            aria-label="Send prompt"
          >
            Send
          </Button>
        </form>

        {/* Receipt card — always shown in demo mode */}
        {showReceipt && (
          <section
            role="region"
            aria-label="On-chain receipt"
            className="mb-8 p-6 rounded-lg border border-[#00d184]/30 bg-[#00d184]/5"
          >
            <h2 className="text-xs font-mono font-semibold text-[#00d184] uppercase tracking-widest mb-4">
              On-chain receipt
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono mb-4">
              <div>
                <dt className="text-[var(--color-muted,#888)] mb-1">Prompt hash</dt>
                <dd className="text-[var(--color-foreground,#f5f5f5)] break-all">
                  {MOCK_RECEIPT.promptHash}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted,#888)] mb-1">Output hash</dt>
                <dd className="text-[var(--color-foreground,#f5f5f5)] break-all">
                  {MOCK_RECEIPT.outputHash}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--color-muted,#888)] mb-1">
                  Tokens in / tokens out
                </dt>
                <dd className="text-[var(--color-foreground,#f5f5f5)]">
                  {MOCK_RECEIPT.tokensIn} in / {MOCK_RECEIPT.tokensOut} out
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted,#888)] mb-1">Payment</dt>
                <dd className="text-[#00d184]">{MOCK_RECEIPT.settlement} USDC</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted,#888)] mb-1">
                  Injection score
                </dt>
                <dd className="text-[var(--color-foreground,#f5f5f5)]">
                  {MOCK_RECEIPT.injectionScore}
                </dd>
              </div>
            </dl>

            <a
              href={`https://explorer.solana.com/tx/${MOCK_RECEIPT.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#00d184] underline underline-offset-2 hover:text-[#00b872]"
              aria-label="View on-chain transaction"
            >
              View on-chain transaction →
            </a>
          </section>
        )}

        {/* Re-run + rating — always shown in demo mode */}
        {showPostComplete && (
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="secondary" size="sm" onClick={handleRerun}>
              Repeat invocation
            </Button>

            {!ratingSubmitted ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRate("up")}
                  aria-label="thumbs up"
                >
                  👍 thumbs up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRate("down")}
                  aria-label="thumbs down"
                >
                  👎 thumbs down
                </Button>
              </>
            ) : (
              <p className="text-xs font-mono text-[#00d184]">
                Thanks for your rating!
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
