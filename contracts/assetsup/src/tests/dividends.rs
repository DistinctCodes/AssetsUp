use crate::tests::helpers::*;
use crate::types::AssetType;
use soroban_sdk::String;

#[test]
fn test_enable_revenue_sharing() {
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
    
    // Initially disabled
    let asset = client.get_tokenized_asset(&1u64);
    assert_eq!(asset.revenue_sharing_enabled, false);
    
    // Enable revenue sharing
    client.enable_revenue_sharing(&1u64);
    
    let asset = client.get_tokenized_asset(&1u64);
    assert_eq!(asset.revenue_sharing_enabled, true);
}

#[test]
fn test_disable_revenue_sharing() {
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
    
    client.enable_revenue_sharing(&1u64);
    client.disable_revenue_sharing(&1u64);
    
    let asset = client.get_tokenized_asset(&1u64);
    assert_eq!(asset.revenue_sharing_enabled, false);
}

#[test]
fn test_distribute_dividends_success() {
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
    
    // Enable revenue sharing
    client.enable_revenue_sharing(&1u64);
    
    // Transfer 30% to user2
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);
    
    // Distribute 10000 in dividends
    client.distribute_dividends(&1u64, &10000i128);
    
    // Check unclaimed dividends
    let unclaimed1 = client.get_unclaimed_dividends(&1u64, &user1);
    let unclaimed2 = client.get_unclaimed_dividends(&1u64, &user2);
    
    assert_eq!(unclaimed1, 7000); // 70% of 10000
    assert_eq!(unclaimed2, 3000); // 30% of 10000
}

#[test]
#[should_panic(expected = "Error(Contract, #27)")]
fn test_distribute_dividends_invalid_amount() {
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
    
    client.enable_revenue_sharing(&1u64);
    
    // Should panic with InvalidDividendAmount error
    client.distribute_dividends(&1u64, &0i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #27)")]
fn test_distribute_dividends_not_enabled() {
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
    
    // Revenue sharing not enabled - should panic with InvalidDividendAmount
    client.distribute_dividends(&1u64, &10000i128);
}

#[test]
fn test_claim_dividends_success() {
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
    
    client.enable_revenue_sharing(&1u64);
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);
    client.distribute_dividends(&1u64, &10000i128);
    
    // Claim dividends
    let claimed = client.claim_dividends(&1u64, &user2);
    assert_eq!(claimed, 3000);
    
    // After claiming, unclaimed should be 0
    let unclaimed = client.get_unclaimed_dividends(&1u64, &user2);
    assert_eq!(unclaimed, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #26)")]
fn test_claim_dividends_none_to_claim() {
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
    
    // Should panic with NoDividendsToClaim error
    client.claim_dividends(&1u64, &user1);
}

#[test]
fn test_multiple_dividend_distributions() {
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
    
    client.enable_revenue_sharing(&1u64);
    client.transfer_tokens(&1u64, &user1, &user2, &500000i128);
    
    // First distribution
    client.distribute_dividends(&1u64, &10000i128);
    
    // Second distribution
    client.distribute_dividends(&1u64, &5000i128);
    
    // Total unclaimed should be sum of both distributions
    let unclaimed1 = client.get_unclaimed_dividends(&1u64, &user1);
    let unclaimed2 = client.get_unclaimed_dividends(&1u64, &user2);
    
    assert_eq!(unclaimed1, 7500); // 50% of 15000
    assert_eq!(unclaimed2, 7500); // 50% of 15000
}
