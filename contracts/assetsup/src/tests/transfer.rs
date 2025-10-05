#![cfg(test)]

extern crate std;

use soroban_sdk::{
    Address, BytesN, Env, String,
    testutils::{Address as _, Ledger as _},
};

use crate::{
    asset::Asset,
    types::{ActionType, AssetStatus, AssetType},
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
fn test_transfer_asset_by_owner() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 1);
    let initial_branch_id = make_bytes32(&env, 10);
    let new_branch_id = make_bytes32(&env, 20);

    // Create branches
    client.create_branch(
        &initial_branch_id,
        &String::from_str(&env, "Initial Branch"),
        &String::from_str(&env, "Location A"),
        &Address::generate(&env),
    );
    client.create_branch(
        &new_branch_id,
        &String::from_str(&env, "New Branch"),
        &String::from_str(&env, "Location B"),
        &Address::generate(&env),
    );

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Equipment"),
        branch_id: initial_branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 0,
        purchase_cost: 1000,
        current_value: 800,
        warranty_expiry: 0,
        stellar_token_id: make_bytes32(&env, 2),
        owner: owner.clone(),
    };
    client.register_asset(&asset);
    client.add_asset_to_branch(&initial_branch_id, &asset_id);

    assert_eq!(client.get_branch_assets(&initial_branch_id).len(), 1);
    assert_eq!(client.get_branch_assets(&new_branch_id).len(), 0);

    env.ledger().with_mut(|li| {
        li.timestamp = 12345;
    });

    client.transfer_asset(&owner, &asset_id, &new_branch_id);

    let updated_asset = client.get_asset(&asset_id);
    assert_eq!(updated_asset.branch_id, new_branch_id);

    assert_eq!(client.get_branch_assets(&initial_branch_id).len(), 0);
    assert_eq!(client.get_branch_assets(&new_branch_id).len(), 1);
    assert_eq!(
        client.get_branch_assets(&new_branch_id).get(0).unwrap(),
        asset_id
    );

    let log = client.get_asset_log(&asset_id);
    assert_eq!(log.len(), 1);
    let entry = log.get(0).unwrap();
    assert_eq!(entry.actor, owner);
    assert_eq!(entry.action, ActionType::Transferred);
    assert_eq!(entry.timestamp, 12345);
}

#[test]
fn test_transfer_asset_by_admin() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 3);
    let initial_branch_id = make_bytes32(&env, 30);
    let new_branch_id = make_bytes32(&env, 40);

    // Create branches
    client.create_branch(
        &initial_branch_id,
        &String::from_str(&env, "Initial Branch"),
        &String::from_str(&env, "Location A"),
        &Address::generate(&env),
    );
    client.create_branch(
        &new_branch_id,
        &String::from_str(&env, "New Branch"),
        &String::from_str(&env, "Location B"),
        &Address::generate(&env),
    );

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Admin Transfer"),
        asset_type: AssetType::Digital,
        category: String::from_str(&env, "Software"),
        branch_id: initial_branch_id.clone(),
        department_id: 2,
        status: AssetStatus::Active,
        purchase_date: 0,
        purchase_cost: 500,
        current_value: 500,
        warranty_expiry: 0,
        stellar_token_id: make_bytes32(&env, 4),
        owner: owner.clone(),
    };
    client.register_asset(&asset);
    client.add_asset_to_branch(&initial_branch_id, &asset_id);

    client.transfer_asset(&admin, &asset_id, &new_branch_id);

    let updated_asset = client.get_asset(&asset_id);
    assert_eq!(updated_asset.branch_id, new_branch_id);

    assert_eq!(client.get_branch_assets(&initial_branch_id).len(), 0);
    assert_eq!(client.get_branch_assets(&new_branch_id).len(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_transfer_asset_unauthorized() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let unauthorized_actor = Address::generate(&env);
    let asset_id = make_bytes32(&env, 5);
    let branch_id = make_bytes32(&env, 1);
    let new_branch_id = make_bytes32(&env, 2);

    client.create_branch(
        &branch_id,
        &String::from_str(&env, "Branch 1"),
        &String::from_str(&env, "Location"),
        &Address::generate(&env),
    );
    client.create_branch(
        &new_branch_id,
        &String::from_str(&env, "Branch 2"),
        &String::from_str(&env, "Location"),
        &Address::generate(&env),
    );

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Unauthorized Test"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Tool"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 0,
        purchase_cost: 100,
        current_value: 100,
        warranty_expiry: 0,
        stellar_token_id: make_bytes32(&env, 6),
        owner: owner.clone(),
    };
    client.register_asset(&asset);
    client.add_asset_to_branch(&branch_id, &asset_id);

    client.transfer_asset(&unauthorized_actor, &asset_id, &new_branch_id);
}

#[test]
fn test_transfer_to_same_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 7);
    let initial_branch_id = make_bytes32(&env, 50);

    client.create_branch(
        &initial_branch_id,
        &String::from_str(&env, "Branch"),
        &String::from_str(&env, "Location"),
        &Address::generate(&env),
    );

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Same Branch Transfer"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Furniture"),
        branch_id: initial_branch_id.clone(),
        department_id: 3,
        status: AssetStatus::Active,
        purchase_date: 0,
        purchase_cost: 200,
        current_value: 150,
        warranty_expiry: 0,
        stellar_token_id: make_bytes32(&env, 8),
        owner: owner.clone(),
    };
    client.register_asset(&asset);
    client.add_asset_to_branch(&initial_branch_id, &asset_id);

    // No transfer should happen, no error
    client.transfer_asset(&owner, &asset_id, &initial_branch_id);

    let updated_asset = client.get_asset(&asset_id);
    assert_eq!(updated_asset.branch_id, initial_branch_id);

    assert_eq!(client.get_branch_assets(&initial_branch_id).len(), 1);

    // No log should be created
    let log = client.get_asset_log(&asset_id);
    assert_eq!(log.len(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_transfer_nonexistent_asset() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let non_existent_asset_id = make_bytes32(&env, 99);
    let branch_id = make_bytes32(&env, 100);
    client.create_branch(
        &branch_id,
        &String::from_str(&env, "Branch"),
        &String::from_str(&env, "Location"),
        &Address::generate(&env),
    );

    client.transfer_asset(&admin, &non_existent_asset_id, &branch_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_transfer_to_nonexistent_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let owner = Address::generate(&env);
    let asset_id = make_bytes32(&env, 1);
    let initial_branch_id = make_bytes32(&env, 10);
    let non_existent_branch_id = make_bytes32(&env, 99);

    client.create_branch(
        &initial_branch_id,
        &String::from_str(&env, "Initial"),
        &String::from_str(&env, "Location"),
        &Address::generate(&env),
    );

    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Equipment"),
        branch_id: initial_branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 0,
        purchase_cost: 1000,
        current_value: 800,
        warranty_expiry: 0,
        stellar_token_id: make_bytes32(&env, 2),
        owner: owner.clone(),
    };
    client.register_asset(&asset);
    client.add_asset_to_branch(&initial_branch_id, &asset_id);

    client.transfer_asset(&owner, &asset_id, &non_existent_branch_id);
}
