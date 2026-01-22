#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::{Address as _, BytesN as _};

use soroban_sdk::{Address, BytesN, Env, String};

use crate::{
    asset::Asset,
    types::{ActionType, AssetStatus, AssetType},
};

use super::initialize::setup_test_environment;

fn make_bytes32(env: &Env, seed: u32) -> BytesN<32> {
    let mut arr = [0u8; 32];
    // Simple deterministic fill
    for (i, item) in arr.iter_mut().enumerate() {
        *item = ((seed as usize + i) % 256) as u8;
    }
    BytesN::from_array(env, &arr)
}

#[test]
fn test_register_and_get_asset_success() {
    let (env, client, _admin) = setup_test_environment();
    let owner = Address::generate(&env);

    let id = make_bytes32(&env, 1);
    let token = make_bytes32(&env, 2);
    let branch_id = make_bytes32(&env, 10);

    let name = String::from_str(&env, "Laptop A");
    let category = String::from_str(&env, "Electronics");

    let asset = Asset {
        id: id.clone(),
        name: name.clone(),
        asset_type: AssetType::Digital,
        category: category.clone(),
        branch_id: branch_id.clone(),
        department_id: 20,
        status: AssetStatus::Active,
        purchase_date: 1_725_000_000,
        purchase_cost: 120_000,
        current_value: 100_000,
        warranty_expiry: 1_800_000_000,
        stellar_token_id: token.clone(),
        owner: owner.clone(),
    };

    let res = client.try_register_asset(&asset);
    assert!(res.is_ok());

    let got = client.try_get_asset(&id).unwrap().unwrap();

    assert_eq!(got.id, id);
    assert_eq!(got.name, name);
    assert_eq!(got.asset_type, AssetType::Digital);
    assert_eq!(got.category, category);
    assert_eq!(got.branch_id, branch_id);
    assert_eq!(got.department_id, 20);
    assert_eq!(got.status, AssetStatus::Active);
    assert_eq!(got.purchase_date, 1_725_000_000);
    assert_eq!(got.purchase_cost, 120_000);
    assert_eq!(got.current_value, 100_000);
    assert_eq!(got.warranty_expiry, 1_800_000_000);
    assert_eq!(got.stellar_token_id, token);
    assert_eq!(got.owner, owner);
}

#[test]
#[should_panic]
fn test_register_asset_duplicate() {
    let (env, client, _admin) = setup_test_environment();
    let owner = Address::generate(&env);

    let id = make_bytes32(&env, 3);
    let token = make_bytes32(&env, 4);
    let branch_id = make_bytes32(&env, 1);

    let name = String::from_str(&env, "Office Chair");
    let category = String::from_str(&env, "Furniture");

    let asset = Asset {
        id: id.clone(),
        name: name.clone(),
        asset_type: AssetType::Physical,
        category: category.clone(),
        branch_id: branch_id.clone(),
        department_id: 2,
        status: AssetStatus::Active,
        purchase_date: 1_700_000_000,
        purchase_cost: 15_000,
        current_value: 12_000,
        warranty_expiry: 1_750_000_000,
        stellar_token_id: token.clone(),
        owner: owner.clone(),
    };

    // First registration should succeed
    client.register_asset(&asset);

    // Second registration with same ID should panic (Err propagated)
    client.register_asset(&asset);
}

#[test]
fn test_update_status_creates_audit_log() {
    let (env, client, _admin) = setup_test_environment();
    let owner = Address::generate(&env);

    // Create and register asset first
    let asset = Asset {
        id: BytesN::random(&env),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id: BytesN::random(&env),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 12345,
        purchase_cost: 1000,
        current_value: 900,
        warranty_expiry: 67890,
        stellar_token_id: BytesN::random(&env),
        owner: owner.clone(),
    };

    client.register_asset(&asset);

    // Update to Maintained status
    client.update_asset_status(&asset.id, &AssetStatus::InMaintenance);

    // Verify audit logs
    let logs = client.get_asset_audit_logs(&asset.id);
    assert_eq!(logs.len(), 2); // Procurement + Maintenance
    assert_eq!(logs.get(1).unwrap().action, ActionType::Maintained);
    assert_eq!(logs.get(1).unwrap().actor, owner);
}
