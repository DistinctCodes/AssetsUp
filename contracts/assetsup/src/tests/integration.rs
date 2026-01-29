#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::tokenization;
use crate::types::AssetType;
use crate::voting;
use crate::detokenization;
use crate::dividends;
use crate::transfer_restrictions;

/// Integration test: Full tokenization workflow
#[test]
fn test_full_tokenization_workflow() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let holder3 = Address::random(&env);

    let asset_id = 5000u64;

    // Step 1: Tokenize asset
    let tokenized = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "INTEGRATION"),
        BigInt::from_i128(&env, 1000),
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Integration Test"),
            description: String::from_str(&env, "Full workflow test"),
            asset_type: AssetType::Physical,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: soroban_sdk::Vec::new(&env),
        },
    )
    .unwrap();

    assert_eq!(tokenized.total_supply, BigInt::from_i128(&env, 1000));

    // Step 2: Transfer tokens to other holders
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 400))
        .unwrap();
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), BigInt::from_i128(&env, 200))
        .unwrap();

    // Verify balances
    let tokenizer_balance = tokenization::get_token_balance(&env, asset_id, tokenizer.clone()).unwrap();
    let holder2_balance = tokenization::get_token_balance(&env, asset_id, holder2.clone()).unwrap();
    let holder3_balance = tokenization::get_token_balance(&env, asset_id, holder3.clone()).unwrap();

    assert_eq!(tokenizer_balance, BigInt::from_i128(&env, 400)); // 1000 - 400 - 200
    assert_eq!(holder2_balance, BigInt::from_i128(&env, 400));
    assert_eq!(holder3_balance, BigInt::from_i128(&env, 200));

    // Step 3: Calculate ownership percentages
    let tokenizer_pct = tokenization::calculate_ownership_percentage(&env, asset_id, tokenizer.clone()).unwrap();
    let holder2_pct = tokenization::calculate_ownership_percentage(&env, asset_id, holder2.clone()).unwrap();
    let holder3_pct = tokenization::calculate_ownership_percentage(&env, asset_id, holder3.clone()).unwrap();

    // Percentages in basis points: 40% = 4000, 40% = 4000, 20% = 2000
    assert_eq!(tokenizer_pct, BigInt::from_i128(&env, 4000));
    assert_eq!(holder2_pct, BigInt::from_i128(&env, 4000));
    assert_eq!(holder3_pct, BigInt::from_i128(&env, 2000));

    // Step 4: Set transfer restrictions
    let restriction = crate::types::TransferRestriction {
        require_accredited: false,
        geographic_allowed: soroban_sdk::Vec::new(&env),
    };
    transfer_restrictions::set_transfer_restriction(&env, asset_id, restriction).unwrap();

    // Step 5: Enable dividends and distribute
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 1000)).unwrap();

    // Verify dividend distribution
    let tokenizer_div = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
    let holder2_div = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
    let holder3_div = dividends::get_unclaimed_dividends(&env, asset_id, holder3.clone()).unwrap();

    // Should be proportional to ownership
    assert_eq!(tokenizer_div, BigInt::from_i128(&env, 400));
    assert_eq!(holder2_div, BigInt::from_i128(&env, 400));
    assert_eq!(holder3_div, BigInt::from_i128(&env, 200));

    // Step 6: Claim dividends
    let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();
    assert_eq!(claimed, BigInt::from_i128(&env, 400));

    // Step 7: Propose detokenization
    let proposer = Address::random(&env);
    let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

    // Step 8: Vote on detokenization
    voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();
    voting::cast_vote(&env, asset_id, proposal_id, holder2.clone()).unwrap();

    // Step 9: Check vote tally
    let tally = voting::get_vote_tally(&env, asset_id, proposal_id).unwrap();
    // 400 + 400 = 800 (> 500 which is 50%)
    assert_eq!(tally, BigInt::from_i128(&env, 800));

    // Step 10: Check if passed and execute
    let passed = voting::proposal_passed(&env, asset_id, proposal_id).unwrap();
    assert!(passed);

    let execute_result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
    assert!(execute_result.is_ok());
}

/// Test: Multiple dividend distributions
#[test]
fn test_multiple_dividend_distributions() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = 5001u64;

    // Setup
    tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "MULTIDIV"),
        BigInt::from_i128(&env, 1000),
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Multiple Dividends"),
            description: String::from_str(&env, "Test"),
            asset_type: AssetType::Digital,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: soroban_sdk::Vec::new(&env),
        },
    )
    .unwrap();

    // Transfer 500 to holder2
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 500))
        .unwrap();

    // Enable dividends
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();

    // First distribution
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 500)).unwrap();

    // Second distribution
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 500)).unwrap();

    // Should accumulate
    let unclaimed = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
    assert_eq!(unclaimed, BigInt::from_i128(&env, 500)); // 250 + 250

    let unclaimed2 = dividends::get_unclaimed_dividends(&env, asset_id, holder2).unwrap();
    assert_eq!(unclaimed2, BigInt::from_i128(&env, 500)); // 250 + 250
}

/// Test: Token locking and voting
#[test]
fn test_locked_tokens_with_voting() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = 5002u64;

    // Setup
    tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "LOCKV"),
        BigInt::from_i128(&env, 1000),
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Locked Voting"),
            description: String::from_str(&env, "Test"),
            asset_type: AssetType::Digital,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: soroban_sdk::Vec::new(&env),
        },
    )
    .unwrap();

    // Transfer to holder2
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 600))
        .unwrap();

    // Lock holder2's tokens until timestamp 5000
    tokenization::lock_tokens(&env, asset_id, holder2.clone(), 5000).unwrap();

    // Try to transfer (should fail)
    let transfer_result =
        tokenization::transfer_tokens(&env, asset_id, holder2.clone(), tokenizer.clone(), BigInt::from_i128(&env, 100));
    assert!(transfer_result.is_err());

    // But can still vote
    let vote_result = voting::cast_vote(&env, asset_id, 1, holder2.clone());
    assert!(vote_result.is_ok()); // Locked tokens still count for voting

    // Advance time past lock
    env.ledger().with_mut(|li| {
        li.timestamp = 6000;
    });

    // Unlock and try transfer again
    tokenization::unlock_tokens(&env, asset_id, holder2.clone()).unwrap();
    let transfer_result =
        tokenization::transfer_tokens(&env, asset_id, holder2.clone(), tokenizer.clone(), BigInt::from_i128(&env, 100));
    assert!(transfer_result.is_ok());
}
