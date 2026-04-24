# Contributing

## PR Workflow

1. Fork or branch from `overnight-sprint` (or `main` for post-sprint work).
2. Name your branch: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, or `docs/<slug>`.
3. Open a draft PR early to signal work in progress.
4. Mark ready for review once CI is green and self-review is complete.
5. At least one approval is required before merge. No force-pushes to `main`.

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`

**Examples:**
- `feat(server): add HTTP 402 session handshake`
- `fix(shared): correct receipt digest field type`
- `chore(ci): pin bun version to 1.3`

## Test Requirement

All PRs must include tests for new behavior. CI enforces:

- `bun run lint` — Biome check must pass with zero errors.
- `bun run typecheck` — All workspaces must typecheck cleanly.
- `bun run test` — All unit tests must pass.

Run `bash scripts/smoke.sh` locally before pushing.

## Branch Naming

| Prefix   | Use case                          |
|----------|-----------------------------------|
| `feat/`  | New features                      |
| `fix/`   | Bug fixes                         |
| `chore/` | Tooling, deps, config changes     |
| `docs/`  | Documentation only                |
| `test/`  | Test-only changes                 |
