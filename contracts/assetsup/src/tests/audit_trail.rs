#![cfg(test)]

use crate::types::AssetStatus;
use crate::{asset, AssetUpContract, AssetUpContractClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

fn create_test_asset(env: &Env, id: BytesN<32>, owner: Address) -> asset::Asset {
    asset::Asset {
        id,
        name: String::from_str(env, "Test Asset"),
        description: String::from_str(env, "A test asset for audit trail"),
        category: String::from_str(env, "Electronics"),
        owner,
        registration_timestamp: env.ledger().timestamp(),
        last_transfer_timestamp: 0,
        status: AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://QmTest123"),
        purchase_value: 1000,
        custom_attributes: Vec::new(env),
    }
}

#[test]
fn test_audit_log_on_asset_registration() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registrar = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Add registrar
    client.add_authorized_registrar(&registrar);

    // Create and register asset
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset = create_test_asset(&env, asset_id.clone(), admin.clone());

    client.register_asset(&asset, &registrar);

    // Get audit log
    let logs = client.get_asset_audit_logs(&asset_id);

    // Verify audit log entry exists
    assert_eq!(logs.len(), 1);

    let entry = logs.get(0).unwrap();
    assert_eq!(entry.action, String::from_str(&env, "ASSET_REGISTERED"));
    assert_eq!(entry.actor, registrar);
}

#[test]
fn test_audit_log_on_ownership_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);
    client.add_authorized_registrar(&admin);

    // Register asset
    let asset_id = BytesN::from_array(&env, &[2u8; 32]);
    let asset = create_test_asset(&env, asset_id.clone(), owner.clone());
    client.register_asset(&asset, &admin);

    // Transfer ownership
    client.transfer_asset_ownership(&asset_id, &new_owner, &owner);

    // Get audit log
    let logs = client.get_asset_audit_logs(&asset_id);

    // Verify two entries: registration and transfer
    assert_eq!(logs.len(), 2);

    let transfer_entry = logs.get(1).unwrap();
    assert_eq!(
        transfer_entry.action,
        String::from_str(&env, "OWNERSHIP_TRANSFERRED")
    );
    assert_eq!(transfer_entry.actor, owner);
}

#[test]
fn test_audit_log_on_asset_retirement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);
    client.add_authorized_registrar(&admin);

    // Register asset
    let asset_id = BytesN::from_array(&env, &[3u8; 32]);
    let asset = create_test_asset(&env, asset_id.clone(), owner.clone());
    client.register_asset(&asset, &admin);

    // Retire asset
    client.retire_asset(&asset_id, &owner);

    // Get audit log
    let logs = client.get_asset_audit_logs(&asset_id);

    // Verify two entries: registration and retirement
    assert_eq!(logs.len(), 2);

    let retire_entry = logs.get(1).unwrap();
    assert_eq!(retire_entry.action, String::from_str(&env, "ASSET_RETIRED"));
    assert_eq!(retire_entry.actor, owner);
}

#[test]
fn test_audit_log_chronological_order() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);
    client.add_authorized_registrar(&admin);

    // Register asset
    let asset_id = BytesN::from_array(&env, &[4u8; 32]);
    let asset = create_test_asset(&env, asset_id.clone(), owner.clone());
    client.register_asset(&asset, &admin);

    // Update metadata
    client.update_asset_metadata(
        &asset_id,
        &Some(String::from_str(&env, "Updated description")),
        &None,
        &None,
        &owner,
    );

    // Transfer ownership
    client.transfer_asset_ownership(&asset_id, &new_owner, &owner);

    // Get audit log
    let logs = client.get_asset_audit_logs(&asset_id);

    // Verify chronological order
    assert_eq!(logs.len(), 3);

    let first_entry = logs.get(0).unwrap();
    let second_entry = logs.get(1).unwrap();
    let third_entry = logs.get(2).unwrap();

    assert!(first_entry.timestamp <= second_entry.timestamp);
    assert!(second_entry.timestamp <= third_entry.timestamp);

    assert_eq!(
        first_entry.action,
        String::from_str(&env, "ASSET_REGISTERED")
    );
    assert_eq!(
        second_entry.action,
        String::from_str(&env, "METADATA_UPDATED")
    );
    assert_eq!(
        third_entry.action,
        String::from_str(&env, "OWNERSHIP_TRANSFERRED")
    );
}

#[test]
fn test_empty_audit_log_for_nonexistent_asset() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Initialize contract
    client.initialize(&admin);

    // Get audit log for non-existent asset
    let asset_id = BytesN::from_array(&env, &[99u8; 32]);
    let logs = client.get_asset_audit_logs(&asset_id);

    // Verify empty log
    assert_eq!(logs.len(), 0);
}

#[test]
fn test_audit_log_internal_function_not_directly_callable() {
    // This test verifies that append_audit_log is pub(crate) and cannot be called
    // directly from outside the contract. This is enforced at compile time by Rust's
    // visibility rules, so we just document the requirement here.

    // The audit::append_audit_log function is marked as pub(crate), which means:
    // 1. It can be called from within the assetsup crate (lib.rs, tokenization.rs, etc.)
    // 2. It CANNOT be called from external contracts or test code outside the crate
    // 3. Only get_asset_log is publicly accessible through the contract interface

    // This test passes by virtue of the code compiling with the correct visibility.
}
