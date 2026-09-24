use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

use crate::{pause::Subsystem, ContribContract, ContribContractClient};

fn setup(env: &Env) -> (ContribContractClient<'_>, Address) {
    env.mock_all_auths();
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_stake_and_power() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let staker = Address::generate(&env);

    client.stake_tokens(&1u64, &staker, &1_000i128, &100u64);
    assert_eq!(client.get_staking_power(&1u64, &staker), 1_000);
}

/// Issue #1530 – mid-period joiners receive a pro-rated share of the reward pool.
#[test]
fn test_mid_period_joiner_is_prorated() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let early = Address::generate(&env);
    let late = Address::generate(&env);
    let asset_id = 42u64;

    // Fixed 1_000 second period for easy math.
    client.set_reward_period_length(&admin, &asset_id, &1_000u64);

    // Early staker deposits at t≈0.
    client.stake_tokens(&asset_id, &early, &1_000i128, &10_000u64);

    // Advance halfway through the period.
    env.ledger().with_mut(|li| {
        li.timestamp = 500;
    });

    // Late staker joins mid-period with the same principal.
    client.stake_tokens(&asset_id, &late, &1_000i128, &10_000u64);

    // Accrue at end of period window.
    env.ledger().with_mut(|li| {
        li.timestamp = 1_000;
    });
    client.accrue_staking_rewards(&admin, &asset_id);

    let early_rewards = client.get_stake(&asset_id, &early).rewards_earned;
    let late_rewards = client.get_stake(&asset_id, &late).rewards_earned;

    // Weights: early = 1000 * 1000; late = 1000 * 500 → ~2:1 ratio.
    assert!(
        early_rewards > late_rewards,
        "early staker should earn more than mid-period joiner (early={early_rewards}, late={late_rewards})"
    );
    assert!(
        (early_rewards - 2 * late_rewards).abs() <= 2,
        "expected ~2:1 ratio, got early={early_rewards} late={late_rewards}"
    );
}

#[test]
#[should_panic(expected = "Subsystem is paused")]
fn test_staking_subsystem_pause_blocks_stake() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let staker = Address::generate(&env);

    client.pause_subsystem(&admin, &Subsystem::Staking);
    assert!(client.is_subsystem_paused(&Subsystem::Staking));
    client.stake_tokens(&1u64, &staker, &100i128, &50u64);
}

/// Issue #1531 – pausing staking must not freeze escrow.
#[test]
fn test_pausing_staking_does_not_block_escrow() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    client.pause_subsystem(&admin, &Subsystem::Staking);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token = Address::generate(&env);
    let id = client.create_escrow(&7u64, &seller, &buyer, &500i128, &token, &1_000_000u64);
    assert_eq!(
        client.get_escrow(&id).status,
        crate::escrow::EscrowStatus::Active
    );
}
