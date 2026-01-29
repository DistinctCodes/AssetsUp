#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::tokenization;
use crate::types::AssetType;
use crate::voting;
use crate::detokenization;

fn setup_tokenized_asset(env: &Env, tokenizer: &Address) -> u64 {
    let asset_id = 1000u64;
    let _ = tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "DETON"),
        BigInt::from_i128(env, 1000),
        2,
        BigInt::from_i128(env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(env, "Detokenization Test"),
            description: String::from_str(env, "Test"),
            asset_type: AssetType::Digital,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: soroban_sdk::Vec::new(env),
        },
    );
    asset_id
}

#[test]
fn test_propose_detokenization() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

    // Verify proposal exists
    let proposal = detokenization::get_detokenization_proposal(&env, asset_id).ok();
    assert!(proposal.is_some());
}

#[test]
fn test_duplicate_proposal_prevention() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Propose once
    detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

    // Try to propose again
    let result = detokenization::propose_detokenization(&env, asset_id, proposer);
    assert!(result.is_err());
}

#[test]
fn test_detokenization_active_check() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Should not be active initially
    let is_active = detokenization::is_detokenization_active(&env, asset_id).unwrap();
    assert!(!is_active);

    // Propose
    detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

    // Should be active now
    let is_active = detokenization::is_detokenization_active(&env, asset_id).unwrap();
    assert!(is_active);
}

#[test]
fn test_execute_detokenization_without_majority() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Propose
    let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

    // Try to execute without votes
    let result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
    assert!(result.is_err()); // Should fail - no majority
}

#[test]
fn test_execute_detokenization_with_majority() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Propose
    let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

    // Get >50% votes
    // Tokenizer has 1000 tokens (100%), cast vote
    voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();

    // Now execute - should succeed
    let result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
    assert!(result.is_ok());

    // Should no longer be active
    let is_active = detokenization::is_detokenization_active(&env, asset_id).unwrap();
    assert!(!is_active);
}

#[test]
fn test_detokenization_majority_threshold() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let proposer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Transfer 400 to holder2 (40% < 50% threshold)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 400))
        .unwrap();

    // Propose
    let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

    // Only holder2 votes (40%)
    voting::cast_vote(&env, asset_id, proposal_id, holder2).unwrap();

    // Should fail execution
    let result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
    assert!(result.is_err());

    // Now tokenizer also votes (100% total)
    voting::cast_vote(&env, asset_id, proposal_id, tokenizer).unwrap();

    // Should succeed
    let result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
    assert!(result.is_ok());
}
