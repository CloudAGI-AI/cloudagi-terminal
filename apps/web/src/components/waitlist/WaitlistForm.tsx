"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const ROLES = [
  { id: "seller", label: "Seller. List idle credits or a local model." },
  { id: "buyer", label: "Buyer. Pay per call in USDC." },
  { id: "builder", label: "Builder. Contribute to the open source runtime." },
] as const;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("seller");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, source: "landing" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const body = (await res.json().catch(() => ({}))) as { count?: number };
      setStatus("success");
      setMessage(
        body?.count
          ? `You're #${body.count} on the list. We'll be in touch.`
          : "You're on the list. We'll be in touch.",
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 max-w-md mx-auto w-full"
      aria-label="Join the CloudAGI waitlist"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className={cn(
          "w-full px-4 py-3 rounded-md font-mono text-sm",
          "bg-[var(--color-background)] border border-[var(--color-border)]",
          "text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
          "focus:outline-none focus:border-[var(--color-accent)]/60",
        )}
        aria-label="Email address"
        disabled={status === "submitting"}
      />
      <div role="radiogroup" aria-label="I am a..." className="grid grid-cols-1 gap-2">
        {ROLES.map((r) => (
          <label
            key={r.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-md font-mono text-xs cursor-pointer",
              "border transition-colors",
              role === r.id
                ? "border-[var(--color-accent)]/60 bg-[var(--color-accent-glow)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            <input
              type="radio"
              name="role"
              value={r.id}
              checked={role === r.id}
              onChange={() => setRole(r.id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                "w-3 h-3 rounded-full border",
                role === r.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                  : "border-[var(--color-border)]",
              )}
            />
            {r.label}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "w-full px-5 py-3 rounded-md font-mono text-sm font-medium",
          "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
          "hover:bg-[var(--color-accent-dim)] transition-colors",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {status === "submitting" ? "Joining..." : "Join Waitlist →"}
      </button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "font-mono text-xs",
            status === "success" ? "text-[var(--color-accent)]" : "text-[var(--color-warning)]",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
