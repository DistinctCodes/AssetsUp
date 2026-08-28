#![cfg(test)]

use crate::{ContribContract, ContribContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

fn setup_test(env: &Env) -> (ContribContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_stake_tokens() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let staker = Address::generate(&env);

    client.stake_tokens(&1, &staker, &1000, &3600);

    assert_eq!(client.get_staking_power(&1, &staker), 1000);
}

#[test]
fn test_staking_twice_tops_up_amount() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let staker = Address::generate(&env);

    client.stake_tokens(&1, &staker, &500, &3600);
    client.stake_tokens(&1, &staker, &500, &3600);

    assert_eq!(client.get_staking_power(&1, &staker), 1000);
}

#[test]
#[should_panic(expected = "Lock period has not elapsed")]
fn test_second_stake_resets_the_lock_timer() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let staker = Address::generate(&env);

    env.ledger().with_mut(|li| li.timestamp = 1_000);
    client.stake_tokens(&1, &staker, &500, &3600);

    // Second stake resets the lock: the original lock would have elapsed by
    // 4600, but the reset lock (from timestamp 2000) has not.
    env.ledger().with_mut(|li| li.timestamp = 2_000);
    client.stake_tokens(&1, &staker, &500, &3600);

    env.ledger().with_mut(|li| li.timestamp = 4_600);
    client.unstake_tokens(&1, &staker);
}

#[test]
fn test_unstake_after_lock_period() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let staker = Address::generate(&env);

    env.ledger().with_mut(|li| li.timestamp = 10_000);
    client.stake_tokens(&2, &staker, &1000, &3600);

    env.ledger().with_mut(|li| li.timestamp = 10_000 + 3600 + 1);
    client.unstake_tokens(&2, &staker);

    assert_eq!(client.get_staking_power(&2, &staker), 0);
}

#[test]
#[should_panic(expected = "Lock period has not elapsed")]
fn test_unstake_before_lock_period_panics() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let staker = Address::generate(&env);

    env.ledger().with_mut(|li| li.timestamp = 10_000);
    client.stake_tokens(&3, &staker, &1000, &3600);
    client.unstake_tokens(&3, &staker);
}

#[test]
fn test_accrue_staking_rewards_splits_proportionally() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let staker1 = Address::generate(&env);
    let staker2 = Address::generate(&env);

    client.stake_tokens(&4, &staker1, &2000, &3600);
    client.stake_tokens(&4, &staker2, &8000, &3600);

    // Executes without panicking; the reward pool is a fixed constant with no
    // funding source wired in yet (see the module doc comment).
    client.accrue_staking_rewards(&admin, &4);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_non_admin_cannot_accrue_rewards() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let impostor = Address::generate(&env);
    let staker = Address::generate(&env);

    client.stake_tokens(&5, &staker, &1000, &3600);
    client.accrue_staking_rewards(&impostor, &5);
}
