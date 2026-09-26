//! Per-asset staking with a time lock and admin-triggered reward accrual.
//!
//! Staking twice for the same (asset, staker) pair tops up the existing stake
//! and resets its lock timer.
//!
//! Issue #1530 – rewards are pro-rated for mid-period joiners. Each accrual
//! window is bounded by `RewardPeriod.started_at` (or the previous accrual)
//! and `now`. A staker's weight is
//! `amount * time_in_period / period_length`, so someone who joined halfway
//! through receives half the proportional share of a full-period staker with
//! the same principal.
//!
//! Issue #1531 – staking mutators respect the Staking subsystem pause flag.

use crate::DataKey as GlobalDataKey;
use soroban_sdk::{contracttype, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stake {
    pub staker: Address,
    pub asset_id: u64,
    pub amount: i128,
    pub staked_at: u64,
    pub lock_period: u64,
    pub rewards_earned: i128,
}

/// Tracks the current reward period for an asset so mid-period joiners can be
/// pro-rated (issue #1530).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardPeriod {
    /// Ledger timestamp when this period started (or last accrual completed).
    pub started_at: u64,
    /// Optional fixed period length in seconds. 0 means "open-ended until next accrue".
    pub length_secs: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Stake(u64, Address),
    AssetStakers(u64),
    RewardPeriod(u64),
}

/// Flat reward pool distributed proportionally on each `accrue_staking_rewards`
/// call. There is no funding source wired in yet — tracked alongside the rest
/// of this module's integration in SC-57.
const REWARD_POOL: i128 = 10_000;

/// Default period length (7 days) used when none has been configured.
const DEFAULT_PERIOD_SECS: u64 = 7 * 24 * 60 * 60;

pub fn stake_tokens(env: Env, asset_id: u64, staker: Address, amount: i128, lock_period: u64) {
    staker.require_auth();
    crate::pause::require_subsystem_not_paused(&env, crate::pause::Subsystem::Staking);

    if amount <= 0 {
        panic!("Stake amount must be positive");
    }

    let store = env.storage().persistent();
    let key = DataKey::Stake(asset_id, staker.clone());
    let now = env.ledger().timestamp();

    let mut stake = Stake {
        staker: staker.clone(),
        asset_id,
        amount,
        staked_at: now,
        lock_period,
        rewards_earned: 0,
    };
    if let Some(existing) = store.get::<_, Stake>(&key) {
        // Top-up: preserve prior rewards; amount adds; lock timer resets.
        stake.amount += existing.amount;
        stake.rewards_earned = existing.rewards_earned;
    }
    store.set(&key, &stake);

    let stakers_key = DataKey::AssetStakers(asset_id);
    let mut stakers: Vec<Address> = store.get(&stakers_key).unwrap_or_else(|| Vec::new(&env));
    if !stakers.contains(&staker) {
        stakers.push_back(staker.clone());
        store.set(&stakers_key, &stakers);
    }

    // Ensure a reward period exists so the first joiner is anchored.
    ensure_reward_period(&env, asset_id, now);

    crate::events::staked(&env, asset_id, &staker, amount);
}

pub fn unstake_tokens(env: Env, asset_id: u64, staker: Address) {
    staker.require_auth();
    crate::pause::require_subsystem_not_paused(&env, crate::pause::Subsystem::Staking);

    let store = env.storage().persistent();
    let key = DataKey::Stake(asset_id, staker.clone());
    let mut stake: Stake = store
        .get(&key)
        .unwrap_or_else(|| crate::handle_error(&env, crate::Error::StakeNotFound));

    let now = env.ledger().timestamp();
    if now < stake.staked_at + stake.lock_period {
        panic!("Lock period has not elapsed");
    }

    let amount = stake.amount;
    stake.amount = 0;
    store.set(&key, &stake);

    crate::events::unstaked(&env, asset_id, &staker, amount);
}

pub fn get_staking_power(env: Env, asset_id: u64, staker: Address) -> i128 {
    let key = DataKey::Stake(asset_id, staker);
    env.storage()
        .persistent()
        .get::<_, Stake>(&key)
        .map(|s| s.amount)
        .unwrap_or(0)
}

pub fn get_stake(env: Env, asset_id: u64, staker: Address) -> Stake {
    env.storage()
        .persistent()
        .get(&DataKey::Stake(asset_id, staker))
        .unwrap_or_else(|| crate::handle_error(&env, crate::Error::StakeNotFound))
}

/// Admin can set / reset the reward period length for an asset.
pub fn set_reward_period_length(env: Env, caller: Address, asset_id: u64, length_secs: u64) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&GlobalDataKey::Admin)
        .unwrap_or_else(|| crate::handle_error(&env, crate::Error::NotInitialized));
    if caller != admin {
        panic!("Unauthorized");
    }
    let now = env.ledger().timestamp();
    let period = RewardPeriod {
        started_at: now,
        length_secs: if length_secs == 0 {
            DEFAULT_PERIOD_SECS
        } else {
            length_secs
        },
    };
    env.storage()
        .persistent()
        .set(&DataKey::RewardPeriod(asset_id), &period);
}

fn ensure_reward_period(env: &Env, asset_id: u64, now: u64) {
    let store = env.storage().persistent();
    let key = DataKey::RewardPeriod(asset_id);
    if !store.has(&key) {
        store.set(
            &key,
            &RewardPeriod {
                started_at: now,
                length_secs: DEFAULT_PERIOD_SECS,
            },
        );
    }
}

/// Distribute `REWARD_POOL` across stakers weighted by amount × time-in-period
/// (issue #1530). Mid-period joiners receive a pro-rated share.
pub fn accrue_staking_rewards(env: Env, caller: Address, asset_id: u64) {
    caller.require_auth();
    crate::pause::require_subsystem_not_paused(&env, crate::pause::Subsystem::Staking);

    let admin: Address = env
        .storage()
        .persistent()
        .get(&GlobalDataKey::Admin)
        .unwrap_or_else(|| crate::handle_error(&env, crate::Error::NotInitialized));
    if caller != admin {
        panic!("Unauthorized");
    }

    let store = env.storage().persistent();
    let now = env.ledger().timestamp();
    ensure_reward_period(&env, asset_id, now);

    let period_key = DataKey::RewardPeriod(asset_id);
    let period: RewardPeriod = store
        .get(&period_key)
        .unwrap_or_else(|| crate::handle_error(&env, crate::Error::RewardPeriodNotFound));
    let period_start = period.started_at;
    let period_length = if period.length_secs == 0 {
        DEFAULT_PERIOD_SECS
    } else {
        period.length_secs
    };
    // Effective window cannot exceed the configured period length.
    let window = if now > period_start {
        let elapsed = now - period_start;
        if elapsed > period_length {
            period_length
        } else {
            elapsed
        }
    } else {
        0
    };
    if window == 0 {
        return;
    }

    let stakers_key = DataKey::AssetStakers(asset_id);
    let stakers: Vec<Address> = store.get(&stakers_key).unwrap_or_else(|| Vec::new(&env));

    // Weight = amount * seconds_active_in_window
    let mut total_weight: i128 = 0;
    let mut weights: Vec<(Address, i128)> = Vec::new(&env);

    for staker in stakers.iter() {
        let stake: Stake = match store.get(&DataKey::Stake(asset_id, staker.clone())) {
            Some(s) => s,
            None => continue,
        };
        if stake.amount <= 0 {
            continue;
        }
        // Active from max(staked_at, period_start) to now, capped by window.
        let active_from = if stake.staked_at > period_start {
            stake.staked_at
        } else {
            period_start
        };
        let active_secs = if now > active_from {
            let raw = now - active_from;
            if raw > window {
                window
            } else {
                raw
            }
        } else {
            0
        };
        if active_secs == 0 {
            continue;
        }
        let weight = stake.amount.saturating_mul(active_secs as i128);
        total_weight = total_weight.saturating_add(weight);
        weights.push_back((staker.clone(), weight));
    }

    if total_weight == 0 {
        // Advance period so next accrue has a fresh window.
        store.set(
            &period_key,
            &RewardPeriod {
                started_at: now,
                length_secs: period_length,
            },
        );
        return;
    }

    for item in weights.iter() {
        let (staker, weight) = item;
        let key = DataKey::Stake(asset_id, staker.clone());
        let mut stake: Stake = store
            .get(&key)
            .unwrap_or_else(|| crate::handle_error(env, crate::Error::StakeNotFound));
        let share = (weight.saturating_mul(REWARD_POOL)) / total_weight;
        stake.rewards_earned = stake.rewards_earned.saturating_add(share);
        store.set(&key, &stake);
    }

    // Roll the period forward so the next accrual starts clean.
    store.set(
        &period_key,
        &RewardPeriod {
            started_at: now,
            length_secs: period_length,
        },
    );

    crate::events::staking_rewards_accrued(&env, asset_id, REWARD_POOL);
}

/// Adjust staking rewards when an escrow for the same asset is released
/// (issue #1533 cross-flow). Credits a small bonus to the seller's stake if
/// one exists; no-op when the seller has no stake.
pub fn on_escrow_released(env: &Env, asset_id: u64, seller: &Address, escrow_amount: i128) {
    let store = env.storage().persistent();
    let key = DataKey::Stake(asset_id, seller.clone());
    if let Some(mut stake) = store.get::<_, Stake>(&key) {
        if stake.amount > 0 {
            // Bonus: 1% of escrow amount, floored at 0.
            let bonus = if escrow_amount > 0 {
                escrow_amount / 100
            } else {
                0
            };
            stake.rewards_earned = stake.rewards_earned.saturating_add(bonus);
            store.set(&key, &stake);
            crate::events::staking_rewards_accrued(env, asset_id, bonus);
        }
    }
}
