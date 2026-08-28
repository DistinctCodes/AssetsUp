#![cfg(test)]

use crate::escrow::EscrowStatus;
use crate::{ContribContract, ContribContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup_test(env: &Env) -> (ContribContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

fn open_escrow(env: &Env, client: &ContribContractClient<'_>) -> (u64, Address, Address) {
    let seller = Address::generate(env);
    let buyer = Address::generate(env);
    let token = Address::generate(env);

    let escrow_id = client.create_escrow(&100, &seller, &buyer, &5000, &token, &1_000_000);
    (escrow_id, seller, buyer)
}

#[test]
fn test_create_escrow() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, seller, buyer) = open_escrow(&env, &client);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.asset_id, 100);
    assert_eq!(escrow.seller, seller);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.amount, 5000);
    assert_eq!(escrow.status, EscrowStatus::Active);
}

#[test]
fn test_sequential_escrows_get_distinct_ids() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (first_id, ..) = open_escrow(&env, &client);
    let (second_id, ..) = open_escrow(&env, &client);

    assert_ne!(first_id, second_id);
}

#[test]
fn test_buyer_confirms_release() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, _seller, buyer) = open_escrow(&env, &client);

    client.confirm_release(&escrow_id, &buyer);

    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::Completed
    );
}

#[test]
#[should_panic(expected = "Unauthorized: only the buyer can release the escrow")]
fn test_seller_cannot_confirm_release() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, seller, _buyer) = open_escrow(&env, &client);

    client.confirm_release(&escrow_id, &seller);
}

#[test]
fn test_seller_cancels_escrow() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, seller, _buyer) = open_escrow(&env, &client);

    client.cancel_escrow(&escrow_id, &seller);

    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::Cancelled
    );
}

#[test]
fn test_buyer_cancels_escrow() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, _seller, buyer) = open_escrow(&env, &client);

    client.cancel_escrow(&escrow_id, &buyer);

    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::Cancelled
    );
}

#[test]
#[should_panic(expected = "Unauthorized: only the buyer or seller can cancel the escrow")]
fn test_unrelated_address_cannot_cancel() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, ..) = open_escrow(&env, &client);
    let stranger = Address::generate(&env);

    client.cancel_escrow(&escrow_id, &stranger);
}

#[test]
#[should_panic(expected = "Escrow is not active")]
fn test_cannot_release_after_cancel() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let (escrow_id, seller, buyer) = open_escrow(&env, &client);

    client.cancel_escrow(&escrow_id, &seller);
    client.confirm_release(&escrow_id, &buyer);
}
