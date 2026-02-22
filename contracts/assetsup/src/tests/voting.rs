use crate::tests::helpers::*;
use crate::types::AssetType;
use soroban_sdk::String;

#[test]
fn test_cast_vote_success() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    env.mock_all_auths();
    
    // Tokenize asset
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
    
    // Cast vote
    client.cast_vote(&1u64, &1u64, &user1);
    
    // Verify vote was recorded
    assert_eq!(client.has_voted(&1u64, &1u64, &user1), true);
    
    // Verify vote tally
    let tally = client.get_vote_tally(&1u64, &1u64);
    assert_eq!(tally, 1000000); // Full balance
}

#[test]
#[should_panic(expected = "Error(Contract, #22)")]
fn test_cast_vote_already_voted() {
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
    
    client.cast_vote(&1u64, &1u64, &user1);
    
    // Try to vote again - should panic with AlreadyVoted
    client.cast_vote(&1u64, &1u64, &user1);
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")]
fn test_cast_vote_insufficient_voting_power() {
    let env = create_env();
    let (admin, user1, user2, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    env.mock_all_auths();
    
    // Tokenize with high voting threshold
    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "TST"),
        &1000000i128,
        &6u32,
        &500000i128, // 50% threshold
        &user1,
        &String::from_str(&env, "Test Token"),
        &String::from_str(&env, "A test tokenized asset"),
        &AssetType::Physical,
    );
    
    // Transfer small amount to user2
    client.transfer_tokens(&1u64, &user1, &user2, &10000i128);
    
    // user2 doesn't have enough tokens - should panic with InsufficientVotingPower
    client.cast_vote(&1u64, &1u64, &user2);
}

#[test]
fn test_proposal_passed() {
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
    
    // Transfer 60% to user2
    client.transfer_tokens(&1u64, &user1, &user2, &600000i128);
    
    // user2 votes (60% of supply)
    client.cast_vote(&1u64, &1u64, &user2);
    
    // Proposal should pass (>50% threshold)
    assert_eq!(client.proposal_passed(&1u64, &1u64), true);
}

#[test]
fn test_proposal_not_passed() {
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
    
    // Transfer 40% to user2
    client.transfer_tokens(&1u64, &user1, &user2, &400000i128);
    
    // user2 votes (40% of supply)
    client.cast_vote(&1u64, &1u64, &user2);
    
    // Proposal should not pass (<50% threshold)
    assert_eq!(client.proposal_passed(&1u64, &1u64), false);
}

#[test]
fn test_multiple_voters() {
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
    
    // Distribute tokens
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);
    client.transfer_tokens(&1u64, &user1, &user3, &200000i128);
    
    // Multiple users vote
    client.cast_vote(&1u64, &1u64, &user1); // 500000
    client.cast_vote(&1u64, &1u64, &user2); // 300000
    
    // Total tally should be 800000
    let tally = client.get_vote_tally(&1u64, &1u64);
    assert_eq!(tally, 800000);
    
    // Proposal should pass (80% > 50%)
    assert_eq!(client.proposal_passed(&1u64, &1u64), true);
}
