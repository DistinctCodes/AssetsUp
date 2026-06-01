#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, MockAuth}, Address, Env, String};

#[test]
fn test_create_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let token = Address::generate(&env);
    
    let escrow_id = 1;
    let asset_id = 100;
    let amount = 5000;
    let deadline = 1000000;

    client.create_escrow(
        &escrow_id,
        &asset_id,
        &seller,
        &buyer,
        &amount,
        &token,
        &deadline,
    );

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.escrow_id, escrow_id);
    assert_eq!(escrow.asset_id, asset_id);
    assert_eq!(escrow.seller, seller);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.token_address, token);
    assert_eq!(escrow.deadline, deadline);
    assert_eq!(escrow.status, EscrowStatus::Active);
}

#[test]
fn test_release_escrow_by_buyer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let token = Address::generate(&env);
    let escrow_id = 10;

    client.create_escrow(
        &escrow_id,
        &200,
        &seller,
        &buyer,
        &5000,
        &token,
        &1000000,
    );

    client.release_escrow(&escrow_id);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn test_dispute_and_admin_resolution() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let token = Address::generate(&env);
    let escrow_id = 11;

    client.create_escrow(
        &escrow_id,
        &201,
        &seller,
        &buyer,
        &5000,
        &token,
        &1000000,
    );

    let reason = String::from_str(&env, "Item damaged on delivery");
    client.dispute_escrow(&escrow_id, &reason);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    assert_eq!(escrow.dispute_reason, Some(reason.clone()));

    env.mock_auths(&[MockAuth::new(&admin)]);
    client.resolve_dispute(&escrow_id, &true);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_non_party_release_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let other = Address::generate(&env);
    let token = Address::generate(&env);
    let escrow_id = 12;

    client.create_escrow(
        &escrow_id,
        &202,
        &seller,
        &buyer,
        &5000,
        &token,
        &1000000,
    );

    env.mock_auths(&[MockAuth::new(&other)]);
    client.release_escrow(&escrow_id);
}

#[test]
fn test_confirm_release() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let token = Address::generate(&env);
    
    let escrow_id = 2;

    client.create_escrow(
        &escrow_id,
        &101,
        &seller,
        &buyer,
        &5000,
        &token,
        &1000000,
    );

    client.confirm_release(&escrow_id);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn test_cancel_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let token = Address::generate(&env);
    
    let escrow_id = 3;

    client.create_escrow(
        &escrow_id,
        &102,
        &seller,
        &buyer,
        &5000,
        &token,
        &1000000,
    );

    client.cancel_escrow(&escrow_id);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Cancelled);
}
