use crate::tests::helpers::*;
use crate::types::{AssetType, DetokenizationProposal};
use soroban_sdk::String;

#[test]
fn test_propose_detokenization_success() {
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

    // Propose detokenization
    let proposal_id = client.propose_detokenization(&1u64, &user1);

    assert_eq!(proposal_id, 1);

    // Verify proposal is active
    assert!(client.is_detokenization_active(&1u64));
}

#[test]
#[should_panic(expected = "Error(Contract, #29)")]
fn test_propose_detokenization_already_proposed() {
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

    client.propose_detokenization(&1u64, &user1);

    // Try to propose again - should panic with DetokenizationAlreadyProposed
    client.propose_detokenization(&1u64, &user1);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_propose_detokenization_not_tokenized() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Should panic with AssetNotTokenized error
    client.propose_detokenization(&999u64, &user1);
}

#[test]
fn test_execute_detokenization_success() {
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

    // Propose detokenization
    let proposal_id = client.propose_detokenization(&1u64, &user1);

    // Vote with majority
    client.cast_vote(&1u64, &proposal_id, &user2);

    // Execute detokenization
    client.execute_detokenization(&1u64, &proposal_id);

    // Verify asset is no longer tokenized
    assert!(!client.is_detokenization_active(&1u64));
}

#[test]
#[should_panic(expected = "Error(Contract, #28)")]
fn test_execute_detokenization_not_approved() {
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

    // Transfer 30% to user2 (not enough for majority)
    client.transfer_tokens(&1u64, &user1, &user2, &300000i128);

    // Propose detokenization
    let proposal_id = client.propose_detokenization(&1u64, &user1);

    // Vote with minority
    client.cast_vote(&1u64, &proposal_id, &user2);

    // Should panic with DetokenizationNotApproved error
    client.execute_detokenization(&1u64, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #24)")]
fn test_execute_detokenization_no_proposal() {
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

    // Should panic with InvalidProposal error
    client.execute_detokenization(&1u64, &1u64);
}

#[test]
fn test_get_detokenization_proposal() {
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

    let proposal_id = client.propose_detokenization(&1u64, &user1);

    let proposal = client.get_detokenization_proposal(&1u64);

    match proposal {
        DetokenizationProposal::Active(active) => {
            assert_eq!(active.proposal_id, proposal_id);
            assert_eq!(active.proposer, user1);
        }
        _ => panic!("Expected Active proposal"),
    }
}

#[test]
fn test_detokenization_clears_all_data() {
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

    // Set up some data
    client.transfer_tokens(&1u64, &user1, &user2, &600000i128);
    client.add_to_whitelist(&1u64, &user2);
    client.enable_revenue_sharing(&1u64);

    // Propose and execute detokenization
    let proposal_id = client.propose_detokenization(&1u64, &user1);
    client.cast_vote(&1u64, &proposal_id, &user2);
    client.execute_detokenization(&1u64, &proposal_id);

    // Verify whitelist is cleared
    let whitelist = client.get_whitelist(&1u64);
    assert_eq!(whitelist.len(), 0);
}
