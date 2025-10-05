#![cfg(test)]

extern crate std;

use super::initialize::setup_test_environment;
use crate::asset::Asset;
use crate::types::{AssetStatus, AssetType};
use soroban_sdk::{Address, BytesN, String, testutils::Address as _};

#[test]
fn test_create_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);

    // Create branch
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Verify branch was created
    let branch = client.get_branch(&branch_id);
    assert_eq!(branch.id, branch_id);
    assert_eq!(branch.name, branch_name);
    assert_eq!(branch.location, branch_location);
    assert_eq!(branch.admin, branch_admin);

    // Verify empty asset list was initialized
    let assets = client.get_branch_assets(&branch_id);
    assert_eq!(assets.len(), 0);
}

#[test]
#[should_panic]
fn test_create_branch_duplicate() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);

    // Create branch first time
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Try to create branch with same ID - should panic
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);
}

#[test]
#[should_panic]
fn test_create_branch_empty_name() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, ""); // Empty name
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);

    // Should panic on empty name
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);
}

#[test]
fn test_add_asset_to_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Create branch
    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Create asset
    let asset_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Computer"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1234567890,
        purchase_cost: 1000,
        current_value: 800,
        warranty_expiry: 1234567890,
        stellar_token_id: BytesN::from_array(&env, &[3u8; 32]),
        owner: Address::generate(&env),
    };
    client.register_asset(&asset);

    // Add asset to branch
    client.add_asset_to_branch(&branch_id, &asset_id);

    // Verify asset is in branch
    let assets = client.get_branch_assets(&branch_id);
    assert_eq!(assets.len(), 1);
    assert_eq!(assets.get(0).unwrap(), asset_id);
}

#[test]
#[should_panic]
fn test_add_asset_to_nonexistent_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_id = BytesN::from_array(&env, &[2u8; 32]);

    // Try to add asset to non-existent branch - should panic
    client.add_asset_to_branch(&branch_id, &asset_id);
}

#[test]
#[should_panic]
fn test_add_nonexistent_asset_to_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Create branch
    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    let asset_id = BytesN::from_array(&env, &[2u8; 32]);

    // Try to add non-existent asset to branch - should panic
    client.add_asset_to_branch(&branch_id, &asset_id);
}

#[test]
fn test_add_duplicate_asset_to_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Create branch
    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Create asset
    let asset_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Computer"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1234567890,
        purchase_cost: 1000,
        current_value: 800,
        warranty_expiry: 1234567890,
        stellar_token_id: BytesN::from_array(&env, &[3u8; 32]),
        owner: Address::generate(&env),
    };
    client.register_asset(&asset);

    // Add asset to branch first time
    client.add_asset_to_branch(&branch_id, &asset_id);

    // Add same asset again (should not panic)
    client.add_asset_to_branch(&branch_id, &asset_id);

    // Verify asset is still only once in the list
    let assets = client.get_branch_assets(&branch_id);
    assert_eq!(assets.len(), 1);
    assert_eq!(assets.get(0).unwrap(), asset_id);
}

#[test]
fn test_get_branch_assets_multiple() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Create branch
    let branch_id = BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = String::from_str(&env, "Main Branch");
    let branch_location = String::from_str(&env, "New York");
    let branch_admin = Address::generate(&env);
    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Create multiple assets
    let asset1_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset2_id = BytesN::from_array(&env, &[3u8; 32]);
    let asset3_id = BytesN::from_array(&env, &[4u8; 32]);

    let asset1 = Asset {
        id: asset1_id.clone(),
        name: String::from_str(&env, "Asset 1"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Computer"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1234567890,
        purchase_cost: 1000,
        current_value: 800,
        warranty_expiry: 1234567890,
        stellar_token_id: BytesN::from_array(&env, &[5u8; 32]),
        owner: Address::generate(&env),
    };

    let asset2 = Asset {
        id: asset2_id.clone(),
        name: String::from_str(&env, "Asset 2"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Desk"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1234567890,
        purchase_cost: 500,
        current_value: 400,
        warranty_expiry: 1234567890,
        stellar_token_id: BytesN::from_array(&env, &[6u8; 32]),
        owner: Address::generate(&env),
    };

    let asset3 = Asset {
        id: asset3_id.clone(),
        name: String::from_str(&env, "Asset 3"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Car"),
        branch_id: branch_id.clone(),
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1234567890,
        purchase_cost: 20000,
        current_value: 15000,
        warranty_expiry: 1234567890,
        stellar_token_id: BytesN::from_array(&env, &[7u8; 32]),
        owner: Address::generate(&env),
    };

    client.register_asset(&asset1);
    client.register_asset(&asset2);
    client.register_asset(&asset3);

    // Add assets to branch
    client.add_asset_to_branch(&branch_id, &asset1_id);
    client.add_asset_to_branch(&branch_id, &asset2_id);
    client.add_asset_to_branch(&branch_id, &asset3_id);

    // Get branch assets
    let assets = client.get_branch_assets(&branch_id);
    assert_eq!(assets.len(), 3);

    // Verify all assets are present
    let mut found_asset1 = false;
    let mut found_asset2 = false;
    let mut found_asset3 = false;

    for i in 0..assets.len() {
        let asset_id = assets.get(i).unwrap();
        if asset_id == asset1_id {
            found_asset1 = true;
        } else if asset_id == asset2_id {
            found_asset2 = true;
        } else if asset_id == asset3_id {
            found_asset3 = true;
        }
    }
    assert!(found_asset1 && found_asset2 && found_asset3);
}

#[test]
#[should_panic]
fn test_get_branch_assets_nonexistent_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);

    // Try to get assets for non-existent branch - should panic
    client.get_branch_assets(&branch_id);
}

#[test]
#[should_panic]
fn test_get_branch_nonexistent() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    let branch_id = BytesN::from_array(&env, &[1u8; 32]);

    // Try to get non-existent branch - should panic
    client.get_branch(&branch_id);
}
