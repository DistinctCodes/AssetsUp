#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

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
    assert_eq!(escrow.status, EscrowStatus::Completed);
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
