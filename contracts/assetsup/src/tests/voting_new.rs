#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, Env, String};
use soroban_sdk::testutils::Address as _;

use crate::tokenization;
use crate::types::AssetType;
use crate::voting;
use crate::AssetUpContract;

fn setup_tokenized_asset(env: &Env, asset_id: u64, tokenizer: &Address) {
    tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "VOTE"),
        1000,
        2,
        100,
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
    )
    .unwrap();
}

#[test]
fn test_cast_vote() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = 700u64;

    let (cast_ok, has_voted) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        let result = voting::cast_vote(&env, asset_id, 1, tokenizer.clone());
        let voted = voting::has_voted(&env, asset_id, 1, tokenizer.clone()).unwrap();
        (result.is_ok(), voted)
    });

    assert!(cast_ok);
    assert!(has_voted);
}

#[test]
fn test_double_vote_prevention() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = 700u64;

    let second_vote_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // Cast first vote
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        // Try to vote again
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).is_err()
    });

    assert!(second_vote_err);
}

#[test]
fn test_vote_tally() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 700u64;

    let tally = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer some tokens to second holder
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();

        // Cast votes
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();

        // Check tally
        voting::get_vote_tally(&env, asset_id, 1).unwrap()
    });

    // Tokenizer has 700, holder2 has 300 = 1000 total
    assert_eq!(tally, 1000_i128);
}

#[test]
fn test_proposal_passed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 700u64;

    let passed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer 600 tokens to holder2 (>50% of 1000)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 600)
            .unwrap();

        // Holder2 votes (600 votes)
        voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();

        // Check if proposal passed
        voting::proposal_passed(&env, asset_id, 1).unwrap()
    });

    assert!(passed);
}

#[test]
fn test_proposal_failed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 700u64;

    let passed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer 400 tokens to holder2 (<50% of 1000)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 400)
            .unwrap();

        // Holder2 votes with 400 tokens (40% — below threshold)
        voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();

        // Check if proposal failed
        voting::proposal_passed(&env, asset_id, 1).unwrap()
    });

    // With only 400/1000 votes, should not pass 50% threshold
    assert!(!passed);
}

#[test]
fn test_insufficient_voting_power() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let new_holder = Address::generate(&env);
    let asset_id = 700u64;

    let vote_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer 50 tokens to new_holder (below 100 threshold)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), new_holder.clone(), 50)
            .unwrap();

        // new_holder has 50 tokens (below 100 threshold), should not be able to vote
        voting::cast_vote(&env, asset_id, 1, new_holder.clone()).is_err()
    });

    assert!(vote_err);
}
