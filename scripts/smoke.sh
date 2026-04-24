#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0

run() {
  local label="$1"
  shift
  echo "--- $label"
  if ! "$@"; then
    echo "FAILED: $label" >&2
    FAILED=1
  fi
}

cd "$ROOT"

# Typecheck all workspaces
run "typecheck packages/shared"   bun run --cwd packages/shared typecheck
run "typecheck apps/server"       bun run --cwd apps/server typecheck
run "typecheck apps/agent-sdk"    bun run --cwd apps/agent-sdk typecheck
run "typecheck apps/web"          bun run --cwd apps/web typecheck

# Lint
run "lint (biome)"                bunx biome check .

# Unit tests
run "unit tests (vitest)"         bunx vitest run

if [[ $FAILED -ne 0 ]]; then
  echo ""
  echo "Smoke check FAILED. See errors above." >&2
  exit 1
fi

echo ""
echo "All smoke checks passed."
