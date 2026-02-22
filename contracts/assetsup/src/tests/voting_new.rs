#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

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

// =====================
// cast_vote tests
// =====================

#[test]
fn test_cast_vote() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
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
    let contract_id = env.register(AssetUpContract, ());
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
fn test_double_vote_returns_already_voted_error() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::AlreadyVoted);
}

#[test]
fn test_insufficient_voting_power() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
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

#[test]
fn test_insufficient_voting_power_returns_correct_error() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let new_holder = Address::generate(&env);
    let asset_id = 801u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), new_holder.clone(), 50)
            .unwrap();
        voting::cast_vote(&env, asset_id, 1, new_holder.clone()).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::InsufficientVotingPower);
}

#[test]
fn test_cast_vote_on_asset_not_tokenized() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let voter = Address::generate(&env);
    let asset_id = 999u64;

    let err = env.as_contract(&contract_id, || {
        voting::cast_vote(&env, asset_id, 1, voter.clone()).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::AssetNotTokenized);
}

#[test]
fn test_cast_vote_holder_not_found() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let non_holder = Address::generate(&env);
    let asset_id = 802u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::cast_vote(&env, asset_id, 1, non_holder.clone()).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::HolderNotFound);
}

#[test]
fn test_vote_weight_equals_token_balance() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder = Address::generate(&env);
    let asset_id = 803u64;

    let (tally_before, tally_after) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer 400 tokens to holder
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder.clone(), 400)
            .unwrap();

        let before = voting::get_vote_tally(&env, asset_id, 1).unwrap();
        voting::cast_vote(&env, asset_id, 1, holder.clone()).unwrap();
        let after = voting::get_vote_tally(&env, asset_id, 1).unwrap();
        (before, after)
    });

    // Vote weight must equal holder's balance (400)
    assert_eq!(tally_before, 0);
    assert_eq!(tally_after, 400);
}

#[test]
fn test_vote_at_exact_threshold() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder = Address::generate(&env);
    let asset_id = 804u64;

    let cast_ok = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Transfer exactly 100 tokens (the minimum threshold)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder.clone(), 100)
            .unwrap();

        voting::cast_vote(&env, asset_id, 1, holder.clone()).is_ok()
    });

    assert!(cast_ok);
}

#[test]
fn test_same_voter_different_proposals() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 805u64;

    let (vote1_ok, vote2_ok) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        let v1 = voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).is_ok();
        let v2 = voting::cast_vote(&env, asset_id, 2, tokenizer.clone()).is_ok();
        (v1, v2)
    });

    // A voter can vote on different proposals independently
    assert!(vote1_ok);
    assert!(vote2_ok);
}

#[test]
fn test_different_voters_same_proposal() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let holder3 = Address::generate(&env);
    let asset_id = 806u64;

    let (v1, v2, v3) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 200)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 200)
            .unwrap();

        let v1 = voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).is_ok();
        let v2 = voting::cast_vote(&env, asset_id, 1, holder2.clone()).is_ok();
        let v3 = voting::cast_vote(&env, asset_id, 1, holder3.clone()).is_ok();
        (v1, v2, v3)
    });

    assert!(v1);
    assert!(v2);
    assert!(v3);
}

// =====================
// get_vote_tally tests
// =====================

#[test]
fn test_vote_tally() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
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
fn test_vote_tally_starts_at_zero() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 807u64;

    let tally = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::get_vote_tally(&env, asset_id, 1).unwrap()
    });

    assert_eq!(tally, 0_i128);
}

#[test]
fn test_vote_tally_on_non_tokenized_asset() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let asset_id = 998u64;

    let err = env.as_contract(&contract_id, || {
        voting::get_vote_tally(&env, asset_id, 1).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::AssetNotTokenized);
}

#[test]
fn test_vote_tally_accumulates_multiple_voters() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let holder3 = Address::generate(&env);
    let asset_id = 808u64;

    let tally = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // tokenizer has 1000, give 300 each to holders (tokenizer retains 400)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 300)
            .unwrap();

        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();
        voting::cast_vote(&env, asset_id, 1, holder3.clone()).unwrap();

        voting::get_vote_tally(&env, asset_id, 1).unwrap()
    });

    // 400 + 300 + 300 = 1000
    assert_eq!(tally, 1000_i128);
}

#[test]
fn test_vote_tally_isolated_per_proposal() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 809u64;

    let (tally1, tally2) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();

        // tokenizer votes on proposal 1, holder2 votes on proposal 2
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::cast_vote(&env, asset_id, 2, holder2.clone()).unwrap();

        let t1 = voting::get_vote_tally(&env, asset_id, 1).unwrap();
        let t2 = voting::get_vote_tally(&env, asset_id, 2).unwrap();
        (t1, t2)
    });

    assert_eq!(tally1, 700); // tokenizer's balance after transfer
    assert_eq!(tally2, 300); // holder2's balance
}

// =====================
// has_voted tests
// =====================

#[test]
fn test_has_voted_returns_false_before_voting() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 810u64;

    let voted = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::has_voted(&env, asset_id, 1, tokenizer.clone()).unwrap()
    });

    assert!(!voted);
}

#[test]
fn test_has_voted_returns_true_after_voting() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 811u64;

    let voted = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::has_voted(&env, asset_id, 1, tokenizer.clone()).unwrap()
    });

    assert!(voted);
}

#[test]
fn test_has_voted_on_non_tokenized_asset() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let voter = Address::generate(&env);
    let asset_id = 997u64;

    let err = env.as_contract(&contract_id, || {
        voting::has_voted(&env, asset_id, 1, voter.clone()).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::AssetNotTokenized);
}

#[test]
fn test_has_voted_independent_per_proposal() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 812u64;

    let (voted_p1, voted_p2) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();

        let v1 = voting::has_voted(&env, asset_id, 1, tokenizer.clone()).unwrap();
        let v2 = voting::has_voted(&env, asset_id, 2, tokenizer.clone()).unwrap();
        (v1, v2)
    });

    assert!(voted_p1);
    assert!(!voted_p2);
}

// =====================
// proposal_passed tests
// =====================

#[test]
fn test_proposal_passed() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
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
    let contract_id = env.register(AssetUpContract, ());
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
fn test_proposal_passed_no_votes() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 813u64;

    let passed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::proposal_passed(&env, asset_id, 1).unwrap()
    });

    assert!(!passed);
}

#[test]
fn test_proposal_passed_on_non_tokenized_asset() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let asset_id = 996u64;

    let err = env.as_contract(&contract_id, || {
        voting::proposal_passed(&env, asset_id, 1).unwrap_err()
    });

    assert_eq!(err, crate::error::Error::AssetNotTokenized);
}

#[test]
fn test_proposal_passed_respects_min_voting_threshold() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 814u64;

    // Tokenize with total_supply=1000, detokenize_threshold defaults to 50%
    // All 1000 tokens voting should definitely pass
    let passed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        voting::cast_vote(&env, asset_id, 1, tokenizer.clone()).unwrap();
        voting::proposal_passed(&env, asset_id, 1).unwrap()
    });

    // Tokenizer has all 1000 tokens (100% of supply) — must pass threshold
    assert!(passed);
}

#[test]
fn test_proposal_passed_multiple_voters_crossing_threshold() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let holder3 = Address::generate(&env);
    let asset_id = 815u64;

    let (before_threshold, after_threshold) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // Distribute: tokenizer=400, holder2=300, holder3=300
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 300)
            .unwrap();

        // Only holder2 votes (300/1000 = 30%) — should not pass
        voting::cast_vote(&env, asset_id, 1, holder2.clone()).unwrap();
        let before = voting::proposal_passed(&env, asset_id, 1).unwrap();

        // holder3 also votes (600/1000 = 60%) — should now pass
        voting::cast_vote(&env, asset_id, 1, holder3.clone()).unwrap();
        let after = voting::proposal_passed(&env, asset_id, 1).unwrap();

        (before, after)
    });

    assert!(!before_threshold);
    assert!(after_threshold);
}
