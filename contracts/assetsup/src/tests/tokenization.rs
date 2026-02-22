use crate::tests::helpers::*;
use crate::types::AssetType;
use soroban_sdk::String;

#[test]
fn test_tokenize_asset_success() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    let result = client.tokenize_asset(
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

    assert_eq!(result.asset_id, 1);
    assert_eq!(result.total_supply, 1000000);
    assert_eq!(result.tokenizer, user1);
    assert_eq!(result.tokens_in_circulation, 1000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_tokenize_asset_already_tokenized() {
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

    // Try to tokenize again - should panic with AssetAlreadyTokenized
    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST2"),
        &500000i128,
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token 2"),
        &String::from_str(&env, "Another test"),
        &AssetType::Physical,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_tokenize_asset_invalid_supply() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Should panic with InvalidTokenSupply error
    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &0i128, // Invalid: zero supply
        &6u32,
        &100i128,
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );
}

#[test]
fn test_mint_tokens_success() {
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

    let result = client.mint_tokens(&1u64, &500000i128, &user1);

    assert_eq!(result.total_supply, 1500000);
    assert_eq!(result.tokens_in_circulation, 1500000);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_mint_tokens_unauthorized() {
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

    // user2 is not tokenizer - should panic with Unauthorized
    client.mint_tokens(&1u64, &500000i128, &user2);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_mint_tokens_not_tokenized() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Should panic with AssetNotTokenized error
    client.mint_tokens(&999u64, &500000i128, &user1);
}

#[test]
fn test_burn_tokens_success() {
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

    let result = client.burn_tokens(&1u64, &200000i128, &user1);

    assert_eq!(result.total_supply, 800000);
    assert_eq!(result.tokens_in_circulation, 800000);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_burn_tokens_insufficient_balance() {
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

    // Should panic with InsufficientBalance error
    client.burn_tokens(&1u64, &2000000i128, &user1);
}

#[test]
fn test_transfer_tokens_success() {
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

    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);

    // Verify balances
    let balance1 = client.get_token_balance(&1u64, &user1);
    let balance2 = client.get_token_balance(&1u64, &user2);

    assert_eq!(balance1, 700000);
    assert_eq!(balance2, 300000);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_transfer_tokens_insufficient_balance() {
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

    // Should panic with InsufficientBalance error
    client.transfer_tokens(&1u64, &user1, &user2, &2000000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #16)")]
fn test_transfer_tokens_locked() {
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

    // Lock tokens
    let future_time = env.ledger().timestamp() + 1000;
    client.lock_tokens(&1u64, &user1, &future_time, &user1);

    // Should panic with TokensAreLocked error
    client.transfer_tokens(&1u64, &user1, &user2, &100000i128);
}

#[test]
fn test_lock_unlock_tokens() {
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

    // Initially not locked
    assert!(!client.is_tokens_locked(&1u64, &user1));

    // Lock tokens
    let future_time = env.ledger().timestamp() + 1000;
    client.lock_tokens(&1u64, &user1, &future_time, &user1);

    assert!(client.is_tokens_locked(&1u64, &user1));

    // Unlock tokens
    client.unlock_tokens(&1u64, &user1);

    assert!(!client.is_tokens_locked(&1u64, &user1));
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_lock_tokens_unauthorized() {
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

    let future_time = env.ledger().timestamp() + 1000;

    // user2 is not tokenizer - should panic with Unauthorized
    client.lock_tokens(&1u64, &user1, &future_time, &user2);
}

#[test]
fn test_get_ownership_percentage() {
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

    // Transfer 30% to user2
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);

    // Check ownership percentages (in basis points)
    let percentage1 = client.get_ownership_percentage(&1u64, &user1);
    let percentage2 = client.get_ownership_percentage(&1u64, &user2);

    assert_eq!(percentage1, 7000); // 70%
    assert_eq!(percentage2, 3000); // 30%
}

#[test]
fn test_get_token_holders() {
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

    // Initially only user1
    let holders = client.get_token_holders(&1u64);
    assert_eq!(holders.len(), 1);

    // Transfer to user2 and user3
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);
    client.transfer_tokens(&1u64, &user1, &user3, &200000i128);

    // Now should have 3 holders
    let holders = client.get_token_holders(&1u64);
    assert_eq!(holders.len(), 3);
}

#[test]
fn test_update_valuation() {
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

    client.update_valuation(&1u64, &2000000i128);

    let asset = client.get_tokenized_asset(&1u64);
    assert_eq!(asset.valuation, 2000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #30)")]
fn test_update_valuation_invalid() {
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

    // Should panic with InvalidValuation error
    client.update_valuation(&1u64, &0i128);
}
