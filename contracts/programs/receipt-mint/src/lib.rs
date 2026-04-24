//! receipt-mint — CloudAGI per-invocation receipt program.
//!
//! Wraps Metaplex Bubblegum v2 compressed-NFT mint to produce one on-chain
//! receipt per successful invocation. Each receipt leaf commits:
//!   invocation_id, prompt_hash, output_hash, token counts,
//!   flags_bitmap, settlement_amount, settlement_sig.
//!
//! SPEC §9.4 — minting compressed receipts.
//! SPEC §5.4 — ReceiptOnChain shape.
//! SPEC §7.3 — Receipt program instructions.
//!
//! All instruction bodies are stubs (Ok(())). Wave 2/3 will fill Bubblegum
//! CPI calls and leaf encoding.
// TODO: replace with real declare_id! after first `anchor build` + deploy
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

// Bubblegum + compression imports — CPIs wired in Wave 2.
// Kept here so crate deps compile and IDL generates correctly.
use mpl_bubblegum::programs::MPL_BUBBLEGUM_ID;
use spl_account_compression::program::SplAccountCompression;
use spl_noop::program::SplNoop;

declare_id!("11111111111111111111111111111111");

// ---------------------------------------------------------------------------
// PDA seed constants
// ---------------------------------------------------------------------------

pub const REGISTRY_SEED: &[u8] = b"receipt_registry";

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod receipt_mint {
    use super::*;

    /// Initialise the platform merkle tree and registry PDA.
    ///
    /// Called once by the platform authority. Creates the Bubblegum tree
    /// account (via CPI) and records its address in the ReceiptRegistry PDA.
    ///
    /// SPEC §9.4 — platform-owned merkle tree.
    #[allow(unused_variables)]
    pub fn initialize_tree(ctx: Context<InitializeTree>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority       = ctx.accounts.authority.key();
        registry.tree            = ctx.accounts.merkle_tree.key();
        registry.tree_authority  = ctx.accounts.tree_authority.key();
        registry.merkle_count    = 0;

        // TODO Wave 2: CPI to mpl_bubblegum::instructions::CreateTree
        // to initialise the on-chain concurrent merkle tree with
        // max_depth=20, max_buffer_size=64 (supports ~1M leaves).
        Ok(())
    }

    /// Mint a compressed receipt NFT for one invocation.
    ///
    /// The facilitator calls this after settlement succeeds. The leaf
    /// encodes all digest fields from SPEC §5.4 (ReceiptOnChain).
    ///
    /// SPEC §7.3 — `mint_receipt` instruction.
    #[allow(unused_variables)]
    pub fn mint_receipt(
        ctx: Context<MintReceipt>,
        metadata: ReceiptMetadata,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;

        // TODO Wave 2: encode leaf data as per SPEC §5.4:
        //   - invocation_id (16 bytes / ulid)
        //   - prompt_hash   (sha256, 32 bytes)
        //   - output_hash   (sha256, 32 bytes)
        //   - tokens_in / tokens_out (u32 each)
        //   - flags_bitmap (u32)  — SPEC §9.3
        //   - settlement_amount (u64)
        //   - settlement_sig ([u8; 64]) — facilitator ed25519 sig
        //
        // TODO Wave 2: CPI to mpl_bubblegum::instructions::MintV1
        // with the encoded leaf data and owner = buyer wallet.

        registry.merkle_count = registry
            .merkle_count
            .checked_add(1)
            .ok_or(ReceiptError::CounterOverflow)?;

        Ok(())
    }

    /// Verify that a receipt asset exists in the on-chain merkle tree.
    ///
    /// SPEC §9.5 — buyer verification path.
    #[allow(unused_variables)]
    pub fn verify_receipt(
        ctx: Context<VerifyReceipt>,
        asset_id: Pubkey,
    ) -> Result<()> {
        // TODO Wave 2: CPI to spl_account_compression::verify_leaf
        // using the proof accounts from remaining_accounts.
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
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

    /// CHECK: Bubblegum tree authority PDA — derived and verified in Wave 2
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: Concurrent merkle tree account — created via Bubblegum CPI in Wave 2
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Verified by address constraint
    #[account(address = MPL_BUBBLEGUM_ID)]
    pub bubblegum_program: UncheckedAccount<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub noop_program:        Program<'info, SplNoop>,
    pub system_program:      Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintReceipt<'info> {
    /// The facilitator signer — platform authority.
    pub facilitator: Signer<'info>,

    #[account(
        mut,
        seeds = [REGISTRY_SEED],
        bump,
        has_one = authority,
    )]
    pub registry: Account<'info, ReceiptRegistry>,

    /// CHECK: platform authority — validated via has_one on registry
    pub authority: UncheckedAccount<'info>,

    /// CHECK: buyer wallet — owns the minted cNFT
    pub owner: UncheckedAccount<'info>,

    /// CHECK: agent registry PDA — verified off-chain
    pub agent: UncheckedAccount<'info>,

    /// CHECK: tree authority PDA — verified by Bubblegum CPI in Wave 2
    #[account(mut)]
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: concurrent merkle tree — verified by Bubblegum CPI in Wave 2
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Verified by address constraint
    #[account(address = MPL_BUBBLEGUM_ID)]
    pub bubblegum_program: UncheckedAccount<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub noop_program:        Program<'info, SplNoop>,
    pub system_program:      Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyReceipt<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [REGISTRY_SEED],
        bump,
    )]
    pub registry: Account<'info, ReceiptRegistry>,

    /// CHECK: concurrent merkle tree — proof provided via remaining_accounts
    pub merkle_tree: UncheckedAccount<'info>,

    pub compression_program: Program<'info, SplAccountCompression>,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Global registry PDA tracking the platform merkle tree.
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
    /// Running count of minted receipts (for stats / rate limits).
    pub merkle_count: u64,
    /// PDA bump.
    pub bump: u8,
}

impl ReceiptRegistry {
    // discriminator(8) + authority(32) + tree_authority(32) + tree(32)
    // + merkle_count(8) + bump(1)
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 1;
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
    #[msg("Asset ID not found in the merkle tree")]
    AssetNotFound,
}
