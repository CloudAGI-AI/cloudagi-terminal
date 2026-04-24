import { cn } from "@/lib/cn";

// ─── Feature data ────────────────────────────────────────────────────────────

interface Feature {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    id: "registry",
    label: "Registry",
    icon: "◈",
    description:
      "Any provider registers an agent on-chain with an identity, skill tags, pricing per M-tokens, and a reputation score that grows with honest calls.",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: "▸",
    description:
      "Buyers open a web terminal, pick an agent, type a prompt, and see an intent preview before any spend. Approve, watch the stream, pay.",
  },
  {
    id: "receipts",
    label: "Receipts",
    icon: "⬡",
    description:
      "Every call mints an on-chain receipt with input hash, output hash, token usage, prompt-injection flags, and settlement signature.",
  },
];

// ─── Stat data ────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: string;
  unit: string;
}

const STATS: Stat[] = [
  { label: "Uptime", value: "99.9", unit: "%" },
  { label: "Active agents", value: "0", unit: "" },
  { label: "Receipts minted", value: "0", unit: "" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <span
          className="font-mono text-[var(--color-accent)] font-semibold tracking-tight text-sm"
          aria-label="CloudAGI home"
        >
          cloudagi
        </span>
        <nav aria-label="Primary navigation" className="flex gap-6 items-center">
          <a
            href="https://github.com/CloudAGI-AI/cloudagi-terminal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            GitHub
          </a>
          <a
            href="#features"
            className="text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center pt-24 pb-20 px-6 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, var(--color-accent-glow), transparent)",
        }}
      />

      {/* Status badge */}
      <div className="relative mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent-glow)] text-[var(--color-accent)] text-xs font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden="true" />
        active development — public sprint
      </div>

      <h1
        id="hero-heading"
        className="relative max-w-3xl text-3xl sm:text-4xl md:text-5xl font-mono font-semibold leading-tight tracking-tight text-[var(--color-foreground)]"
      >
        Monetize your models.{" "}
        <br className="hidden sm:block" />
        Rent agents with receipts.{" "}
        <br className="hidden sm:block" />
        <span className="text-[var(--color-accent)]">
          On-chain from the terminal.
        </span>
      </h1>

      <p className="relative mt-6 max-w-xl text-base sm:text-lg text-[var(--color-muted)] font-mono leading-relaxed">
        Register a local model, earn stablecoin per call. Or hire any listed
        agent with a verifiable on-chain receipt — every invocation, auditable.
      </p>

      <div className="relative mt-10 flex flex-col sm:flex-row gap-4 items-center">
        <a
          href="#"
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
            "hover:bg-[var(--color-accent-dim)] transition-colors",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          )}
        >
          List your agent
          <span aria-hidden="true">→</span>
        </a>
        <a
          href="#"
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium",
            "border border-[var(--color-border)] text-[var(--color-foreground)]",
            "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-colors",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          )}
        >
          <span className="text-[var(--color-accent)]" aria-hidden="true">
            $
          </span>{" "}
          Open terminal
        </a>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="max-w-6xl mx-auto px-6 py-16"
      aria-labelledby="features-heading"
    >
      <h2
        id="features-heading"
        className="text-xs font-mono text-[var(--color-muted)] uppercase tracking-widest mb-10 text-center"
      >
        The CloudAGI approach
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((feature) => (
          <article
            key={feature.id}
            className={cn(
              "group relative p-6 rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-surface)] hover:border-[var(--color-accent)]/30",
              "hover:bg-[var(--color-surface-raised)] transition-all duration-200"
            )}
          >
            <div
              className="text-2xl text-[var(--color-accent)] mb-4 font-mono"
              aria-hidden="true"
            >
              {feature.icon}
            </div>
            <h3 className="text-sm font-mono font-semibold text-[var(--color-foreground)] mb-2 tracking-tight">
              {feature.label}
            </h3>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed font-mono">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section
      className="border-y border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="Platform statistics"
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="text-xs font-mono text-[var(--color-muted)] uppercase tracking-widest">
                {stat.label}
              </dt>
              <dd className="text-3xl font-mono font-semibold text-[var(--color-accent)] tabular-nums">
                {stat.value}
                {stat.unit && (
                  <span className="text-xl text-[var(--color-muted)]">
                    {stat.unit}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function TerminalPreview() {
  return (
    <section
      className="max-w-6xl mx-auto px-6 py-16"
      aria-label="Terminal preview"
    >
      <div
        className={cn(
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
          "overflow-hidden shadow-[var(--shadow-md)]"
        )}
        role="img"
        aria-label="Terminal interface preview showing agent invocation"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
          <span className="ml-2 text-xs font-mono text-[var(--color-muted)]">
            cloudagi — terminal
          </span>
        </div>

        {/* Terminal body */}
        <div className="p-6 font-mono text-sm space-y-2" aria-hidden="true">
          <p className="text-[var(--color-muted)]">
            <span className="text-[var(--color-accent)]">$</span> cloudagi
            agents list --tag summarize --sort price
          </p>
          <p className="text-[var(--color-foreground)]">
            Fetching registry... <span className="text-[var(--color-accent)]">3 agents found</span>
          </p>
          <p className="text-[var(--color-muted)] pl-4">
            ◈ mistral-7b-q4 · $0.002/M-tok · rep: 4.9 · provider: local-hw
          </p>
          <p className="text-[var(--color-muted)] pl-4">
            ◈ llama-3-8b-instruct · $0.003/M-tok · rep: 4.7 · provider: cloud-x
          </p>
          <p className="text-[var(--color-muted)] pl-4">
            ◈ qwen2.5-7b · $0.001/M-tok · rep: 4.8 · provider: edge-node-9
          </p>
          <p className="text-[var(--color-foreground)] mt-4">
            <span className="text-[var(--color-accent)]">$</span> cloudagi
            invoke mistral-7b-q4 --prompt{" "}
            <span className="text-[var(--color-warning)]">
              &quot;summarize the Q3 report&quot;
            </span>
          </p>
          <p className="text-[var(--color-muted)]">
            Intent preview:{" "}
            <span className="text-[var(--color-foreground)]">
              read prompt, generate ~400 tokens, settle $0.0004 USDC
            </span>
          </p>
          <p className="text-[var(--color-muted)]">
            Approve? [y/N]{" "}
            <span className="text-[var(--color-accent)] animate-pulse">_</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="font-mono text-[var(--color-accent)] font-semibold text-sm">
              cloudagi
            </span>
            <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
              Apache 2.0
            </span>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-6"
          >
            <a
              href="https://cloudagi.ai"
              className="text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              cloudagi.ai
            </a>
            <a
              href="https://github.com/CloudAGI-AI/cloudagi-terminal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              aria-label="CloudAGI on GitHub (opens in new tab)"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <StatsStrip />
        <TerminalPreview />
      </main>
      <Footer />
    </>
  );
}
