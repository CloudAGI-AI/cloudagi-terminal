//! mandate-intent — CloudAGI on-chain intent mandate program.
//!
//! Stores per-buyer-per-agent scope PDAs (max spend, allowed tools,
//! max duration). An optional elevation from off-chain signatures
//! (the default) to an on-chain mandate for recurring invocation scope.
//!
//! SPEC §10.3 — Intent approval mechanism (elevated / on-chain path).
// TODO: replace with real declare_id! after first `anchor build` + deploy
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ---------------------------------------------------------------------------
// PDA seed constants
// ---------------------------------------------------------------------------

pub const INTENT_SEED:  &[u8] = b"intent";
pub const CONFIG_SEED:  &[u8] = b"mandate_config";

/// Maximum number of allowed-tool hashes stored on-chain.
pub const MAX_ALLOWED_TOOLS: usize = 16;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod mandate_intent {
    use super::*;

    /// Create a new intent mandate PDA.
    ///
    /// The buyer declares the scope they are pre-authorising for a specific
    /// agent: maximum lamport spend, a whitelist of tool fingerprints
    /// (sha256 of canonical tool name), and a duration cap.
    ///
    /// PDA seeds: `["intent", authority, agent, created_nonce.to_le_bytes()]`
    ///
    /// SPEC §10.3 — on-chain mandate path.
    pub fn create_intent(
        ctx: Context<CreateIntent>,
        scope: ScopeArgs,
        created_nonce: u64,
    ) -> Result<()> {
        // --- validation ---
        require!(
            scope.max_spend_lamports > 0,
            MandateError::ZeroSpend
        );
        require!(
            scope.max_duration_secs > 0,
            MandateError::ZeroDuration
        );

        let clock = Clock::get()?;
        let created_at = clock.unix_timestamp;
        let expires_at = created_at
            .checked_add(i64::from(scope.max_duration_secs))
            .ok_or(MandateError::ArithmeticOverflow)?;

        let intent = &mut ctx.accounts.intent_account;
        intent.authority    = ctx.accounts.authority.key();
        intent.agent        = ctx.accounts.agent.key();
        intent.status       = IntentStatus::Pending;
        intent.created_at   = created_at;
        intent.expires_at   = expires_at;
        intent.created_nonce = created_nonce;
        intent.scope        = scope.into_stored()?;
        intent.approval_sig = [0u8; 64]; // populated by approve_intent
        intent.bump         = ctx.bumps.intent_account;

        emit!(IntentCreated {
            authority:     intent.authority,
            agent:         intent.agent,
            created_nonce,
            expires_at,
        });

        Ok(())
    }

    /// Record a buyer's ed25519 approval signature for this intent.
    ///
    /// The signature covers a canonical JSON digest of the scope fields
    /// plus the intent PDA address as the nonce anchor.
    /// Full signature verification (via ed25519 sysvar CPI) is Wave 3.
    pub fn approve_intent(
        ctx: Context<ApproveIntent>,
        signature: [u8; 64],
    ) -> Result<()> {
        let intent = &mut ctx.accounts.intent_account;

        require!(
            intent.status == IntentStatus::Pending,
            MandateError::InvalidStatus
        );
        require!(
            intent.authority == ctx.accounts.authority.key(),
            MandateError::Unauthorized
        );

        intent.approval_sig = signature;
        intent.status       = IntentStatus::Approved;

        // TODO(wave-3): verify ed25519 signature via Instructions sysvar CPI.

        emit!(IntentApproved {
            authority: intent.authority,
            agent:     intent.agent,
        });

        Ok(())
    }

    /// Redeem an approved intent — called by the facilitator at settlement
    /// time to mark the mandate consumed.
    ///
    /// SPEC §10.3 — subsequent invocations reference mandate id.
    pub fn redeem_intent(ctx: Context<RedeemIntent>) -> Result<()> {
        let intent = &mut ctx.accounts.intent_account;
        let clock  = Clock::get()?;

        require!(
            intent.status == IntentStatus::Approved,
            MandateError::InvalidStatus
        );
        require!(
            clock.unix_timestamp <= intent.expires_at,
            MandateError::IntentExpired
        );

        intent.status = IntentStatus::Consumed;

        emit!(IntentConsumed {
            authority: intent.authority,
            agent:     intent.agent,
        });

        Ok(())
    }

    /// Expire an intent that has passed its deadline without being consumed.
    ///
    /// Permissionless — anyone can clean up a stale PDA.
    pub fn expire_intent(ctx: Context<ExpireIntent>) -> Result<()> {
        let intent = &mut ctx.accounts.intent_account;
        let clock  = Clock::get()?;

        require!(
            clock.unix_timestamp > intent.expires_at,
            MandateError::IntentNotExpired
        );
        require!(
            matches!(
                intent.status,
                IntentStatus::Pending | IntentStatus::Approved
            ),
            MandateError::InvalidStatus
        );

        intent.status = IntentStatus::Expired;

        emit!(IntentExpired {
            authority: intent.authority,
            agent:     intent.agent,
        });

        // TODO(wave-3): close PDA and reclaim rent to authority via
        // `close = authority` constraint once PDA lifecycle is finalised.

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Instruction contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(scope: ScopeArgs, created_nonce: u64)]
pub struct CreateIntent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: agent pubkey — validated off-chain against registry PDA
    pub agent: UncheckedAccount<'info>,

    #[account(
        init,
        payer  = authority,
        space  = IntentAccount::SPACE,
        seeds  = [
            INTENT_SEED,
            authority.key().as_ref(),
            agent.key().as_ref(),
            &created_nonce.to_le_bytes(),
        ],
        bump,
    )]
    pub intent_account: Account<'info, IntentAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveIntent<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
            INTENT_SEED,
            authority.key().as_ref(),
            intent_account.agent.as_ref(),
            &intent_account.created_nonce.to_le_bytes(),
        ],
        bump = intent_account.bump,
        has_one = authority,
    )]
    pub intent_account: Account<'info, IntentAccount>,
}

#[derive(Accounts)]
pub struct RedeemIntent<'info> {
    /// The facilitator signer — authority is the platform multisig.
    pub facilitator: Signer<'info>,

    #[account(
        mut,
        seeds = [
            INTENT_SEED,
            intent_account.authority.as_ref(),
            intent_account.agent.as_ref(),
            &intent_account.created_nonce.to_le_bytes(),
        ],
        bump = intent_account.bump,
    )]
    pub intent_account: Account<'info, IntentAccount>,
}

#[derive(Accounts)]
pub struct ExpireIntent<'info> {
    /// Permissionless caller.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            INTENT_SEED,
            intent_account.authority.as_ref(),
            intent_account.agent.as_ref(),
            &intent_account.created_nonce.to_le_bytes(),
        ],
        bump = intent_account.bump,
    )]
    pub intent_account: Account<'info, IntentAccount>,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// On-chain mandate PDA.
///
/// SPEC §10.3 — records scope, approval signature, and lifecycle status.
#[account]
#[derive(Debug)]
pub struct IntentAccount {
    /// Buyer wallet that created and owns this mandate.
    pub authority: Pubkey,
    /// Agent the mandate is scoped to.
    pub agent: Pubkey,
    /// Caller-supplied nonce, included in the PDA seeds to allow multiple
    /// concurrent intents per (authority, agent) pair.
    pub created_nonce: u64,
    /// Scope parameters agreed by the buyer.
    pub scope: StoredScope,
    /// Ed25519 signature of the buyer over the canonical scope digest.
    /// All-zeros until `approve_intent` is called.
    pub approval_sig: [u8; 64],
    /// Lifecycle state.
    pub status: IntentStatus,
    /// Unix timestamp when the mandate was created.
    pub created_at: i64,
    /// Unix timestamp after which the mandate is invalid.
    pub expires_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl IntentAccount {
    // discriminator(8) + authority(32) + agent(32) + created_nonce(8)
    // + StoredScope + sig(64) + status(1) + created_at(8) + expires_at(8)
    // + bump(1)
    pub const SPACE: usize =
        8 + 32 + 32 + 8 + StoredScope::SIZE + 64 + 1 + 8 + 8 + 1;
}

/// Compact on-chain representation of approved scope.
///
/// SPEC §10.4 — skills, tools, token caps, spend cap, expiry.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct StoredScope {
    /// Maximum lamports the agent may spend on behalf of the buyer.
    pub max_spend_lamports: u64,
    /// Sha256 fingerprints of allowed canonical tool names (up to 16).
    pub allowed_tools: [[u8; 32]; MAX_ALLOWED_TOOLS],
    /// How many tool slots are actually populated.
    pub allowed_tools_len: u8,
    /// Maximum call duration in seconds (also encodes expires_at delta).
    pub max_duration_secs: u32,
}

impl StoredScope {
    pub const SIZE: usize =
        8                          // max_spend_lamports
        + (32 * MAX_ALLOWED_TOOLS) // allowed_tools array
        + 1                        // allowed_tools_len
        + 4;                       // max_duration_secs
}

// ---------------------------------------------------------------------------
// Instruction argument structs
// ---------------------------------------------------------------------------

/// Caller-supplied scope for `create_intent`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScopeArgs {
    pub max_spend_lamports: u64,
    /// Sha256 fingerprints of allowed tool names; at most MAX_ALLOWED_TOOLS.
    pub allowed_tools: Vec<[u8; 32]>,
    pub max_duration_secs: u32,
}

impl ScopeArgs {
    /// Convert into the fixed-size on-chain representation.
    pub fn into_stored(self) -> Result<StoredScope> {
        require!(
            self.allowed_tools.len() <= MAX_ALLOWED_TOOLS,
            MandateError::TooManyTools
        );
        let mut stored = StoredScope {
            max_spend_lamports: self.max_spend_lamports,
            max_duration_secs:  self.max_duration_secs,
            allowed_tools_len:  self.allowed_tools.len() as u8,
            ..Default::default()
        };
        for (i, tool) in self.allowed_tools.into_iter().enumerate() {
            stored.allowed_tools[i] = tool;
        }
        Ok(stored)
    }
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// Lifecycle state of an IntentAccount.
///
/// SPEC §10.3 — mandate transitions: Pending → Approved → Consumed | Expired.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum IntentStatus {
    /// Created; awaiting buyer approval signature.
    Pending,
    /// Buyer has submitted an approval signature.
    Approved,
    /// Facilitator has redeemed the mandate against an invocation.
    Consumed,
    /// Mandate passed its expiry timestamp without being consumed.
    Expired,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// Emitted when a new intent mandate is created.
#[event]
pub struct IntentCreated {
    pub authority:     Pubkey,
    pub agent:         Pubkey,
    pub created_nonce: u64,
    pub expires_at:    i64,
}

/// Emitted when the buyer approves the intent with their signature.
#[event]
pub struct IntentApproved {
    pub authority: Pubkey,
    pub agent:     Pubkey,
}

/// Emitted when the facilitator redeems an approved intent at settlement.
#[event]
pub struct IntentConsumed {
    pub authority: Pubkey,
    pub agent:     Pubkey,
}

/// Emitted when a permissionless caller marks a stale intent as expired.
#[event]
pub struct IntentExpired {
    pub authority: Pubkey,
    pub agent:     Pubkey,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum MandateError {
    #[msg("Intent status does not permit this operation")]
    InvalidStatus,
    #[msg("Signer is not the intent authority")]
    Unauthorized,
    #[msg("Intent has expired")]
    IntentExpired,
    #[msg("Intent has not yet expired")]
    IntentNotExpired,
    #[msg("Scope lists more tools than MAX_ALLOWED_TOOLS (16)")]
    TooManyTools,
    #[msg("Arithmetic overflow in timestamp calculation")]
    ArithmeticOverflow,
    #[msg("max_spend_lamports must be greater than zero")]
    ZeroSpend,
    #[msg("max_duration_secs must be greater than zero")]
    ZeroDuration,
}
