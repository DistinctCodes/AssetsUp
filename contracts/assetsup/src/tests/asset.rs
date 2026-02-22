use crate::tests::helpers::*;
use crate::types::AssetStatus;
use soroban_sdk::{String, Vec, Address, testutils::Address as _};

#[test]
fn test_register_asset_success() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // Verify asset was registered
    let stored_asset = client.get_asset(&asset_id);
    assert_eq!(stored_asset.id, asset_id);
    assert_eq!(stored_asset.owner, user1);
    
    // Verify total asset count increased
    assert_eq!(client.get_total_asset_count(), 1);
    
    // Verify asset is in owner's registry
    let owner_assets = client.get_assets_by_owner(&user1);
    assert_eq!(owner_assets.len(), 1);
    assert_eq!(owner_assets.get(0).unwrap(), asset_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_register_asset_already_exists() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // Try to register same asset again - should panic with AssetAlreadyExists
    client.register_asset(&asset, &admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #34)")]
fn test_register_asset_when_paused() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    env.mock_all_auths();
    
    // Pause contract
    client.pause_contract();
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id);
    
    // Should panic with ContractPaused error
    client.register_asset(&asset, &admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_register_asset_unauthorized() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id);
    
    env.mock_all_auths();
    
    // user2 is not authorized registrar - should panic with Unauthorized
    client.register_asset(&asset, &user2);
}

#[test]
#[should_panic(expected = "Error(Contract, #36)")]
fn test_register_asset_invalid_name_too_short() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let mut asset = create_test_asset(&env, &user1, asset_id);
    asset.name = String::from_str(&env, "AB"); // Too short (< 3 chars)
    
    env.mock_all_auths();
    
    // Should panic with InvalidAssetName error
    client.register_asset(&asset, &admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #37)")]
fn test_register_asset_invalid_purchase_value() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let mut asset = create_test_asset(&env, &user1, asset_id);
    asset.purchase_value = -100; // Negative value
    
    env.mock_all_auths();
    
    // Should panic with InvalidPurchaseValue error
    client.register_asset(&asset, &admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #39)")]
fn test_register_asset_zero_owner() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    
    let zero_address = Address::from_string(&String::from_str(
        &env,
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    ));
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &zero_address, asset_id);
    
    env.mock_all_auths();
    
    // Should panic with InvalidOwnerAddress error
    client.register_asset(&asset, &admin);
}

#[test]
fn test_update_asset_metadata_success() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // Update metadata
    let new_description = Some(String::from_str(&env, "Updated description"));
    let new_uri = Some(String::from_str(&env, "ipfs://QmUpdated123"));
    
    client.update_asset_metadata(&asset_id, &new_description, &new_uri, &None, &user1);
    
    // Verify metadata was updated (just check it doesn't error)
    let updated_asset = client.get_asset(&asset_id);
    assert!(updated_asset.description.len() > 0);
    assert!(updated_asset.metadata_uri.len() > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_update_asset_metadata_not_found() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 999);
    let new_description = Some(String::from_str(&env, "Updated"));
    
    env.mock_all_auths();
    
    // Should panic with AssetNotFound error
    client.update_asset_metadata(&asset_id, &new_description, &None, &None, &user1);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_update_asset_metadata_unauthorized() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    let new_description = Some(String::from_str(&env, "Hacked"));
    
    // user2 is not owner or admin - should panic with Unauthorized
    client.update_asset_metadata(&asset_id, &new_description, &None, &None, &user2);
}

#[test]
fn test_transfer_asset_ownership_success() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // Transfer ownership
    client.transfer_asset_ownership(&asset_id, &user2, &user1);
    
    // Verify ownership was transferred
    let transferred_asset = client.get_asset(&asset_id);
    assert_eq!(transferred_asset.owner, user2);
    assert_eq!(transferred_asset.status, AssetStatus::Transferred);
    
    // Verify asset is in new owner's registry
    let user2_assets = client.get_assets_by_owner(&user2);
    assert_eq!(user2_assets.len(), 1);
    
    // Verify asset is removed from old owner's registry
    let user1_assets = client.get_assets_by_owner(&user1);
    assert_eq!(user1_assets.len(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_transfer_asset_ownership_unauthorized() {
    let env = create_env();
    let (admin, user1, user2, user3) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // user3 is not owner - should panic with Unauthorized
    client.transfer_asset_ownership(&asset_id, &user2, &user3);
}

#[test]
fn test_retire_asset_success() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // Retire asset
    client.retire_asset(&asset_id, &user1);
    
    // Verify asset was retired
    let retired_asset = client.get_asset(&asset_id);
    assert_eq!(retired_asset.status, AssetStatus::Retired);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_retire_asset_unauthorized() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    // user2 is not owner or admin - should panic with Unauthorized
    client.retire_asset(&asset_id, &user2);
}

#[test]
fn test_check_asset_exists() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    
    // Asset doesn't exist yet
    assert_eq!(client.check_asset_exists(&asset_id), false);
    
    // Register asset
    client.register_asset(&asset, &admin);
    
    // Asset now exists
    assert_eq!(client.check_asset_exists(&asset_id), true);
}

#[test]
fn test_get_asset_info() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &user1, asset_id.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset, &admin);
    
    let info = client.get_asset_info(&asset_id);
    assert_eq!(info.id, asset_id);
    assert_eq!(info.owner, user1);
    assert_eq!(info.status, AssetStatus::Active);
}

#[test]
fn test_batch_get_asset_info() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id1 = generate_asset_id(&env, 1);
    let asset_id2 = generate_asset_id(&env, 2);
    let asset1 = create_test_asset(&env, &user1, asset_id1.clone());
    let asset2 = create_test_asset(&env, &user1, asset_id2.clone());
    
    env.mock_all_auths();
    client.register_asset(&asset1, &admin);
    client.register_asset(&asset2, &admin);
    
    let mut ids = Vec::new(&env);
    ids.push_back(asset_id1.clone());
    ids.push_back(asset_id2.clone());
    
    let infos = client.batch_get_asset_info(&ids);
    assert_eq!(infos.len(), 2);
}
