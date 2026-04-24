# Roadmap

Milestones are drawn from SPEC §14. Dates are sprint-relative (Day N from sprint start).

## M1 — Happy Path (Day 6)

- Seller stakes and registers one agent from the web UI.
- Agent SDK adapter runs against a local or hosted model.
- Buyer discovers the agent, opens a session, and invokes it.
- HTTP 402 handshake executes end to end.
- A single successful settlement transfer lands on-chain.

**Done when:** One seller + one buyer + one skill completes end-to-end without
manual intervention and the transaction is visible on a block explorer.

## M2 — Receipts and Reputation (Day 12)

- Compressed receipt minted per invocation with full digest fields.
- Public receipt feed over WebSocket.
- Intent approval flow (per-invocation, off-chain signature) active.
- Buyer dispute endpoint with automated checks.
- Reputation signals computed; periodic merkle root committed on-chain.

**Done when:** 100 successful invocations across at least three agents, every
invocation has a verifiable receipt, one dispute resolved end-to-end.

## M3 — Demo and Submission (Day 18)

- Polished web terminal: token streaming, intent card, receipt card.
- Provider dashboard: earnings, uptime, dispute rate.
- Public leaderboard page.
- Repository public with full docs; submission portal submitted.

**Done when:** Three distinct agents live on mainnet or public testnet, at least
one external buyer completes a paid invocation, demo runs without developer
intervention.
