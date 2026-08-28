//! Per-asset staking with a time lock and admin-triggered reward accrual.
//!
//! Staking twice for the same (asset, staker) pair tops up the existing stake
//! and resets its lock timer. `accrue_staking_rewards` splits a fixed reward
//! pool across an asset's stakers in proportion to their staked amount; there
//! is no external reward source wired in yet, so the pool size is a constant.

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Stake(u64, Address),
    AssetStakers(u64),
}

/// Flat reward pool distributed proportionally on each `accrue_staking_rewards`
/// call. There is no funding source wired in yet — tracked alongside the rest
/// of this module's integration in SC-57.
const REWARD_POOL: i128 = 10_000;

pub fn stake_tokens(env: Env, asset_id: u64, staker: Address, amount: i128, lock_period: u64) {
    staker.require_auth();

    let store = env.storage().persistent();
    let key = DataKey::Stake(asset_id, staker.clone());

    let mut stake = Stake {
        staker: staker.clone(),
        asset_id,
        amount,
        staked_at: env.ledger().timestamp(),
        lock_period,
        rewards_earned: 0,
    };
    if let Some(existing) = store.get::<_, Stake>(&key) {
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

    crate::events::staked(&env, asset_id, &staker, amount);
}

pub fn unstake_tokens(env: Env, asset_id: u64, staker: Address) {
    staker.require_auth();

    let store = env.storage().persistent();
    let key = DataKey::Stake(asset_id, staker.clone());
    let mut stake: Stake = store.get(&key).expect("No stake found");

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

pub fn accrue_staking_rewards(env: Env, caller: Address, asset_id: u64) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&GlobalDataKey::Admin)
        .expect("Not initialized");
    if caller != admin {
        panic!("Unauthorized");
    }

    let store = env.storage().persistent();
    let stakers_key = DataKey::AssetStakers(asset_id);
    let stakers: Vec<Address> = store.get(&stakers_key).unwrap_or_else(|| Vec::new(&env));

    let mut total_staked: i128 = 0;
    for staker in stakers.iter() {
        let stake: Stake = store.get(&DataKey::Stake(asset_id, staker)).unwrap();
        total_staked += stake.amount;
    }
    if total_staked == 0 {
        return;
    }

    for staker in stakers.iter() {
        let key = DataKey::Stake(asset_id, staker);
        let mut stake: Stake = store.get(&key).unwrap();
        if stake.amount > 0 {
            let share = (stake.amount * REWARD_POOL) / total_staked;
            stake.rewards_earned += share;
            store.set(&key, &stake);
        }
    }

    crate::events::staking_rewards_accrued(&env, asset_id, REWARD_POOL);
}
