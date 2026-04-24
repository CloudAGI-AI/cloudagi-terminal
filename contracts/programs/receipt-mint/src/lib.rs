//! receipt-mint — CloudAGI per-invocation receipt program.
//!
//! Wave 2: store receipt metadata in a `MintedReceipt` PDA seeded by
//! `invocation_id`, giving deterministic on-chain presence and verifiability
//! without requiring a live Bubblegum tree.
//!
//! Wave 4: wrap Metaplex Bubblegum v2 compressed-NFT mint to produce
//! one cNFT per successful invocation.
//!
//! SPEC §9.4 — minting compressed receipts.
//! SPEC §5.4 — ReceiptOnChain shape.
//! SPEC §7.3 — Receipt program instructions.
//!
//! NOTE on external program accounts:
//! `mpl-bubblegum ^1` and `spl-account-compression ^0.4` both depend on
//! `solana-program ^1.18`, while `anchor-lang ^0.32` requires
//! `solana-program ^2.x`. Importing ID constants from those crates causes
//! `#[derive(Accounts)]` to fail with a `Pubkey` type mismatch.
//! All external program accounts are therefore `UncheckedAccount` with
//! `/// CHECK:` doc comments; address verification is deferred to the
//! Wave 4 CPI layer where the toolchain versions will be reconciled.
// TODO: replace with real declare_id! after first `anchor build` + deploy
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ---------------------------------------------------------------------------
// PDA seed constants
// ---------------------------------------------------------------------------

pub const REGISTRY_SEED: &[u8] = b"receipt_registry";
pub const RECEIPT_SEED:  &[u8] = b"receipt";

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod receipt_mint {
    use super::*;

    /// Initialise the platform merkle tree registry PDA.
    ///
    /// Validates and stores `tree_authority`, `depth`, and `buffer_size` on
    /// the `ReceiptRegistry` PDA.
    ///
    /// SPEC §9.4 — platform-owned merkle tree.
    ///
    /// TODO(wave-4): wire mpl-bubblegum CPI — see `.internal/research/chain-stack.md`
    pub fn initialize_tree(
        ctx: Context<InitializeTree>,
        depth: u32,
        buffer_size: u32,
    ) -> Result<()> {
        require!(depth > 0, ReceiptError::InvalidTreeParams);
        require!(buffer_size > 0, ReceiptError::InvalidTreeParams);

        let bump          = ctx.bumps.registry;
        let authority_key = ctx.accounts.authority.key();
        let tree_key      = ctx.accounts.merkle_tree.key();
        let tree_auth_key = ctx.accounts.tree_authority.key();

        let registry = &mut ctx.accounts.registry;
        registry.authority      = authority_key;
        registry.tree           = tree_key;
        registry.tree_authority = tree_auth_key;
        registry.depth          = depth;
        registry.buffer_size    = buffer_size;
        registry.merkle_count   = 0;
        registry.bump           = bump;

        // TODO(wave-4): CPI to mpl_bubblegum::instructions::CreateTree to
        // initialise the on-chain concurrent merkle tree. Recommended params:
        //   max_depth=20, max_buffer_size=64 (supports ~1 M leaves).
        // See `.internal/research/chain-stack.md` for integration notes.

        Ok(())
    }

    /// Store receipt metadata on-chain in a `MintedReceipt` PDA.
    ///
    /// Seeded by `["receipt", invocation_id]` for deterministic lookup.
    /// Increments the registry counter.
    ///
    /// TODO(wave-4): migrate to compressed NFT via Bubblegum — replace PDA
    /// storage with a CPI to mpl_bubblegum::instructions::MintV1 and encode
    /// the leaf per SPEC §5.4.
    pub fn mint_receipt(
        ctx: Context<MintReceipt>,
        metadata: ReceiptMetadata,
    ) -> Result<()> {
        let clock     = Clock::get()?;
        let bump      = ctx.bumps.minted_receipt;
        let buyer_key = ctx.accounts.owner.key();
        let agent_key = ctx.accounts.agent.key();
        let minted_at = clock.unix_timestamp;

        // Persist receipt metadata to the deterministic PDA.
        let minted = &mut ctx.accounts.minted_receipt;
        minted.invocation_id     = metadata.invocation_id;
        minted.prompt_hash       = metadata.prompt_hash;
        minted.output_hash       = metadata.output_hash;
        minted.tokens_in         = metadata.tokens_in;
        minted.tokens_out        = metadata.tokens_out;
        minted.flags_bitmap      = metadata.flags_bitmap;
        minted.settlement_amount = metadata.settlement_amount;
        minted.settlement_sig    = metadata.settlement_sig;
        minted.buyer             = buyer_key;
        minted.agent             = agent_key;
        minted.minted_at         = minted_at;
        minted.bump              = bump;

        // Increment registry counter.
        let registry = &mut ctx.accounts.registry;
        registry.merkle_count = registry
            .merkle_count
            .checked_add(1)
            .ok_or(ReceiptError::CounterOverflow)?;

        emit!(ReceiptMinted {
            invocation_id: metadata.invocation_id,
            buyer:         buyer_key,
            agent:         agent_key,
            minted_at,
        });

        Ok(())
    }

    /// Verify that a receipt exists on-chain by looking up its `MintedReceipt` PDA.
    ///
    /// Returns successfully if the PDA exists and its `invocation_id` matches.
    /// Returns `ReceiptError::AssetNotFound` if the account was never initialised.
    ///
    /// Bubblegum merkle-proof verification is deferred to Wave 4.
    pub fn verify_receipt(
        ctx: Context<VerifyReceipt>,
        invocation_id: [u8; 16],
    ) -> Result<()> {
        // The PDA constraint enforces seed match; explicit field guard below
        // is belt-and-suspenders for defence-in-depth.
        require!(
            ctx.accounts.minted_receipt.invocation_id == invocation_id,
            ReceiptError::AssetNotFound
        );

        // TODO(wave-4): additionally verify the leaf proof against the
        // concurrent merkle tree via spl_account_compression::verify_leaf CPI,
        // using proof accounts passed through remaining_accounts.

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(depth: u32, buffer_size: u32)]
pub struct InitializeTree<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer  = authority,
        space  = ReceiptRegistry::SPACE,
        seeds  = [REGISTRY_SEED],
        bump,
    )]
    pub registry: Account<'info, ReceiptRegistry>,

    /// CHECK: Bubblegum tree authority PDA — derived and verified in Wave 4
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: Concurrent merkle tree account — created via Bubblegum CPI in Wave 4
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: mpl-bubblegum program — address verified against MPL_BUBBLEGUM_ID
    /// in Wave 4 when the solana-program version conflict is resolved
    pub bubblegum_program: UncheckedAccount<'info>,

    /// CHECK: spl-account-compression program — address verified in Wave 4
    pub compression_program: UncheckedAccount<'info>,

    /// CHECK: spl-noop program — address verified in Wave 4
    pub noop_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata: ReceiptMetadata)]
pub struct MintReceipt<'info> {
    /// The facilitator signer — platform authority.
    #[account(mut)]
    pub facilitator: Signer<'info>,

    #[account(
        mut,
        seeds   = [REGISTRY_SEED],
        bump    = registry.bump,
        has_one = authority,
    )]
    pub registry: Account<'info, ReceiptRegistry>,

    /// CHECK: platform authority — validated via has_one on registry
    pub authority: UncheckedAccount<'info>,

    /// CHECK: buyer wallet — will own the cNFT in Wave 4
    pub owner: UncheckedAccount<'info>,

    /// CHECK: agent registry PDA — verified off-chain
    pub agent: UncheckedAccount<'info>,

    /// On-chain receipt PDA — deterministic by invocation_id.
    #[account(
        init,
        payer  = facilitator,
        space  = MintedReceipt::SPACE,
        seeds  = [RECEIPT_SEED, metadata.invocation_id.as_ref()],
        bump,
    )]
    pub minted_receipt: Account<'info, MintedReceipt>,

    /// CHECK: tree authority PDA — verified by Bubblegum CPI in Wave 4
    #[account(mut)]
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: concurrent merkle tree — verified by Bubblegum CPI in Wave 4
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: mpl-bubblegum program — address verified in Wave 4
    pub bubblegum_program: UncheckedAccount<'info>,

    /// CHECK: spl-account-compression program — address verified in Wave 4
    pub compression_program: UncheckedAccount<'info>,

    /// CHECK: spl-noop program — address verified in Wave 4
    pub noop_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(invocation_id: [u8; 16])]
pub struct VerifyReceipt<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [REGISTRY_SEED],
        bump  = registry.bump,
    )]
    pub registry: Account<'info, ReceiptRegistry>,

    /// The PDA that proves the receipt was minted.
    #[account(
        seeds = [RECEIPT_SEED, invocation_id.as_ref()],
        bump  = minted_receipt.bump,
    )]
    pub minted_receipt: Account<'info, MintedReceipt>,

    /// CHECK: spl-account-compression program — merkle proof via
    /// remaining_accounts in Wave 4
    pub compression_program: UncheckedAccount<'info>,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Global registry PDA tracking the platform merkle tree and mint counter.
///
/// SPEC §9.4 — platform-owned merkle tree, one per deployment.
#[account]
#[derive(Debug)]
pub struct ReceiptRegistry {
    /// Platform authority allowed to mint receipts.
    pub authority: Pubkey,
    /// Bubblegum tree authority PDA.
    pub tree_authority: Pubkey,
    /// The concurrent merkle tree account.
    pub tree: Pubkey,
    /// Max depth of the concurrent merkle tree (e.g. 20 → ~1 M leaves).
    pub depth: u32,
    /// Max buffer size of the concurrent merkle tree (e.g. 64).
    pub buffer_size: u32,
    /// Running count of minted receipts (for stats / rate limits).
    pub merkle_count: u64,
    /// PDA bump.
    pub bump: u8,
}

impl ReceiptRegistry {
    // discriminator(8) + authority(32) + tree_authority(32) + tree(32)
    // + depth(4) + buffer_size(4) + merkle_count(8) + bump(1)
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 4 + 4 + 8 + 1;
}

/// Per-invocation receipt PDA.
///
/// Stores the full SPEC §5.4 ReceiptOnChain digest fields on-chain so that
/// any party can verify a receipt without requiring Bubblegum merkle proofs.
/// Wave 4 will add the cNFT layer on top of this.
#[account]
#[derive(Debug)]
pub struct MintedReceipt {
    /// ULID bytes of the invocation (16 bytes, big-endian). Part of PDA seed.
    pub invocation_id: [u8; 16],
    /// sha256( canonical_json({ prompt, params, agentId, sessionId }) )
    /// SPEC §9.2.
    pub prompt_hash: [u8; 32],
    /// sha256( canonical_json({ output, toolCalls, usage, flags }) )
    /// SPEC §9.2.
    pub output_hash: [u8; 32],
    /// Tokens consumed by the prompt (input side).
    pub tokens_in: u32,
    /// Tokens produced by the model (output side).
    pub tokens_out: u32,
    /// Packed flag bits — SPEC §9.3.
    pub flags_bitmap: u32,
    /// Settlement amount in stablecoin base units (USDC = 6 decimals).
    pub settlement_amount: u64,
    /// Facilitator ed25519 signature over the settlement payload.
    pub settlement_sig: [u8; 64],
    /// Buyer wallet that owns this receipt.
    pub buyer: Pubkey,
    /// Agent that handled the invocation.
    pub agent: Pubkey,
    /// Unix timestamp when this receipt was minted.
    pub minted_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl MintedReceipt {
    // discriminator(8) + invocation_id(16) + prompt_hash(32) + output_hash(32)
    // + tokens_in(4) + tokens_out(4) + flags_bitmap(4) + settlement_amount(8)
    // + settlement_sig(64) + buyer(32) + agent(32) + minted_at(8) + bump(1)
    pub const SPACE: usize =
        8 + 16 + 32 + 32 + 4 + 4 + 4 + 8 + 64 + 32 + 32 + 8 + 1;
}

// ---------------------------------------------------------------------------
// Instruction argument structs
// ---------------------------------------------------------------------------

/// Caller-supplied receipt metadata for `mint_receipt`.
///
/// Mirrors SPEC §5.4 — ReceiptOnChain digest fields.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReceiptMetadata {
    /// ULID bytes of the invocation (16 bytes, big-endian).
    pub invocation_id: [u8; 16],
    /// sha256( canonical_json({ prompt, params, agentId, sessionId }) )
    pub prompt_hash: [u8; 32],
    /// sha256( canonical_json({ output, toolCalls, usage, flags }) )
    pub output_hash: [u8; 32],
    /// Tokens consumed by the prompt (input side).
    pub tokens_in: u32,
    /// Tokens produced by the model (output side).
    pub tokens_out: u32,
    /// Packed flag bits — SPEC §9.3.
    ///
    /// Bit 0: prompt injection, Bit 1: unsafe output, Bit 2: PII,
    /// Bit 3: tool called, Bit 4: tool blocked, Bit 5: partial stream,
    /// Bit 6: output truncated, Bit 7: input rejected.
    pub flags_bitmap: u32,
    /// Settlement amount in stablecoin base units (USDC = 6 decimals).
    pub settlement_amount: u64,
    /// Facilitator ed25519 signature over the settlement payload.
    pub settlement_sig: [u8; 64],
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// Emitted when a receipt PDA is minted for an invocation.
#[event]
pub struct ReceiptMinted {
    pub invocation_id: [u8; 16],
    pub buyer:         Pubkey,
    pub agent:         Pubkey,
    pub minted_at:     i64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum ReceiptError {
    #[msg("Receipt counter arithmetic overflow")]
    CounterOverflow,
    #[msg("Merkle tree has not been initialised")]
    TreeNotInitialized,
    #[msg("Signer is not the platform authority")]
    Unauthorized,
    #[msg("Receipt PDA not found for the given invocation_id")]
    AssetNotFound,
    #[msg("depth and buffer_size must both be greater than zero")]
    InvalidTreeParams,
}
