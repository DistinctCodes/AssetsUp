use crate::error::Error;
use crate::tests::helpers::*;
use crate::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize_success() {
    let env = create_env();
    let admin = Address::generate(&env);
    
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    
    env.mock_all_auths();
    client.initialize(&admin);
    
    // Verify admin is set
    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);
    
    // Verify contract is not paused
    assert_eq!(client.is_paused(), false);
    
    // Verify total asset count is 0
    assert_eq!(client.get_total_asset_count(), 0);
    
    // Verify admin is authorized registrar
    assert_eq!(client.is_authorized_registrar(&admin), true);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_initialize_already_initialized() {
    let env = create_env();
    let admin = Address::generate(&env);
    
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    
    env.mock_all_auths();
    client.initialize(&admin);
    
    // Try to initialize again - should panic with AlreadyInitialized error
    client.initialize(&admin);
}

#[test]
fn test_get_contract_metadata() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    
    let metadata = client.get_contract_metadata();
    // Just verify metadata exists and has expected structure
    assert!(metadata.version.len() > 0);
    assert!(metadata.name.len() > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #35)")]
fn test_get_contract_metadata_not_initialized() {
    let env = create_env();
    
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    
    // Should panic with ContractNotInitialized error
    client.get_contract_metadata();
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_get_admin_not_found() {
    let env = create_env();
    
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    
    // Should panic with AdminNotFound error
    client.get_admin();
}
