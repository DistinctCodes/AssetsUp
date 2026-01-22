#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BytesN, Env, String, testutils::Address as _};

use crate::{
    asset::Asset,
    types::{AssetStatus, AssetType},
};

use super::initialize::setup_test_environment;

fn make_bytes32(env: &Env, seed: u32) -> BytesN<32> {
    let mut arr = [0u8; 32];
    for (i, item) in arr.iter_mut().enumerate() {
        *item = ((seed as usize + i) % 256) as u8;
    }
    BytesN::from_array(env, &arr)
}

#[test]
fn test_tokenize_asset_success() {
    let (env, client, admin) = setup_test_environment();
    // initialize admin
    client.initialize(&admin);

    // prepare an asset and register
    let owner = Address::generate(&env);
    let id = make_bytes32(&env, 11);
    let initial_token = make_bytes32(&env, 12);
    let branch_id = make_bytes32(&env, 99);

    let asset = Asset {
        id: id.clone(),
        name: String::from_str(&env, "Server X"),
        asset_type: AssetType::Digital,
        category: String::from_str(&env, "Compute"),
        branch_id: branch_id.clone(),
        department_id: 7,
        status: AssetStatus::Active,
        purchase_date: 1_725_000_100,
        purchase_cost: 1_000_000,
        current_value: 900_000,
        warranty_expiry: 1_826_000_000,
        stellar_token_id: initial_token,
        owner: owner.clone(),
    };

    client.register_asset(&asset);

    // new token id to set
    let new_token = make_bytes32(&env, 13);

    // admin-only: with mocked auth, this will succeed
    let res = client.try_tokenize_asset(&id, &new_token);
    assert!(res.is_ok());

    // verify updated
    let got = client.get_asset(&id);
    assert_eq!(got.stellar_token_id, new_token);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_tokenize_asset_without_admin_initialized() {
    let (env, client, _admin) = setup_test_environment();

    // prepare an asset and register
    let owner = Address::generate(&env);
    let id = make_bytes32(&env, 21);
    let token = make_bytes32(&env, 22);
    let branch_id = make_bytes32(&env, 1);

    let asset = Asset {
        id: id.clone(),
        name: String::from_str(&env, "Router Y"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Network"),
        branch_id: branch_id.clone(),
        department_id: 2,
        status: AssetStatus::Active,
        purchase_date: 1_700_000_001,
        purchase_cost: 50_000,
        current_value: 45_000,
        warranty_expiry: 1_760_000_000,
        stellar_token_id: make_bytes32(&env, 23),
        owner,
    };

    client.register_asset(&asset);

    // calling tokenize without initialize should panic with AdminNotFound (Error #2)
    client.tokenize_asset(&id, &token);
}
