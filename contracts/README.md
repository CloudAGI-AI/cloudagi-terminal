# CloudAGI Contracts

Anchor 0.32 workspace — three programs underpinning the CloudAGI on-chain evidence layer.

## Programs

| Program | Purpose |
|---|---|
| `mandate-intent` | Intent mandate PDAs. Buyer declares scope (max spend, allowed tools, duration). Approval signature stored on-chain for recurring invocations (SPEC §10.3). |
| `receipt-mint` | Per-invocation compressed NFT receipts via Metaplex Bubblegum v2. Commits prompt hash, output hash, token counts, flags, settlement sig (SPEC §9.4). |
| `escrow-stake` | Provider stake lock and reputation-based slash. Tier system (Basic/Standard/Premium). Platform authority slashes on dispute outcome (SPEC §11). |

## Build

```bash
anchor build
```

Program IDs are printed after build. Update `declare_id!` in each `src/lib.rs` and `Anchor.toml`.

## Deploy to Devnet

```bash
export ANCHOR_WALLET=~/.config/solana/id.json
anchor deploy --provider.cluster devnet
```

## Run Tests

```bash
anchor test
```

Tests are currently stubs (all `// RED:` annotated). They will pass as placeholders and fail with real assertions once Wave 2/3 logic lands.
