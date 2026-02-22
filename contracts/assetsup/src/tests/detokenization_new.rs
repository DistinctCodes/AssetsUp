#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

use crate::detokenization;
use crate::tokenization;
use crate::types::AssetType;
use crate::voting;
use crate::AssetUpContract;

fn setup_tokenized_asset(env: &Env, asset_id: u64, tokenizer: &Address) {
    tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "DETON"),
        1000,
        2,
        100,
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
    )
    .unwrap();
}

#[test]
fn test_propose_detokenization() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let proposal_some = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        let _proposal_id =
            detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();
        // Verify proposal exists
        detokenization::get_detokenization_proposal(&env, asset_id)
            .ok()
            .is_some()
    });

    assert!(proposal_some);
}

#[test]
fn test_duplicate_proposal_prevention() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let second_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // Propose once
        detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();
        // Try to propose again
        detokenization::propose_detokenization(&env, asset_id, proposer.clone()).is_err()
    });

    assert!(second_err);
}

#[test]
fn test_detokenization_active_check() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let (before_active, after_active) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Should not be active initially
        let before = detokenization::is_detokenization_active(&env, asset_id).unwrap();

        // Propose
        detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

        // Should be active now
        let after = detokenization::is_detokenization_active(&env, asset_id).unwrap();
        (before, after)
    });

    assert!(!before_active);
    assert!(after_active);
}

#[test]
fn test_execute_detokenization_without_majority() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let execute_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // Propose
        let proposal_id =
            detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();
        // Try to execute without votes
        detokenization::execute_detokenization(&env, asset_id, proposal_id).is_err()
    });

    assert!(execute_err); // Should fail - no majority
}

#[test]
fn test_execute_detokenization_with_majority() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let (execute_ok, is_active) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Propose
        let proposal_id =
            detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

        // Tokenizer has 1000 tokens (100%), cast vote
        voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();

        // Now execute - should succeed
        let ok = detokenization::execute_detokenization(&env, asset_id, proposal_id).is_ok();

        // Should no longer be active
        let active = detokenization::is_detokenization_active(&env, asset_id).unwrap();
        (ok, active)
    });

    assert!(execute_ok);
    assert!(!is_active);
}

#[test]
fn test_detokenization_majority_threshold() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let (first_execute_err, second_execute_ok) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer 400 to holder2 (40% < 50% threshold)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 400)
            .unwrap();

        // Propose
        let proposal_id =
            detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

        // Only holder2 votes (40%)
        voting::cast_vote(&env, asset_id, proposal_id, holder2.clone()).unwrap();

        // Should fail execution (only 40%)
        let first_err =
            detokenization::execute_detokenization(&env, asset_id, proposal_id).is_err();

        // Now tokenizer also votes (100% total)
        voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();

        // Should succeed
        let second_ok = detokenization::execute_detokenization(&env, asset_id, proposal_id).is_ok();
        (first_err, second_ok)
    });

    assert!(first_execute_err);
    assert!(second_execute_ok);
}

#[test]
fn test_token_elimination_on_execution() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let (before_exists, after_exists, balance_cleared, holders_cleared) =
        env.as_contract(&contract_id, || {
            setup_tokenized_asset(&env, asset_id, &tokenizer);

            // Transfer some tokens to create multiple holders
            tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
                .unwrap();

            // Verify asset exists before detokenization
            let before_exists = tokenization::get_tokenized_asset(&env, asset_id).is_ok();

            // Propose detokenization
            let proposal_id =
                detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();

            // Both holders vote (100%)
            voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();
            voting::cast_vote(&env, asset_id, proposal_id, holder2.clone()).unwrap();

            // Execute detokenization
            detokenization::execute_detokenization(&env, asset_id, proposal_id).unwrap();

            // Verify tokens are removed from circulation
            let after_exists = tokenization::get_tokenized_asset(&env, asset_id).is_ok();

            // Verify balances are cleared
            let balance1 = tokenization::get_token_balance(&env, asset_id, tokenizer.clone());
            let balance2 = tokenization::get_token_balance(&env, asset_id, holder2.clone());
            let balance_cleared = balance1.unwrap_or(0) == 0 && balance2.unwrap_or(0) == 0;

            // Verify holders list is cleared
            let holders_result = tokenization::get_token_holders(&env, asset_id);
            let holders_cleared = holders_result.is_err();

            (before_exists, after_exists, balance_cleared, holders_cleared)
        });

    // Assert asset existed before
    assert!(before_exists);
    // Assert asset no longer exists after detokenization
    assert!(!after_exists);
    // Assert balances are cleared
    assert!(balance_cleared);
    // Assert holders list is cleared
    assert!(holders_cleared);
}

#[test]
fn test_cannot_propose_after_execution() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let proposer = Address::generate(&env);
    let asset_id = 1000u64;

    let second_proposal_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Propose and execute detokenization
        let proposal_id =
            detokenization::propose_detokenization(&env, asset_id, proposer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, proposal_id, tokenizer.clone()).unwrap();
        detokenization::execute_detokenization(&env, asset_id, proposal_id).unwrap();

        // Try to propose again after execution - should fail because asset is not tokenized
        detokenization::propose_detokenization(&env, asset_id, proposer.clone()).is_err()
    });

    assert!(second_proposal_err);
}
