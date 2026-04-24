//! escrow-stake — CloudAGI provider stake and slash program.
//!
//! Providers lock SOL (proxy for USDC in MVP) to register agents. The
//! platform authority (MVP: centralised multisig) can slash a provider's
//! stake on proven misbehaviour.
//!
//! SPEC §11 — Reputation, Stake, and Slash.
//! SPEC §11.2 — Stake tiers.
//! SPEC §11.3 — Slash triggers.
// TODO: replace with real declare_id! after first `anchor build` + deploy
#![allow(clippy::result_large_err)]

use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

declare_id!("11111111111111111111111111111111");

// ---------------------------------------------------------------------------
// PDA seed constants
// ---------------------------------------------------------------------------

pub const STAKE_SEED:  &[u8] = b"stake";
pub const CONFIG_SEED: &[u8] = b"escrow_config";

// ---------------------------------------------------------------------------
// Tier thresholds.
//
// MVP stores SOL lamports as a proxy for USDC; thresholds are defined in
// USDC base units (6 decimals) and will map directly once Wave 2 switches
// to a proper token vault.
//
// Tier mapping (SPEC §11.2 extended to 5 bands):
//   < 25_000_000       (< 25 USDC)   → 0 = Unrated
//   < 100_000_000      (< 100 USDC)  → 1 = Bronze
//   < 500_000_000      (< 500 USDC)  → 2 = Silver
//   < 2_500_000_000    (< 2500 USDC) → 3 = Gold
//   ≥ 2_500_000_000                  → 4 = Platinum
// ---------------------------------------------------------------------------

pub const TIER_BRONZE_MIN:   u64 =     25_000_000; //    25 USDC (6 dec)
pub const TIER_SILVER_MIN:   u64 =    100_000_000; //   100 USDC
pub const TIER_GOLD_MIN:     u64 =    500_000_000; //   500 USDC
pub const TIER_PLATINUM_MIN: u64 =  2_500_000_000; //  2500 USDC

/// Cool-down before stake can be fully withdrawn after `request_unstake`.
/// SPEC §11.2 — "returnable after cool-down when agent deactivated and
/// no open disputes remain".
pub const UNSTAKE_COOLDOWN_SECS: i64 = 7 * 24 * 60 * 60; // 7 days

/// Maximum slash per event expressed in basis points (25 % = 2500 bps).
/// SPEC §11.3 — slash amounts bounded 5 %–25 % per event.
pub const PLATFORM_SLASH_CAP_BPS: u16 = 2500;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod escrow_stake {
    use super::*;

    /// Initialise the global config PDA.
    ///
    /// Called once by the deployer to record the platform authority pubkey
    /// (MVP: a multisig) and the per-event slash ceiling.
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        // Capture keys before any mutable borrow.
        let authority_key = ctx.accounts.authority.key();
        let treasury_key  = ctx.accounts.config.key();
        let bump          = ctx.bumps.config;

        let config = &mut ctx.accounts.config;
        config.authority              = authority_key;
        // MVP: treasury == config PDA itself; Wave 2 replaces with dedicated wallet.
        config.treasury               = treasury_key;
        config.platform_slash_cap_bps = PLATFORM_SLASH_CAP_BPS;
        config.bump                   = bump;

        Ok(())
    }

    /// Lock SOL into a stake PDA for a provider.
    ///
    /// Creates the `StakeAccount` PDA and transfers `amount` lamports from
    /// the provider wallet into it. Tier is computed from the amount.
    ///
    /// SPEC §11 — "no registration without stake".
    pub fn initialize_stake(
        ctx: Context<InitializeStake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        // Capture account infos before taking mutable reference.
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let provider_info       = ctx.accounts.provider.to_account_info();
        let stake_info          = ctx.accounts.stake_account.to_account_info();

        // Transfer lamports from provider to the PDA.
        transfer(
            CpiContext::new(
                system_program_info,
                Transfer { from: provider_info, to: stake_info },
            ),
            amount,
        )?;

        let clock = Clock::get()?;
        let stake = &mut ctx.accounts.stake_account;

        stake.provider        = ctx.accounts.provider.key();
        stake.staked_lamports = amount;
        stake.tier            = derive_tier(amount);
        stake.dispute_count   = 0;
        stake.last_slash_ts   = 0;
        stake.status          = StakeStatus::Active;
        stake.created_at      = clock.unix_timestamp;
        stake.unlock_at       = 0;
        stake.bump            = ctx.bumps.stake_account;

        emit!(StakeOpened {
            provider: stake.provider,
            amount,
            tier: stake.tier,
        });

        Ok(())
    }

    /// Add more lamports to an existing active stake.
    ///
    /// SPEC §11.2 — providers can top up to reach a higher tier.
    pub fn top_up(ctx: Context<TopUp>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        // Validate status before acquiring mutable reference.
        require!(
            ctx.accounts.stake_account.status == StakeStatus::Active,
            StakeError::InvalidStatus
        );

        // Capture account infos before the mutable borrow.
        let system_program_info = ctx.accounts.system_program.to_account_info();
        let provider_info       = ctx.accounts.provider.to_account_info();
        let stake_info          = ctx.accounts.stake_account.to_account_info();

        // Transfer lamports from provider to PDA.
        transfer(
            CpiContext::new(
                system_program_info,
                Transfer { from: provider_info, to: stake_info },
            ),
            amount,
        )?;

        let stake = &mut ctx.accounts.stake_account;
        stake.staked_lamports = stake
            .staked_lamports
            .checked_add(amount)
            .ok_or(StakeError::ArithmeticOverflow)?;
        stake.tier = derive_tier(stake.staked_lamports);

        emit!(TopUpEvent {
            provider:  stake.provider,
            added:     amount,
            new_total: stake.staked_lamports,
            tier:      stake.tier,
        });

        Ok(())
    }

    /// Begin the unstake cool-down.
    ///
    /// After `UNSTAKE_COOLDOWN_SECS` (7 days) with no open disputes the
    /// provider may call `close_stake` to reclaim lamports.
    ///
    /// SPEC §11.2 — "returnable after cool-down … no open disputes remain".
    pub fn request_unstake(ctx: Context<RequestUnstake>) -> Result<()> {
        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(stake.status == StakeStatus::Active, StakeError::InvalidStatus);

        stake.status    = StakeStatus::Unstaking;
        stake.unlock_at = clock
            .unix_timestamp
            .checked_add(UNSTAKE_COOLDOWN_SECS)
            .ok_or(StakeError::ArithmeticOverflow)?;

        // TODO(wave-3): check that no open dispute PDAs reference this stake
        // before allowing the cooldown to begin.

        emit!(UnstakeRequested {
            provider:  stake.provider,
            unlock_at: stake.unlock_at,
        });

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
    ///   4 = facilitator misbehaviour
    ///
    /// SPEC §11.3 — slash amounts bounded 5 %–25 % per event.
    pub fn slash(
        ctx: Context<Slash>,
        amount: u64,
        reason_code: u8,
    ) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);

        // Extract config value before mutable borrow of stake_account.
        let config_slash_cap_bps = ctx.accounts.config.platform_slash_cap_bps;

        let stake = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(stake.status == StakeStatus::Active, StakeError::InvalidStatus);
        require!(amount <= stake.staked_lamports, StakeError::SlashExceedsStake);

        // Enforce per-event ceiling (SPEC §11.3).
        let ceiling = (stake.staked_lamports as u128)
            .checked_mul(u128::from(config_slash_cap_bps))
            .and_then(|v| v.checked_div(10_000))
            .and_then(|v| u64::try_from(v).ok())
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

        // TODO(wave-3): transfer `amount` lamports from stake PDA to the
        // config treasury via a signed PDA transfer once the CPI pattern for
        // PDA-owned lamport accounts is finalised.

        emit!(Slashed {
            provider:    stake.provider,
            amount,
            reason_code,
            new_balance: stake.staked_lamports,
        });

        Ok(())
    }

    /// Close a stake PDA and return remaining lamports to the provider after
    /// the cool-down elapses.
    ///
    /// The `close = provider` constraint on the account automatically transfers
    /// all lamports (rent-exempt reserve + staked balance) back to the provider
    /// when the instruction completes. We zero out `staked_lamports` here for
    /// clean accounting before closure.
    ///
    /// SPEC §11.2 — final step of agent deactivation flow.
    pub fn close_stake(ctx: Context<CloseStake>) -> Result<()> {
        let clock = Clock::get()?;

        require!(
            ctx.accounts.stake_account.status == StakeStatus::Unstaking,
            StakeError::InvalidStatus
        );
        require!(
            clock.unix_timestamp >= ctx.accounts.stake_account.unlock_at,
            StakeError::CooldownNotElapsed
        );

        let remainder = ctx.accounts.stake_account.staked_lamports;
        let provider  = ctx.accounts.stake_account.provider;

        let stake = &mut ctx.accounts.stake_account;
        stake.staked_lamports = 0;
        stake.status          = StakeStatus::Closed;
        // The `close = provider` constraint handles the actual lamport return.

        emit!(StakeClosed { provider, remainder });

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/// Derive the stake tier from a raw lamport (proxy-USDC) amount.
///
/// Returns:
///   0 = Unrated  (< 25 USDC equivalent)
///   1 = Bronze   (≥ 25,  < 100)
///   2 = Silver   (≥ 100, < 500)
///   3 = Gold     (≥ 500, < 2500)
///   4 = Platinum (≥ 2500)
#[must_use]
pub fn derive_tier(staked_lamports: u64) -> u8 {
    if staked_lamports >= TIER_PLATINUM_MIN {
        4 // Platinum
    } else if staked_lamports >= TIER_GOLD_MIN {
        3 // Gold
    } else if staked_lamports >= TIER_SILVER_MIN {
        2 // Silver
    } else if staked_lamports >= TIER_BRONZE_MIN {
        1 // Bronze
    } else {
        0 // Unrated
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
        seeds   = [CONFIG_SEED],
        bump    = config.bump,
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
        close   = provider,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Account structs
// ---------------------------------------------------------------------------

/// Global config PDA — stores the platform authority and slash parameters.
///
/// SPEC §11.3 — slash is always mediated by the platform authority.
#[account]
#[derive(Debug)]
pub struct EscrowConfig {
    /// Platform authority allowed to issue slash instructions.
    pub authority: Pubkey,
    /// MVP treasury: same PDA. Wave 2: dedicated wallet for slashed funds.
    pub treasury: Pubkey,
    /// Maximum slash per event in basis points (2500 = 25 %). SPEC §11.3.
    pub platform_slash_cap_bps: u16,
    /// PDA bump.
    pub bump: u8,
}

impl EscrowConfig {
    // discriminator(8) + authority(32) + treasury(32) + slash_cap_bps(2) + bump(1)
    pub const SPACE: usize = 8 + 32 + 32 + 2 + 1;
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
    /// Derived tier: 0=Unrated 1=Bronze 2=Silver 3=Gold 4=Platinum.
    /// SPEC §11.2.
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

/// Lifecycle state of a `StakeAccount`.
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
// Events
// ---------------------------------------------------------------------------

/// Emitted when a new stake account is opened.
#[event]
pub struct StakeOpened {
    pub provider: Pubkey,
    pub amount:   u64,
    pub tier:     u8,
}

/// Emitted when the provider tops up their stake.
#[event]
pub struct TopUpEvent {
    pub provider:  Pubkey,
    pub added:     u64,
    pub new_total: u64,
    pub tier:      u8,
}

/// Emitted when the provider begins the unstake cool-down.
#[event]
pub struct UnstakeRequested {
    pub provider:  Pubkey,
    pub unlock_at: i64,
}

/// Emitted when the platform authority slashes a provider's stake.
#[event]
pub struct Slashed {
    pub provider:    Pubkey,
    pub amount:      u64,
    pub reason_code: u8,
    pub new_balance: u64,
}

/// Emitted when the stake PDA is closed and lamports returned.
#[event]
pub struct StakeClosed {
    pub provider:  Pubkey,
    pub remainder: u64,
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
    #[msg("Slash amount exceeds per-event ceiling (SPEC §11.3)")]
    SlashExceedsCeiling,
    #[msg("Unstake cool-down period has not elapsed")]
    CooldownNotElapsed,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
