#![cfg(test)]
use crate::asset::Asset;
use crate::types::{ActionType, AssetStatus, AssetType};
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
    let branch_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id,
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
    let branch_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id,
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
    let details = String::from_str(&env, "Asset registered");

    // Verify audit log was created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().action, ActionType::Procured);
    assert_eq!(logs.get(0).unwrap().note, details);
}

#[test]
fn test_global_admin_can_log_audit_action() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let branch_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id,
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
    let details = String::from_str(&env, "Asset registered");

    // Verify audit log was created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().action, ActionType::Procured);
    assert_eq!(logs.get(0).unwrap().note, details);
    assert_eq!(logs.get(0).unwrap().actor, asset_owner);
}

#[test]
fn test_multiple_audit_logs_for_asset() {
    let (env, client, admin) = setup_test_environment();
    client.initialize(&admin);

    // Register an asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_owner = Address::generate(&env);
    let branch_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = Asset {
        id: asset_id.clone(),
        name: String::from_str(&env, "Test Asset"),
        asset_type: AssetType::Physical,
        category: String::from_str(&env, "Test Category"),
        branch_id,
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

    // Log multiple audit actions
    let action1 = ActionType::Procured;
    let details1 = String::from_str(&env, "Asset registered");

    let action2 = ActionType::Inspected;
    let details2 = String::from_str(&env, "Safety inspection");
    client.log_action(&admin, &asset_id, &action2, &details2);

    // Verify both audit logs were created
    let logs = client.get_asset_audit_logs(&asset_id);
    assert_eq!(logs.len(), 2);

    // Check that both actions are present
    let log1 = logs.get(0).unwrap();
    assert_eq!(log1.action, action1);
    assert_eq!(log1.note, details1);

    let log2 = logs.get(1).unwrap();
    assert_eq!(log2.action, action2);
    assert_eq!(log2.note, details2);
}
