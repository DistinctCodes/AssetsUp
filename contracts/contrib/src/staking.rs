#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Stake {
    pub staker: Address,
    pub asset_id: u64,
    pub amount: i128,
    pub staked_at: u64,
    pub lock_period: u64,
    pub rewards_earned: i128,
}

#[contracttype]
pub enum DataKey {
    Stake(u64, Address),       // asset_id, staker
    AssetStakers(u64),         // asset_id -> Vec<Address>
    Admin,                     // Contract admin
}

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn stake_tokens(
        env: Env,
        asset_id: u64,
        staker: Address,
        amount: i128,
        lock_period: u64,
    ) {
        staker.require_auth();
        
        let current_time = env.ledger().timestamp();
        
        let mut stake = Stake {
            staker: staker.clone(),
            asset_id,
            amount,
            staked_at: current_time,
            lock_period,
            rewards_earned: 0,
        };

        let key = DataKey::Stake(asset_id, staker.clone());
        
        // If already staked, add to amount and reset timer
        if let Some(existing_stake) = env.storage().persistent().get::<_, Stake>(&key) {
            stake.amount += existing_stake.amount;
            stake.rewards_earned = existing_stake.rewards_earned;
        }

        env.storage().persistent().set(&key, &stake);

        let stakers_key = DataKey::AssetStakers(asset_id);
        let mut stakers: Vec<Address> = env.storage().persistent().get(&stakers_key).unwrap_or(Vec::new(&env));
        if !stakers.contains(&staker) {
            stakers.push_back(staker.clone());
            env.storage().persistent().set(&stakers_key, &stakers);
        }

        env.events().publish((Symbol::new(&env, "staked"), asset_id, staker), amount);
    }

    pub fn unstake_tokens(env: Env, asset_id: u64, staker: Address) {
        staker.require_auth();
        
        let key = DataKey::Stake(asset_id, staker.clone());
        let mut stake: Stake = env.storage().persistent().get(&key).unwrap();
        
        let current_time = env.ledger().timestamp();
        if current_time < stake.staked_at + stake.lock_period {
            panic!("Lock period has not elapsed");
        }
        
        let amount = stake.amount;
        stake.amount = 0;
        env.storage().persistent().set(&key, &stake);
        
        env.events().publish((Symbol::new(&env, "unstaked"), asset_id, staker), amount);
    }

    pub fn get_staking_power(env: Env, asset_id: u64, staker: Address) -> i128 {
        let key = DataKey::Stake(asset_id, staker);
        if let Some(stake) = env.storage().persistent().get::<_, Stake>(&key) {
            stake.amount
        } else {
            0
        }
    }

    pub fn accrue_staking_rewards(env: Env, asset_id: u64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let stakers_key = DataKey::AssetStakers(asset_id);
        let stakers: Vec<Address> = env.storage().persistent().get(&stakers_key).unwrap_or(Vec::new(&env));

        let mut total_staked = 0;
        
        // Calculate total staked for this asset
        for staker in stakers.iter() {
            let stake: Stake = env.storage().persistent().get(&DataKey::Stake(asset_id, staker.clone())).unwrap();
            total_staked += stake.amount;
        }

        if total_staked == 0 {
            return;
        }

        // Hardcoded dummy reward pool for minimal demonstration
        let total_rewards_to_distribute: i128 = 10000; 

        // Distribute proportionally
        for staker in stakers.iter() {
            let key = DataKey::Stake(asset_id, staker.clone());
            let mut stake: Stake = env.storage().persistent().get(&key).unwrap();
            
            if stake.amount > 0 {
                let share = (stake.amount * total_rewards_to_distribute) / total_staked;
                stake.rewards_earned += share;
                env.storage().persistent().set(&key, &stake);
            }
        }
        
        env.events().publish((Symbol::new(&env, "rewards_accrued"), asset_id), total_rewards_to_distribute);
    }
}

#[cfg(test)]
mod staking_test;
