#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, Env, String};

use crate::detokenization;
use crate::dividends;
use crate::tokenization;
use crate::transfer_restrictions;
use crate::types::AssetType;
use crate::voting;
use crate::AssetUpContract;

/// Integration test: Full tokenization workflow
#[test]
fn test_full_tokenization_workflow() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let holder3 = Address::generate(&env);

    let asset_id = 5000u64;

    env.as_contract(&contract_id, || {
        // Step 1: Tokenize asset
        let tokenized = tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "INTEGRATION"),
            1000,
            2,
            100,
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

        assert_eq!(tokenized.total_supply, 1000_i128);

        // Step 2: Transfer tokens to other holders
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 400)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 200)
            .unwrap();

        // Verify balances
        let tokenizer_balance =
            tokenization::get_token_balance(&env, asset_id, tokenizer.clone()).unwrap();
        let holder2_balance =
            tokenization::get_token_balance(&env, asset_id, holder2.clone()).unwrap();
        let holder3_balance =
            tokenization::get_token_balance(&env, asset_id, holder3.clone()).unwrap();

        assert_eq!(tokenizer_balance, 400_i128); // 1000 - 400 - 200
        assert_eq!(holder2_balance, 400_i128);
        assert_eq!(holder3_balance, 200_i128);

        // Step 3: Calculate ownership percentages
        let tokenizer_pct =
            tokenization::calculate_ownership_percentage(&env, asset_id, tokenizer.clone())
                .unwrap();
        let holder2_pct =
            tokenization::calculate_ownership_percentage(&env, asset_id, holder2.clone()).unwrap();
        let holder3_pct =
            tokenization::calculate_ownership_percentage(&env, asset_id, holder3.clone()).unwrap();

        // Percentages in basis points: 40% = 4000, 40% = 4000, 20% = 2000
        assert_eq!(tokenizer_pct, 4000_i128);
        assert_eq!(holder2_pct, 4000_i128);
        assert_eq!(holder3_pct, 2000_i128);

        // Step 4: Set transfer restrictions
        let restriction = crate::types::TransferRestriction {
            require_accredited: false,
            geographic_allowed: soroban_sdk::Vec::new(&env),
        };
        transfer_restrictions::set_transfer_restriction(&env, asset_id, restriction).unwrap();

        // Step 5: Enable dividends and distribute
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        // Verify dividend distribution
        let tokenizer_div =
            dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let holder2_div =
            dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        let holder3_div =
            dividends::get_unclaimed_dividends(&env, asset_id, holder3.clone()).unwrap();

        // Should be proportional to ownership
        assert_eq!(tokenizer_div, 400_i128);
        assert_eq!(holder2_div, 400_i128);
        assert_eq!(holder3_div, 200_i128);

        // Step 6: Claim dividends
        let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        assert_eq!(claimed, 400_i128);

        // Step 7: Propose detokenization
        let proposer = Address::generate(&env);
        let proposal_id = detokenization::propose_detokenization(&env, asset_id, proposer).unwrap();

        // Step 8: Vote on detokenization
        voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, proposal_id, holder2.clone()).unwrap();

        // Step 9: Check vote tally
        let tally = voting::get_vote_tally(&env, asset_id, proposal_id).unwrap();
        // 400 + 400 = 800 (> 500 which is 50%)
        assert_eq!(tally, 800_i128);

        // Step 10: Check if passed and execute
        let passed = voting::proposal_passed(&env, asset_id, proposal_id).unwrap();
        assert!(passed);

        let execute_result = detokenization::execute_detokenization(&env, asset_id, proposal_id);
        assert!(execute_result.is_ok());
    });
}

/// Test: Multiple dividend distributions
#[test]
fn test_multiple_dividend_distributions() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 5001u64;

    let (unclaimed, unclaimed2) = env.as_contract(&contract_id, || {
        // Setup
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "MULTIDIV"),
            1000,
            2,
            100,
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
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 500)
            .unwrap();

        // Enable dividends
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // First distribution
        dividends::distribute_dividends(&env, asset_id, 500).unwrap();
        // Second distribution
        dividends::distribute_dividends(&env, asset_id, 500).unwrap();

        // Should accumulate
        let u1 = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let u2 = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        (u1, u2)
    });

    assert_eq!(unclaimed, 500_i128); // 250 + 250
    assert_eq!(unclaimed2, 500_i128); // 250 + 250
}

/// Test: Token locking and voting
#[test]
fn test_locked_tokens_with_voting() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 5002u64;

    let (transfer_blocked, vote_ok) = env.as_contract(&contract_id, || {
        // Setup
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "LOCKV"),
            1000,
            2,
            100,
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
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 600)
            .unwrap();

        // Lock holder2's tokens until timestamp 5000 (tokenizer is the caller/authorizer)
        tokenization::lock_tokens(&env, asset_id, holder2.clone(), 5000, tokenizer.clone())
            .unwrap();

        // Try to transfer (should fail because locked)
        let transfer_blocked =
            tokenization::transfer_tokens(&env, asset_id, holder2.clone(), tokenizer.clone(), 100)
                .is_err();

        // But can still vote (locked tokens still count for voting)
        let vote_ok = voting::cast_vote(&env, asset_id, 1, holder2.clone()).is_ok();

        (transfer_blocked, vote_ok)
    });

    assert!(transfer_blocked);
    assert!(vote_ok); // Locked tokens still count for voting

    // Advance time past lock
    env.ledger().with_mut(|li| {
        li.timestamp = 6000;
    });

    env.as_contract(&contract_id, || {
        // Unlock and try transfer again
        tokenization::unlock_tokens(&env, asset_id, holder2.clone()).unwrap();
        let transfer_result =
            tokenization::transfer_tokens(&env, asset_id, holder2.clone(), tokenizer.clone(), 100);
        assert!(transfer_result.is_ok());
    });
}
