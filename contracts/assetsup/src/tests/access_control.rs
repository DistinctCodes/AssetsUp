#![cfg(test)]
use crate::asset::Asset;
use crate::types::{AssetStatus, AssetType};
use crate::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{Address, BytesN, Env, String, testutils::Address as _};

extern crate std;

/// Setup test environment with contract and addresses
fn setup_test_environment() -> (Env, AssetUpContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (env, client, admin)
}

#[test]
fn test_global_admin_can_create_branch() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Admin should be able to create branch
    let branch_id = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);
    let branch_name = soroban_sdk::String::from_str(&env, "Test Branch");
    let branch_location = soroban_sdk::String::from_str(&env, "Test Location");
    let branch_admin = Address::generate(&env);

    client.create_branch(&branch_id, &branch_name, &branch_location, &branch_admin);

    // Verify branch was created
    let branch = client.get_branch(&branch_id);
    assert_eq!(branch.id, branch_id);
    assert_eq!(branch.name, branch_name);
    assert_eq!(branch.location, branch_location);
    assert_eq!(branch.admin, branch_admin);
}

#[test]
fn test_global_admin_can_tokenize_asset() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id: 1,
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1000,
        purchase_cost: 1000,
        current_value: 1000,
        warranty_expiry: 2000,
        stellar_token_id: BytesN::from_array(&env, &[0u8; 32]),
        owner: asset_owner.clone(),
    };

    client.register_asset(&asset);

    // Admin should be able to tokenize asset
    let token_id = BytesN::from_array(&env, &[2u8; 32]);
    client.tokenize_asset(&asset_id, &token_id);

    // Verify asset was tokenized
    let updated_asset = client.get_asset(&asset_id);
    assert_eq!(updated_asset.stellar_token_id, token_id);
}

#[test]
fn test_asset_owner_can_log_audit_action() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id: 1,
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1000,
        purchase_cost: 1000,
        current_value: 1000,
        warranty_expiry: 2000,
        stellar_token_id: BytesN::from_array(&env, &[0u8; 32]),
        owner: asset_owner.clone(),
    };

    client.register_asset(&asset);

    // Asset owner should be able to log audit action
    let action = String::from_str(&env, "PROCURED");
    let details = String::from_str(&env, "Asset registered");

    // Verify audit log was created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().action, action);
    assert_eq!(logs.get(0).unwrap().details, details);
    assert_eq!(logs.get(0).unwrap().asset_id, asset_id);
}

#[test]
fn test_global_admin_can_log_audit_action() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id: 1,
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1000,
        purchase_cost: 1000,
        current_value: 1000,
        warranty_expiry: 2000,
        stellar_token_id: BytesN::from_array(&env, &[0u8; 32]),
        owner: asset_owner.clone(),
    };

    client.register_asset(&asset);

    // Global admin should be able to log audit action
    let action = String::from_str(&env, "PROCURED");
    let details = String::from_str(&env, "Asset registered");

    // Verify audit log was created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().action, action);
    assert_eq!(logs.get(0).unwrap().details, details);
    assert_eq!(logs.get(0).unwrap().asset_id, asset_id);
}

#[test]
fn test_multiple_audit_logs_for_asset() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id: 1,
        department_id: 1,
        status: AssetStatus::Active,
        purchase_date: 1000,
        purchase_cost: 1000,
        current_value: 1000,
        warranty_expiry: 2000,
        stellar_token_id: BytesN::from_array(&env, &[0u8; 32]),
        owner: asset_owner.clone(),
    };

    client.register_asset(&asset);

    // Log multiple audit actions (both as owner)
    let action1 = String::from_str(&env, "Maintenance");
    let details1 = String::from_str(&env, "Regular maintenance");
    client.log_audit_action_as_owner(&asset_id, &action1, &details1);

    let action2 = String::from_str(&env, "Inspection");
    let details2 = String::from_str(&env, "Safety inspection");
    client.log_audit_action_as_owner(&asset_id, &action2, &details2);

    // Verify both audit logs were created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 3);

    // Check that both actions are present
    let mut found_maintenance = false;
    let mut found_inspection = false;

    for i in 0..logs.len() {
        let log = logs.get(i).unwrap();
        if log.action == action1 {
            found_maintenance = true;
            assert_eq!(log.details, details1);
        } else if log.action == action2 {
            found_inspection = true;
            assert_eq!(log.details, details2);
        }
    }

    assert!(found_maintenance);
    assert!(found_inspection);
}
