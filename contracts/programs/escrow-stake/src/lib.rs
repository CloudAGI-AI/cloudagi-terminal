//! escrow-stake — CloudAGI provider stake and slash program.
//!
//! Providers lock SOL (or delegate USDC via companion token vault in Wave 2)
//! to register agents. The platform authority (MVP: centralized multisig)
//! can slash a provider's stake on proven misbehaviour.
//!
//! SPEC §11 — Reputation, Stake, and Slash.
//! SPEC §11.2 — Stake tiers (Basic 25 USDC / Standard 100 / Premium 500).
//! SPEC §11.3 — Slash triggers.
//!
//! All instruction bodies are stubs (Ok(())). Wave 2/3 will fill logic.
// TODO: replace with real declare_id! after first `anchor build` + deploy
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ---------------------------------------------------------------------------
// PDA seed constants
// ---------------------------------------------------------------------------

pub const STAKE_SEED:  &[u8] = b"stake";
pub const CONFIG_SEED: &[u8] = b"escrow_config";

// ---------------------------------------------------------------------------
// Tier thresholds (in USDC base units, 6 decimals).
// SPEC §11.2.
// ---------------------------------------------------------------------------

pub const TIER_BASIC_MIN:    u64 =  25_000_000; //  25 USDC
pub const TIER_STANDARD_MIN: u64 = 100_000_000; // 100 USDC
pub const TIER_PREMIUM_MIN:  u64 = 500_000_000; // 500 USDC

/// Cool-down before stake can be fully withdrawn after `request_unstake`.
/// SPEC §11.2 — "returnable after cool-down when agent deactivated and
/// no open disputes remain".
pub const UNSTAKE_COOLDOWN_SECS: i64 = 7 * 24 * 60 * 60; // 7 days

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod escrow_stake {
    use super::*;

    /// Initialise the global config PDA.
    ///
    /// Called once by the deployer to record the platform authority pubkey
    /// (MVP: a multisig). All slash instructions gate on this authority.
    #[allow(unused_variables)]
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.bump      = ctx.bumps.config;

        // TODO Wave 2: also store treasury wallet for slashed-SOL routing
        Ok(())
    }

    /// Lock SOL into a stake PDA for a provider.
    ///
    /// Creates the StakeAccount PDA and transfers `amount` lamports from the
    /// provider wallet into it. Tier is derived from amount at read time;
    /// the raw lamport figure is stored.
    ///
    /// SPEC §11 — "no registration without stake".
    #[allow(unused_variables)]
    pub fn initialize_stake(
        ctx: Context<InitializeStake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        stake.provider        = ctx.accounts.provider.key();
        stake.staked_lamports = amount;
        stake.tier            = derive_tier(amount);
        stake.dispute_count   = 0;
        stake.last_slash_ts   = 0;
        stake.status          = StakeStatus::Active;
        stake.created_at      = clock.unix_timestamp;
        stake.unlock_at       = 0;
        stake.bump            = ctx.bumps.stake_account;

        // TODO Wave 2: transfer `amount` lamports from provider to PDA vault
        // via system_program::transfer CPI.
        Ok(())
    }

    /// Add more lamports to an existing stake.
    ///
    /// SPEC §11.2 — providers can top up to reach a higher tier.
    #[allow(unused_variables)]
    pub fn top_up(ctx: Context<TopUp>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        let stake = &mut ctx.accounts.stake_account;

        require!(
            stake.status == StakeStatus::Active,
            StakeError::InvalidStatus
        );

        stake.staked_lamports = stake
            .staked_lamports
            .checked_add(amount)
            .ok_or(StakeError::ArithmeticOverflow)?;
        stake.tier = derive_tier(stake.staked_lamports);

        // TODO Wave 2: transfer `amount` lamports from provider to PDA vault
        Ok(())
    }

    /// Begin the unstake cool-down.
    ///
    /// After UNSTAKE_COOLDOWN_SECS (7 days) with no open disputes, the
    /// provider may call `close_stake` to reclaim lamports.
    ///
    /// SPEC §11.2 — "returnable after cool-down … no open disputes remain".
    #[allow(unused_variables)]
    pub fn request_unstake(ctx: Context<RequestUnstake>) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(
            stake.status == StakeStatus::Active,
            StakeError::InvalidStatus
        );

        stake.status    = StakeStatus::Unstaking;
        stake.unlock_at = clock
            .unix_timestamp
            .checked_add(UNSTAKE_COOLDOWN_SECS)
            .ok_or(StakeError::ArithmeticOverflow)?;

        // TODO Wave 2: check no open dispute PDAs reference this stake
        Ok(())
    }

    /// Slash a portion of a provider's stake.
    ///
    /// Platform authority only (MVP: multisig). `reason_code` maps to
    /// SPEC §11.3 slash triggers:
    ///   0 = non-delivery
    ///   1 = hash mismatch
    ///   2 = unauthorized scope
    ///   3 = replay fraud
    ///   4 = facilitator misbehaviour (separate operator)
    ///
    /// SPEC §11.3 — slash amounts bounded 5%–25% per event to limit griefing.
    #[allow(unused_variables)]
    pub fn slash(
        ctx: Context<Slash>,
        amount: u64,
        reason_code: u8,
    ) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(
            stake.status == StakeStatus::Active,
            StakeError::InvalidStatus
        );
        require!(
            amount <= stake.staked_lamports,
            StakeError::SlashExceedsStake
        );

        // Enforce 25% per-event ceiling (SPEC §11.3).
        let ceiling = stake
            .staked_lamports
            .checked_div(4)
            .ok_or(StakeError::ArithmeticOverflow)?;
        require!(amount <= ceiling, StakeError::SlashExceedsCeiling);

        stake.staked_lamports = stake
            .staked_lamports
            .checked_sub(amount)
            .ok_or(StakeError::ArithmeticOverflow)?;
        stake.tier          = derive_tier(stake.staked_lamports);
        stake.dispute_count = stake
            .dispute_count
            .checked_add(1)
            .ok_or(StakeError::ArithmeticOverflow)?;
        stake.last_slash_ts = clock.unix_timestamp;

        // TODO Wave 2: transfer slashed lamports to treasury PDA
        // TODO Wave 2: emit StakeEvent (SPEC §5.5) via noop CPI log
        Ok(())
    }

    /// Close a stake PDA and reclaim lamports after the cool-down elapses.
    ///
    /// SPEC §11.2 — final step of agent deactivation flow.
    #[allow(unused_variables)]
    pub fn close_stake(ctx: Context<CloseStake>) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(
            stake.status == StakeStatus::Unstaking,
            StakeError::InvalidStatus
        );
        require!(
            clock.unix_timestamp >= stake.unlock_at,
            StakeError::CooldownNotElapsed
        );

        stake.status = StakeStatus::Closed;

        // TODO Wave 2: transfer remaining staked_lamports back to provider,
        // then close the PDA and return rent.
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/// Derive the stake tier from a raw lamport amount.
///
/// NOTE: For MVP, `staked_lamports` stores SOL lamports used as a proxy for
/// USDC. Wave 2 will switch to a USDC token vault with proper decimals.
/// Thresholds are defined in USDC base units (6 decimals) for forward compat.
fn derive_tier(staked_lamports: u64) -> u8 {
    if staked_lamports >= TIER_PREMIUM_MIN {
        2 // Premium
    } else if staked_lamports >= TIER_STANDARD_MIN {
        1 // Standard
    } else {
        0 // Basic
    }
}

// ---------------------------------------------------------------------------
// Instruction contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer  = authority,
        space  = EscrowConfig::SPACE,
        seeds  = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, EscrowConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeStake<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    #[account(
        init,
        payer  = provider,
        space  = StakeAccount::SPACE,
        seeds  = [STAKE_SEED, provider.key().as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TopUp<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    #[account(
        mut,
        seeds   = [STAKE_SEED, provider.key().as_ref()],
        bump    = stake_account.bump,
        has_one = provider,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    pub provider: Signer<'info>,

    #[account(
        mut,
        seeds   = [STAKE_SEED, provider.key().as_ref()],
        bump    = stake_account.bump,
        has_one = provider,
    )]
    pub stake_account: Account<'info, StakeAccount>,
}

#[derive(Accounts)]
pub struct Slash<'info> {
    /// Platform authority (multisig in production).
    pub authority: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump  = config.bump,
        has_one = authority,
    )]
    pub config: Account<'info, EscrowConfig>,

    #[account(
        mut,
        seeds = [STAKE_SEED, stake_account.provider.as_ref()],
        bump  = stake_account.bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,
}

#[derive(Accounts)]
pub struct CloseStake<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    #[account(
        mut,
        seeds   = [STAKE_SEED, provider.key().as_ref()],
        bump    = stake_account.bump,
        has_one = provider,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Global config PDA — stores the platform authority used to gate slashing.
///
/// SPEC §11.3 — slash is always mediated; direct authority slash permitted
/// only with a dispute record (Wave 2 will add dispute_id validation).
#[account]
#[derive(Debug)]
pub struct EscrowConfig {
    pub authority: Pubkey,
    pub bump: u8,
}

impl EscrowConfig {
    pub const SPACE: usize = 8 + 32 + 1;
}

/// Per-provider stake PDA.
///
/// SPEC §11 — stake tier, slash history, lifecycle status.
#[account]
#[derive(Debug)]
pub struct StakeAccount {
    /// Provider wallet that owns this stake.
    pub provider: Pubkey,
    /// Lamports currently locked (proxy for USDC until Wave 2 token vault).
    pub staked_lamports: u64,
    /// Derived tier: 0 = Basic, 1 = Standard, 2 = Premium. SPEC §11.2.
    pub tier: u8,
    /// Number of slashes applied to this stake.
    pub dispute_count: u32,
    /// Unix timestamp of the most recent slash (0 if never slashed).
    pub last_slash_ts: i64,
    /// Lifecycle status.
    pub status: StakeStatus,
    /// Unix timestamp of stake creation.
    pub created_at: i64,
    /// Unix timestamp after which `close_stake` is permitted (0 = not set).
    pub unlock_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl StakeAccount {
    // discriminator(8) + provider(32) + staked_lamports(8) + tier(1)
    // + dispute_count(4) + last_slash_ts(8) + status(1)
    // + created_at(8) + unlock_at(8) + bump(1)
    pub const SPACE: usize = 8 + 32 + 8 + 1 + 4 + 8 + 1 + 8 + 8 + 1;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// Lifecycle state of a StakeAccount.
///
/// Mirrors SPEC §11.2 — lock → unstake cool-down → closed.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum StakeStatus {
    /// Stake is active; agent is eligible to receive invocations.
    Active,
    /// Provider has requested withdrawal; cool-down in progress.
    Unstaking,
    /// Stake has been fully withdrawn; PDA can be garbage-collected.
    Closed,
    /// Stake was slashed to zero before provider requested withdrawal.
    Liquidated,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum StakeError {
    #[msg("Stake amount must be greater than zero")]
    ZeroAmount,
    #[msg("Stake status does not permit this operation")]
    InvalidStatus,
    #[msg("Slash amount exceeds staked balance")]
    SlashExceedsStake,
    #[msg("Slash amount exceeds 25% per-event ceiling (SPEC §11.3)")]
    SlashExceedsCeiling,
    #[msg("Unstake cool-down period has not elapsed")]
    CooldownNotElapsed,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
