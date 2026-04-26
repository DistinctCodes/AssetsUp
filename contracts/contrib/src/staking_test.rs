#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

#[test]
fn test_stake_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let staker = Address::generate(&env);
    let asset_id = 1;
    let amount = 1000;
    let lock_period = 3600;

    client.stake_tokens(&asset_id, &staker, &amount, &lock_period);

    let power = client.get_staking_power(&asset_id, &staker);
    assert_eq!(power, amount);
}

#[test]
fn test_unstake_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let staker = Address::generate(&env);
    let asset_id = 2;
    let amount = 1000;
    let lock_period = 3600;

    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    client.stake_tokens(&asset_id, &staker, &amount, &lock_period);

    // Fast forward time
    env.ledger().with_mut(|li| {
        li.timestamp = 10000 + lock_period + 1;
    });

    client.unstake_tokens(&asset_id, &staker);

    let power = client.get_staking_power(&asset_id, &staker);
    assert_eq!(power, 0);
}

#[test]
#[should_panic(expected = "Lock period has not elapsed")]
fn test_unstake_tokens_premature() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let staker = Address::generate(&env);
    let asset_id = 3;
    
    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    client.stake_tokens(&asset_id, &staker, &1000, &3600);

    // Do not fast forward time
    client.unstake_tokens(&asset_id, &staker);
}

#[test]
fn test_accrue_staking_rewards() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, StakingContract);
    let client = StakingContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let staker1 = Address::generate(&env);
    let staker2 = Address::generate(&env);
    let asset_id = 4;
    
    client.stake_tokens(&asset_id, &staker1, &2000, &3600);
    client.stake_tokens(&asset_id, &staker2, &8000, &3600);

    client.accrue_staking_rewards(&asset_id);
    
    // Verifies it executes without error. Since we don't have a getter for the Stake struct
    // per the minimal requirements, we trust the successful execution means the math didn't panic.
}
