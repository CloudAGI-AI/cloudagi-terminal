# CloudAGI — Test Suite

This directory contains the three test tiers for the CloudAGI monorepo.
All tests are written test-first (TDD red phase) and define the contract
that Wave-2 and Wave-3 green-phase implementations must satisfy.

---

## Tier 1 — Unit Tests (per-package)

Location: each package's own `src/*.test.ts`

- `packages/shared/src/**/*.test.ts`
- `apps/server/src/**/*.test.ts`
- `apps/agent-sdk/src/**/*.test.ts`

These test a single module in isolation with no inter-package imports.
Run from the workspace root:

```
bun test
```

---

## Tier 2 — Integration Tests

Location: `tests/integration/`

Cross-package tests that wire real implementations from two or more packages
together. No network required — the Hono server is exercised via
`app.request()` (no TCP port) and the agent-sdk is called programmatically.

| File | What it tests |
|---|---|
| `server-x402.test.ts` | GET /v1/agents envelope, POST /v1/agents/:id/invoke 402 gate + x402 headers, post-payment success path |
| `agent-lifecycle.test.ts` | registerAgent() → listed by server, serveAgent() invocation, receipt event hashes + token counts, heartbeat |
| `receipt-integrity.test.ts` | promptHash/outputHash construction, token count plausibility, prompt-injection flag detection |
| `schema-roundtrip.test.ts` | Every @cloudagi/shared Zod schema parses valid fixtures and rejects invalid ones; constants are internally consistent |

Run integration tests:

```
cd tests/integration && bun test
# or from workspace root:
bun vitest run --project tests/integration
```

---

## Tier 3 — End-to-End Tests

Location: `tests/e2e/`

Full scripted flows that exercise the entire system from the user's perspective.
They follow the SPEC §4 end-to-end flows step by step. Each test describes
one observable state transition in the protocol.

| File | Perspective | Flow |
|---|---|---|
| `buy-flow.test.ts` | Buyer | Register agent → discover → open session → 402 → sign → intent approval → invoke → receipt + feed |
| `sell-flow.test.ts` | Seller | Onboarding → registration → heartbeat → serve invocations → earnings → agent management → reputation |

Fixtures used by e2e tests are in `tests/e2e/fixtures/`:

| File | Contents |
|---|---|
| `sample-prompts.json` | 20 prompts covering 7 skill tags |
| `sample-agents.json` | 5 fully specified agent descriptors |
| `sample-intent-scopes.json` | 3 intent scope configurations (minimal, per-session, with tools) |

Run e2e tests:

```
cd tests/e2e && bun test
# or from workspace root:
bun vitest run --project tests/e2e
```

---

## Red/Green Status

All integration and e2e tests are currently RED (failing). This is intentional —
they are the specification of "working". Waves 2 and 3 make them green by
implementing the real route logic, persistence, x402 middleware, and SDK
on-chain calls.

The only tests that turn green without Wave-2 work are the `schema-roundtrip`
tests, because `@cloudagi/shared` is already fully implemented.

---

## SPEC Traceability

| Test file | SPEC sections |
|---|---|
| `server-x402.test.ts` | §4.2, §7.1, §8.2 |
| `agent-lifecycle.test.ts` | §4.1, §4.2, §5.1, §6.4 |
| `receipt-integrity.test.ts` | §5.3, §5.4, §9.2, §9.3 |
| `schema-roundtrip.test.ts` | §5 (all sub-sections) |
| `buy-flow.test.ts` | §4.2, §7.1, §8.2, §9 |
| `sell-flow.test.ts` | §3.1, §4.1, §7.1, §8.3, §8.5, §11 |
