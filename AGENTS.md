# AGENTS.md — CloudAGI Monorepo Agent Guide

This file is read by Claude, Codex, and other AI coding agents operating in this repository.

## Monorepo Layout

```
cloudagi-terminal/
  apps/
    web/          Next.js 15 buyer-facing terminal UI
    server/       Hono API server (HTTP 402, sessions, receipts)
    agent-sdk/    Provider-side adapter library (ESM)
  packages/
    shared/       Shared types, utilities, and constants
  contracts/      Anchor (Solana) programs
  docs/           Architecture, contributing, roadmap, SPEC
  scripts/        bootstrap.sh, smoke.sh
  .github/
    workflows/    CI (lint, typecheck, test) + Anchor workflow
```

## Branch Policy

- `main` is protected. Never push directly to `main`.
- All changes require a pull request with at least one review before merging.
- Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- The active sprint branch is `overnight-sprint`.

## Running Tests Locally

```bash
# Install deps
bun install

# Typecheck all workspaces
bun run typecheck

# Lint
bun run lint

# Run all unit tests
bun run test

# Full smoke check (typecheck + lint + tests)
bash scripts/smoke.sh
```

## Workspace Ownership

Each workspace is independently owned during parallel sprints:
- `apps/*` — application-layer workers only.
- `packages/*` — shared library workers only.
- `contracts/*` — Anchor/Solana workers only.
- Root config files (`biome.json`, `vitest.config.ts`, CI workflows) — Wave 1 worker only.

## Commit Convention

Use Conventional Commits: `type(scope): description`
Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `perf`.
Example: `feat(server): add HTTP 402 session handshake endpoint`

## Key Constraints

- TypeScript strict mode everywhere. No `any`.
- ESM-first: `.js` extensions in relative imports.
- All PRs must pass CI (lint + typecheck + tests) before merge.
