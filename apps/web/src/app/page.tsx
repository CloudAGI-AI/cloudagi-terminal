import Link from "next/link";
import { cn } from "@/lib/cn";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

// Data ────────────────────────────────────────────────────────────────────────

const PROBLEM_STATS = [
  { value: "~30%", label: "Average utilization on paid AI subscriptions" },
  { value: "0", label: "Public markets where you can resell tokens you generate" },
  { value: "5+", label: "Active agent subscriptions per AI engineer" },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "List your capacity",
    body:
      "Connect a credit pool, a local Ollama endpoint, or a fine-tuned agent. Set a price in USDC per million tokens. CloudAGI advertises it on the marketplace.",
  },
  {
    n: "02",
    title: "Buyers pay per call",
    body:
      "A buyer hits your endpoint over HTTP. The server returns 402 with a price quote. The buyer signs a USDC payment on Solana. Settlement clears in under a second. Your endpoint streams the response.",
  },
  {
    n: "03",
    title: "Receipts that prove the work",
    body:
      "Every call mints a sub-cent compressed NFT receipt. Input hash, output hash, token usage, settlement signature. Auditable forever. Useful for governance, accounting, and reputation.",
  },
  {
    n: "04",
    title: "Reputation that compounds",
    body:
      "Providers earn a tokens per watt per dollar score over time. Buyers pick by efficiency. Dishonest providers get slashed. The marketplace gets cleaner the longer it runs.",
  },
] as const;

type CompareCell = boolean | "varies" | "partial";
type CompareRow = readonly [feature: string, mine: CompareCell, theirs: CompareCell];

const COMPARE: readonly CompareRow[] = [
  ["Sell tokens you generate yourself", true, false],
  ["Register a local Ollama or vLLM endpoint", true, false],
  ["USDC settlement on a public chain", true, "varies"],
  ["Per-call cNFT receipts", true, false],
  ["Open source runtime (Local AGI)", true, false],
  ["Reputation that follows the wallet", true, "partial"],
];

const PROJECTS = [
  {
    badge: "open source",
    title: "Local AGI",
    sub: "Open source agent runtime",
    body:
      "The runtime that powers CloudAGI. Local AGI handles credit metering, proxy execution, and x402 payment settlement. Run it locally, contribute to the protocol, or build on top of it.",
    chips: ["TypeScript", "Rust", "x402", "Solana", "USDC"],
    cta: { label: "View on GitHub", href: "https://github.com/aryateja2106/cloudagi" },
  },
  {
    badge: "beta",
    title: "Credit Probe CLI",
    sub: "Detect your idle agent capacity",
    body:
      "A command line tool that scans your installed agent subscriptions and shows exactly how much capacity you waste each month. First step before listing on the marketplace.",
    chips: ["TypeScript", "Bun", "Claude", "Cursor", "Codex"],
    cta: { label: "Join waitlist", href: "#waitlist" },
  },
  {
    badge: "in development",
    title: "CloudAGI Marketplace",
    sub: "Buy and sell agent compute",
    body:
      "The main platform. Browse available capacity from credit pools and self-hosted models. Submit a task, pay in USDC, get a receipt on Solana. Built for engineers who need burst compute without another subscription.",
    chips: ["Next.js", "Hono", "x402", "Solana", "cNFT"],
    cta: { label: "Join waitlist", href: "#waitlist" },
  },
] as const;

const SELLER_LIST = [
  { name: "Claude Max", state: "68% idle", tone: "warn" as const },
  { name: "Gemma 3 8B (local)", state: "online", tone: "ok" as const },
  { name: "Qwen3 7B (local)", state: "online", tone: "ok" as const },
  { name: "Specialized agent", state: "online", tone: "ok" as const },
];

const BUYER_LIST = [
  "No subscription needed",
  "Pay per call in USDC",
  "Burst capacity on demand",
  "Open weights, not just hosted",
];

// Components ─────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm tracking-tight">
          <span className="text-[var(--color-accent)]">◈</span>
          <span className="font-semibold text-[var(--color-foreground)]">cloudagi</span>
        </Link>
        <nav aria-label="Primary" className="hidden sm:flex items-center gap-6 font-mono text-xs">
          <a href="#how" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">How it works</a>
          <a href="#thesis" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">Thesis</a>
          <a href="#projects" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">Open source</a>
          <a href="/status.html" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">Build status</a>
          <a href="https://github.com/aryateja2106/cloudagi" target="_blank" rel="noopener noreferrer" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">GitHub</a>
          <a href="#waitlist" className="px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-dim)] transition-colors font-medium">Join waitlist</a>
        </nav>
      </div>
    </header>
  );
}

function ValidatedBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-glow)] text-[var(--color-accent)] text-xs font-mono">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden="true" />
      Validated at Nevermined Autonomous Business Hackathon
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative pt-20 pb-12 px-6 text-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 35% at 50% 0%, var(--color-accent-glow), transparent 60%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto">
        <ValidatedBadge />
        <h1
          id="hero-heading"
          className="mt-8 font-mono font-semibold tracking-tight text-[var(--color-foreground)] text-4xl sm:text-5xl md:text-6xl leading-[1.05]"
        >
          Sell tokens,
          <br />
          <span className="text-[var(--color-accent)]">not subscriptions.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[var(--color-muted)] font-mono leading-relaxed">
          Satya Nadella called tokens per watt per dollar the new currency of AI.
          CloudAGI is the marketplace where that unit becomes priceable, settable, and earnable on-chain.
        </p>
        <p className="mt-4 max-w-2xl mx-auto text-sm text-[var(--color-muted-foreground)] font-mono leading-relaxed">
          Anthropic credits sitting unused. A Gemma 3 running on your 4090 at 4am. Qwen3 on a Mac Studio.
          Specialized agents you tuned on your own data. CloudAGI prices each one per call, settles in USDC,
          and writes a receipt to Solana.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <a
            href="#waitlist"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium",
              "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
              "hover:bg-[var(--color-accent-dim)] transition-colors",
            )}
          >
            Join waitlist <span aria-hidden="true">→</span>
          </a>
          <a
            href="/status.html"
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium",
              "border border-[var(--color-border)] text-[var(--color-foreground)]",
              "hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)] transition-colors",
            )}
          >
            <span className="text-[var(--color-accent)]" aria-hidden="true">◈</span>
            Live build status
          </a>
        </div>
        <p className="mt-4 text-xs font-mono text-[var(--color-muted-foreground)]">
          No spam. Early access notification only.
        </p>
      </div>
    </section>
  );
}

function FlowVisual() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-12" aria-label="Marketplace flow visual">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Sellers */}
        <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] mb-4">Sellers</div>
          <ul className="space-y-2 font-mono text-sm">
            {SELLER_LIST.map((s) => (
              <li key={s.name} className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 last:border-0">
                <span className="text-[var(--color-foreground)]">{s.name}</span>
                <span
                  className={cn(
                    "text-xs",
                    s.tone === "ok" ? "text-[var(--color-accent)]" : "text-[var(--color-warning)]",
                  )}
                >
                  {s.state}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] text-xs font-mono text-[var(--color-muted)]">
            Earning <span className="text-[var(--color-accent)]">$47/mo</span>
          </div>
        </div>

        {/* CloudAGI */}
        <div className="border border-[var(--color-accent)]/40 rounded-xl bg-[var(--color-surface-raised)] p-6 flex flex-col items-center justify-center text-center relative shadow-[var(--shadow-accent)]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] mb-2">Routing</div>
          <div className="font-mono text-2xl font-semibold text-[var(--color-foreground)]">
            <span className="text-[var(--color-accent)]">◈</span> CloudAGI
          </div>
          <div className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">x402 settlement · USDC per million tokens</div>
          <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono text-[var(--color-accent)] border border-[var(--color-accent)]/30 bg-[var(--color-accent-glow)] px-2 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            live on solana devnet
          </div>
        </div>

        {/* Buyers */}
        <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] mb-4">Buyers</div>
          <ul className="space-y-2 font-mono text-sm text-[var(--color-foreground)]">
            {BUYER_LIST.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-0.5">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] text-xs font-mono text-[var(--color-muted)]">
            Saving <span className="text-[var(--color-accent)]">60% vs retail</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">
          The unit nobody could sell
        </h2>
        <p className="mt-4 max-w-2xl mx-auto font-mono text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
          Big providers eat the margin between cost and price.
          Self-hosters have no clean way to charge.
          Subscriptions sit half used.
          Specialized agents stay locked inside the wallets of the people who built them.
          There is no public market for the actual unit of work, only services that rent access to one.
        </p>
        <dl className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PROBLEM_STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <dd className="font-mono text-4xl font-semibold text-[var(--color-accent)] tabular-nums">{s.value}</dd>
              <dt className="font-mono text-xs text-[var(--color-muted)] max-w-[200px] leading-relaxed">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-20" aria-labelledby="how-heading">
      <header className="text-center mb-12">
        <h2 id="how-heading" className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">
          How it works
        </h2>
        <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
          Four steps from idle capacity to settled USDC
        </p>
      </header>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HOW_IT_WORKS.map((step) => (
          <li key={step.n} className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6 hover:border-[var(--color-accent)]/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-xs text-[var(--color-accent)] font-semibold">{step.n}</span>
              <h3 className="font-mono text-lg font-semibold text-[var(--color-foreground)]">{step.title}</h3>
            </div>
            <p className="font-mono text-sm text-[var(--color-muted)] leading-relaxed">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ThesisSection() {
  return (
    <section
      id="thesis"
      className="max-w-4xl mx-auto px-6 py-20"
      aria-labelledby="thesis-heading"
    >
      <header className="text-center mb-10">
        <div className="inline-block font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent)] border border-[var(--color-accent)]/30 bg-[var(--color-accent-glow)] px-2 py-1 rounded">
          The thesis
        </div>
        <h2
          id="thesis-heading"
          className="mt-4 font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight"
        >
          Agents reselling agents
        </h2>
      </header>
      <div className="space-y-5 font-mono text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
        <p>
          The first wave of APIs sold compute. The second sold data. The third sells intelligence.
        </p>
        <p>
          CloudAGI is built for the case where the seller is also using an agent to fulfill the order.
          Your Claude Sonnet routes a task to a Qwen3 running on someone&apos;s home server.
          That Qwen calls a fine-tuned Gemma you trained on legal contracts, medical claims, or your own playbook.
          Every hop pays the layer below it.
        </p>
        <p className="text-[var(--color-foreground)]">
          Specialized human knowledge meets model intelligence at every step. The wallet does the accounting.
        </p>
        <p>
          That is the next layer of APIs. Not a service company in the middle. A protocol where any wallet can
          register, get paid per call, and earn reputation that follows it across the network.
        </p>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">Where CloudAGI fits</h2>
          <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">A protocol, not a service</p>
        </header>
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-medium">Capability</th>
                <th className="text-center px-5 py-3 text-[10px] uppercase tracking-widest text-[var(--color-accent)] font-medium">CloudAGI</th>
                <th className="text-center px-5 py-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-medium">Hosted providers</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([feature, mine, theirs]) => (
                <tr key={String(feature)} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="px-5 py-3.5 text-[var(--color-foreground)]">{feature}</td>
                  <td className="text-center px-5 py-3.5">
                    {mine === true ? <span className="text-[var(--color-accent)]">✓</span> : <span className="text-[var(--color-muted-foreground)]">·</span>}
                  </td>
                  <td className="text-center px-5 py-3.5">
                    {theirs === true ? (
                      <span className="text-[var(--color-accent)]">✓</span>
                    ) : theirs === false ? (
                      <span className="text-[var(--color-muted-foreground)]">·</span>
                    ) : (
                      <span className="text-[var(--color-warning)] text-xs">{theirs}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProjectsGrid() {
  return (
    <section id="projects" className="max-w-6xl mx-auto px-6 py-20">
      <header className="text-center mb-12">
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">
          What we ship
        </h2>
        <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
          Open source infrastructure for the agent credit economy
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROJECTS.map((p) => (
          <article key={p.title} className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] mb-2">{p.badge}</div>
            <h3 className="font-mono text-lg font-semibold text-[var(--color-foreground)]">{p.title}</h3>
            <div className="font-mono text-xs text-[var(--color-muted)] mt-1 mb-4">{p.sub}</div>
            <p className="font-mono text-sm text-[var(--color-muted)] leading-relaxed flex-1">{p.body}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.chips.map((c) => (
                <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-surface-raised)]">
                  {c}
                </span>
              ))}
            </div>
            <a
              href={p.cta.href}
              target={p.cta.href.startsWith("http") ? "_blank" : undefined}
              rel={p.cta.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-accent)] hover:text-[var(--color-foreground)] transition-colors"
            >
              {p.cta.label} <span aria-hidden="true">→</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function WaitlistSection() {
  return (
    <section id="waitlist" className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-20 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">
          Get early access
        </h2>
        <p className="mt-3 font-mono text-sm text-[var(--color-muted)]">
          We are opening the marketplace to a limited set of early sellers and buyers.
          Join the waitlist and we will reach out when your spot is ready.
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
        <p className="mt-3 text-xs font-mono text-[var(--color-muted-foreground)]">
          No spam. Early access notification only.
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20 text-center">
      <h2 className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)] tracking-tight">
        Your idle capacity is already worth something
      </h2>
      <p className="mt-4 font-mono text-sm text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">
        List a credit pool. Plug in a local model. Sell what your specialized agents already know.
        Get paid in USDC the moment work clears.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
        <a
          href="#waitlist"
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium",
            "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
            "hover:bg-[var(--color-accent-dim)] transition-colors",
          )}
        >
          Join the waitlist <span aria-hidden="true">→</span>
        </a>
        <a
          href="/status.html"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-sm font-medium border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-accent)]/60 hover:text-[var(--color-accent)] transition-colors"
        >
          Read the build log
        </a>
      </div>
      <div className="mt-8 text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted-foreground)]">
        Built at Nevermined Autonomous Business Hackathon · AWS Builder Loft SF
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 font-mono text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[var(--color-accent)]">◈</span>
            <span className="font-semibold text-[var(--color-foreground)]">cloudagi</span>
          </div>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            The marketplace and protocol for the actual unit of AI work. Tokens per watt per dollar.
            Settled in USDC. Receipted on Solana.
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Built in San Francisco
          </p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">Company</div>
          <ul className="space-y-2 text-xs text-[var(--color-muted)]">
            <li><a href="#thesis" className="hover:text-[var(--color-foreground)] transition-colors">Thesis</a></li>
            <li><a href="#projects" className="hover:text-[var(--color-foreground)] transition-colors">Open source</a></li>
            <li><a href="https://github.com/aryateja2106/cloudagi" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-foreground)] transition-colors">GitHub</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">Product</div>
          <ul className="space-y-2 text-xs text-[var(--color-muted)]">
            <li><a href="#how" className="hover:text-[var(--color-foreground)] transition-colors">How it works</a></li>
            <li><a href="#projects" className="hover:text-[var(--color-foreground)] transition-colors">Local AGI</a></li>
            <li><a href="/status.html" className="hover:text-[var(--color-foreground)] transition-colors">Build status</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">Legal</div>
          <ul className="space-y-2 text-xs text-[var(--color-muted)]">
            <li><span className="text-[var(--color-muted-foreground)]">Privacy policy · soon</span></li>
            <li><span className="text-[var(--color-muted-foreground)]">Terms of service · soon</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-border-subtle)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest">
          <div>2026 CloudAGI · All rights reserved</div>
          <div>Cloud Agent General Infrastructure</div>
        </div>
      </div>
    </footer>
  );
}

// Page ───────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <FlowVisual />
        <ProblemSection />
        <HowItWorks />
        <ThesisSection />
        <ComparisonTable />
        <ProjectsGrid />
        <WaitlistSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
