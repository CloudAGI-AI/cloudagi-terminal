#!/usr/bin/env bash
set -euo pipefail

echo "=== CloudAGI Bootstrap ==="

# Verify bun
if ! command -v bun &>/dev/null; then
  echo "ERROR: bun is not installed. Install from https://bun.sh" >&2
  exit 1
fi
echo "bun:    $(bun --version)"

# Verify solana
if ! command -v solana &>/dev/null; then
  echo "ERROR: solana CLI is not installed. Install from https://docs.solana.com/cli/install-solana-cli-tools" >&2
  exit 1
fi
echo "solana: $(solana --version)"

# Verify anchor
if ! command -v anchor &>/dev/null; then
  echo "ERROR: anchor CLI is not installed. Install via avm: https://www.anchor-lang.com/docs/installation" >&2
  exit 1
fi
echo "anchor: $(anchor --version)"

# Verify node (needed for some tooling)
if ! command -v node &>/dev/null; then
  echo "WARNING: node is not installed. Some tools may not work." >&2
else
  echo "node:   $(node --version)"
fi

echo ""
echo "All required CLIs present. Run 'bun install' to install dependencies."
