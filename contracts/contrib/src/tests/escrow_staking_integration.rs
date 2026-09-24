//! Issue #1533 – cross-module integration: escrow release adjusts staking rewards.

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{escrow::EscrowStatus, ContribContract, ContribContractClient};

fn setup(env: &Env) -> (ContribContractClient<'_>, Address) {
    env.mock_all_auths();
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_escrow_release_adjusts_seller_staking_rewards() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token = Address::generate(&env);
    let asset_id = 99u64;

    // Seller stakes on the asset that will be escrowed.
    client.stake_tokens(&asset_id, &seller, &5_000i128, &1u64);
    let before = client.get_stake(&asset_id, &seller).rewards_earned;
    assert_eq!(before, 0);

    let escrow_amount = 10_000i128;
    let escrow_id =
        client.create_escrow(&asset_id, &seller, &buyer, &escrow_amount, &token, &1_000_000u64);

    client.confirm_release(&escrow_id, &buyer);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Completed);

    let after = client.get_stake(&asset_id, &seller).rewards_earned;
    // on_escrow_released credits 1% of escrow amount.
    assert_eq!(after, escrow_amount / 100);
    assert!(after > before);
}

#[test]
fn test_escrow_release_noop_when_seller_not_staked() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token = Address::generate(&env);
    let asset_id = 11u64;

    let escrow_id =
        client.create_escrow(&asset_id, &seller, &buyer, &1_000i128, &token, &1_000_000u64);
    // Should not panic even though seller has no stake.
    client.confirm_release(&escrow_id, &buyer);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Completed);
}
