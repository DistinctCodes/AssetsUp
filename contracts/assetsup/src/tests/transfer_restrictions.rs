use crate::tests::helpers::*;
use crate::types::AssetType;
use soroban_sdk::String;

#[test]
fn test_add_to_whitelist() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Initially not whitelisted
    assert!(!client.is_whitelisted(&1u64, &user2));

    // Add to whitelist
    client.add_to_whitelist(&1u64, &user2);

    assert!(client.is_whitelisted(&1u64, &user2));
}

#[test]
fn test_remove_from_whitelist() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Add to whitelist
    client.add_to_whitelist(&1u64, &user2);
    assert!(client.is_whitelisted(&1u64, &user2));

    // Remove from whitelist
    client.remove_from_whitelist(&1u64, &user2);
    assert!(!client.is_whitelisted(&1u64, &user2));
}

#[test]
fn test_get_whitelist() {
    let env = create_env();
    let (admin, user1, user2, user3) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Add multiple addresses to whitelist
    client.add_to_whitelist(&1u64, &user2);
    client.add_to_whitelist(&1u64, &user3);

    let whitelist = client.get_whitelist(&1u64);
    assert_eq!(whitelist.len(), 2);
}

#[test]
fn test_add_duplicate_to_whitelist() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Add to whitelist twice
    client.add_to_whitelist(&1u64, &user2);
    client.add_to_whitelist(&1u64, &user2);

    // Should still only have one entry
    let whitelist = client.get_whitelist(&1u64);
    assert_eq!(whitelist.len(), 1);
}

#[test]
fn test_set_transfer_restriction() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Set transfer restriction
    client.set_transfer_restriction(&1u64, &true);

    // Restriction should be set (no error means success)
}

#[test]
fn test_transfer_with_whitelist() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Add user2 to whitelist
    client.add_to_whitelist(&1u64, &user2);

    // Transfer should succeed
    client.transfer_tokens(&1u64, &user1, &user2, &100000i128);

    let balance = client.get_token_balance(&1u64, &user2);
    assert_eq!(balance, 100000);
}

#[test]
fn test_empty_whitelist() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    let whitelist = client.get_whitelist(&1u64);
    assert_eq!(whitelist.len(), 0);
}

#[test]
#[should_panic]
fn test_transfer_to_non_whitelisted_fails() {
    use soroban_sdk::testutils::Address as _;
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let user3 = soroban_sdk::Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &2u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // Only user2 is whitelisted
    client.add_to_whitelist(&2u64, &user2);

    // Transfer to user3 (not whitelisted) should panic with TransferRestricted
    client.transfer_tokens(&2u64, &user1, &user3, &100000i128);
}

#[test]
fn test_empty_whitelist_allows_transfer() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    client.tokenize_asset(
        &3u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );

    // No whitelist — transfer should succeed
    client.transfer_tokens(&3u64, &user1, &user2, &100000i128);
    assert_eq!(client.get_token_balance(&3u64, &user2), 100000);
}
