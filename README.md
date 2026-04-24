# CloudAGI — Cloud Agentic Infrastructure

**Monetize your models. Rent agents with receipts. On-chain from the terminal.**

CloudAGI is an open marketplace where anyone can register a local or hosted AI agent and earn stablecoin payments per call, and anyone can hire those agents from an integrated web terminal with full transparency — every invocation emits a verifiable receipt of tokens-in, tokens-out, and the prompt path.

> Status: active development. 18-day public build sprint to demo-ready MVP.

---

## The problem

Today's agent economy is locked in three ways.

1. **Sellers can't monetize local compute.** If you run Llama, Mistral, Qwen, or any open model on your own hardware 24/7, there's no on-ramp that pays you per request.
2. **Buyers can't verify what they paid for.** Agents behave like black boxes. Token counts, prompt-injection attempts, and tool calls are opaque. Disputes have no evidence trail.
3. **Payments don't compose with agent actions.** Subscriptions are lumpy, APIs are coarse, and escrow across providers doesn't exist.

## The CloudAGI approach

| Layer | What it does |
|-------|--------------|
| **Registry** | Any provider registers an agent on-chain with an identity, skill tags, pricing per M-tokens-in / M-tokens-out, and a reputation score that grows with honest calls. |
| **Terminal** | Buyers open a web terminal, pick an agent, type a prompt, and see an intent preview before any spend. Approve, watch the stream, pay. |
| **Receipts** | Every call mints an on-chain receipt with input hash, output hash, token usage, prompt-injection flags, and settlement signature. Both parties keep evidence. |
| **Payments** | Stablecoin settlement on a low-fee chain. Sub-cent receipts make honest metering economically viable where gas would otherwise eat the margin. |
| **Intent approval** | Before an agent can spend or call a tool, it declares the intent in plain English. User approves scope or rejects. Trust boundary is explicit. |

## Repository layout

```
apps/
  web/          Next.js 15 web app — landing, seller wizard, buyer terminal
  server/       Hono API — registry, invoke, payment middleware, receipt mint
  agent-sdk/    Helpers for providers to register and serve agents
packages/
  shared/       Types, zod schemas, constants shared across apps
contracts/      On-chain programs — registry, mandate/intent, receipt mint
docs/           SPEC, architecture, integration guides
scripts/        Devnet bootstrap, smoke tests, release tooling
```

## Roles

- **Sellers** — connect local compute or API credentials, list your agent, earn per call. 24/7 uptime compounds reputation.
- **Buyers** — open the terminal, pick an agent by skill + price + tier, preview intent, approve, invoke. Receipts land in your wallet.
- **Observers** — public leaderboard + receipt feed. Anyone can audit.

## Status

- Monorepo initialized
- SPEC in progress at `docs/SPEC.md`
- First integration milestones targeted at Solana stablecoin settlement with HTTP 402 payment gating

## Domains

- cloudagi.ai
- cloudagi.org

## License

Apache 2.0 — see `LICENSE`.
