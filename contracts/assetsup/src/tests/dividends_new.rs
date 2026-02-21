#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

use crate::dividends;
use crate::tokenization;
use crate::types::AssetType;
use crate::AssetUpContract;

fn setup_tokenized_asset(env: &Env, asset_id: u64, tokenizer: &Address) {
    tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "DIV"),
        1000,
        2,
        100,
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(env, "Dividend Test"),
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
fn test_distribute_dividends_no_revenue_sharing() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let result_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        // Try to distribute without enabling revenue sharing
        dividends::distribute_dividends(&env, asset_id, 1000).is_err()
    });

    assert!(result_err);
}

#[test]
fn test_distribute_dividends() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 800u64;

    let (tokenizer_dividend, holder2_dividend) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Enable revenue sharing
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // Transfer tokens to holder2 (500 out of 1000)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 500)
            .unwrap();

        // Distribute 1000 tokens as dividend
        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        let t_div = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let h2_div = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        (t_div, h2_div)
    });

    // Tokenizer should have 500 unclaimed (50% of 1000)
    assert_eq!(tokenizer_dividend, 500_i128);
    // Holder2 should have 500 unclaimed (50% of 1000)
    assert_eq!(holder2_dividend, 500_i128);
}

#[test]
fn test_claim_dividends() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let (claimed, remaining) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Enable revenue sharing and distribute
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 500).unwrap();

        // Claim dividends
        let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();

        // Check remaining
        let remaining =
            dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        (claimed, remaining)
    });

    // Should have claimed full 500
    assert_eq!(claimed, 500_i128);
    // Should have 0 unclaimed now
    assert_eq!(remaining, 0_i128);
}

#[test]
fn test_claim_dividends_insufficient() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let result_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Enable revenue sharing but don't distribute
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // Try to claim (should have 0)
        dividends::claim_dividends(&env, asset_id, tokenizer.clone()).is_err()
    });

    assert!(result_err);
}

#[test]
fn test_proportional_dividend_distribution() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let holder3 = Address::generate(&env);
    let asset_id = 800u64;

    let (t_div, h2_div, h3_div) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Enable revenue sharing
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // Transfer: tokenizer 400, holder2 300, holder3 300 (total 1000)
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 300)
            .unwrap();

        // Distribute 1000 as dividend
        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        let t = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let h2 = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        let h3 = dividends::get_unclaimed_dividends(&env, asset_id, holder3.clone()).unwrap();
        (t, h2, h3)
    });

    // Tokenizer: 400/1000 * 1000 = 400
    // Holder2: 300/1000 * 1000 = 300
    // Holder3: 300/1000 * 1000 = 300
    assert_eq!(t_div, 400_i128);
    assert_eq!(h2_div, 300_i128);
    assert_eq!(h3_div, 300_i128);
}
