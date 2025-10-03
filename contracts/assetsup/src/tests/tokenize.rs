#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BytesN, String, testutils::Address as _};

use crate::{
    asset::Asset,
    errors::ContractError,
    types::{AssetStatus, AssetType},
};

use super::initialize::setup_test_environment;

fn make_bytes32(env: &soroban_sdk::Env, seed: u32) -> BytesN<32> {
    let mut arr = [0u8; 32];
    for (i, item) in arr.iter_mut().enumerate() {
        *item = ((seed as usize + i) % 256) as u8;
    }
    BytesN::from_array(env, &arr)
}

#[test]
fn test_tokenize_asset_success_by_admin() {
    let (env, client, admin) = setup_test_environment();

    // initialize admin
    client.initialize(&admin);

    // Prepare and register an asset
    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 10);
    let initial_token = make_bytes32(&env, 0);
    let new_token = make_bytes32(&env, 11);

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Printer X"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Electronics"),
        branch_id: 1,
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1_700_000_000,
        purchase_cost: 5_000,
        current_value: 4_000,
        warranty_expiry: 1_760_000_000,
        stellar_token_id: initial_token,
        owner,
    };

    client.register_asset(&asset);

    // As admin, tokenize the asset
    let res = client.try_tokenize_asset(&admin, &asset_id, &new_token);
    assert!(res.is_ok());

    // Verify updated
    let got = client.get_asset(&asset_id);
    assert_eq!(got.stellar_token_id, new_token);
}

#[test]
fn test_tokenize_asset_unauthorized() {
    let (env, client, admin) = setup_test_environment();

    client.initialize(&admin);

    // Prepare and register an asset
    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 20);
    let initial_token = make_bytes32(&env, 0);
    let new_token = make_bytes32(&env, 21);

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Desk Y"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Furniture"),
        branch_id: 2,
        department_id: 3,
        status: AssetStatus::Active,
        purchase_date: 1_700_000_001,
        purchase_cost: 300,
        current_value: 250,
        warranty_expiry: 1_750_000_000,
        stellar_token_id: initial_token,
        owner,
    };

    client.register_asset(&asset);

    // Non-admin tries to tokenize
    let not_admin = Address::generate(&env);
    let err = client
        .try_tokenize_asset(&not_admin, &asset_id, &new_token)
        .err()
        .unwrap();

    assert_eq!(err, Ok(ContractError::Unauthorized));
}

#[test]
fn test_tokenize_asset_not_found() {
    let (env, client, admin) = setup_test_environment();

    client.initialize(&admin);

    // Non-existent asset id
    let asset_id = make_bytes32(&env, 99);
    let token = make_bytes32(&env, 100);

    let err = client
        .try_tokenize_asset(&admin, &asset_id, &token)
        .err()
        .unwrap();

    assert_eq!(err, Ok(ContractError::AssetNotFound));
}
