#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::tokenization;
use crate::types::AssetType;
use crate::voting;

fn setup_tokenized_asset(env: &Env, tokenizer: &Address) -> u64 {
    let asset_id = 700u64;
    let _ = tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "VOTE"),
        BigInt::from_i128(env, 1000),
        2,
        BigInt::from_i128(env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(env, "Voting Test"),
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
fn test_cast_vote() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Cast vote
    let result = voting::cast_vote(&env, asset_id, 1, tokenizer.clone());
    assert!(result.is_ok());

    // Verify vote was recorded
    let has_voted = voting::has_voted(&env, asset_id, 1, tokenizer).unwrap();
    assert!(has_voted);
}

#[test]
fn test_double_vote_prevention() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Cast first vote
    voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();

    // Try to vote again
    let result = voting::cast_vote(&env, asset_id, 1, tokenizer);
    assert!(result.is_err());
}

#[test]
fn test_vote_tally() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Transfer some tokens to second holder
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 300))
        .unwrap();

    // Cast votes
    voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
    voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();

    // Check tally
    let tally = voting::get_vote_tally(&env, asset_id, 1).unwrap();

    // Tokenizer has 700, holder2 has 300 = 1000 total
    assert_eq!(tally, BigInt::from_i128(&env, 1000));
}

#[test]
fn test_proposal_passed() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Transfer 600 tokens to holder2 (>50% of 1000)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 600))
        .unwrap();

    // Holder2 votes (600 votes)
    voting::cast_vote(&env, asset_id, 1, holder2).unwrap();

    // Check if proposal passed
    let passed = voting::proposal_passed(&env, asset_id, 1).unwrap();
    assert!(passed);
}

#[test]
fn test_proposal_failed() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Transfer 400 tokens to holder2 (<50% of 1000)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 400))
        .unwrap();

    // Both vote (600 + 400 = 1000, but holder2 has only 40%)
    voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();

    // Check if proposal failed (single voter with <50%)
    let passed = voting::proposal_passed(&env, asset_id, 1).unwrap();
    // With only 400/1000 votes, should not pass 50% threshold
    assert!(!passed);
}

#[test]
fn test_insufficient_voting_power() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let new_holder = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Transfer tokens down to below voting threshold (100)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), new_holder.clone(), BigInt::from_i128(&env, 950))
        .unwrap();

    // New holder has 50 tokens (below 100 threshold), should not be able to vote
    let result = voting::cast_vote(&env, asset_id, 1, new_holder);
    assert!(result.is_err());
}
