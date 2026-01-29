#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::tokenization;
use crate::types::AssetType;
use crate::dividends;

fn setup_tokenized_asset(env: &Env, tokenizer: &Address) -> u64 {
    let asset_id = 800u64;
    let _ = tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "DIV"),
        BigInt::from_i128(env, 1000),
        2,
        BigInt::from_i128(env, 100),
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
    );
    asset_id
}

#[test]
fn test_distribute_dividends_no_revenue_sharing() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Try to distribute without enabling revenue sharing
    let result = dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 1000));
    assert!(result.is_err());
}

#[test]
fn test_distribute_dividends() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Enable revenue sharing
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();

    // Transfer tokens to holder2 (500 out of 1000)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 500))
        .unwrap();

    // Distribute 1000 tokens as dividend
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 1000)).unwrap();

    // Tokenizer should have 500 unclaimed (50% of 1000)
    let tokenizer_dividend = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
    assert_eq!(tokenizer_dividend, BigInt::from_i128(&env, 500));

    // Holder2 should have 500 unclaimed (50% of 1000)
    let holder2_dividend = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
    assert_eq!(holder2_dividend, BigInt::from_i128(&env, 500));
}

#[test]
fn test_claim_dividends() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Enable revenue sharing and distribute
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 500)).unwrap();

    // Claim dividends
    let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();

    // Should have claimed full 500
    assert_eq!(claimed, BigInt::from_i128(&env, 500));

    // Should have 0 unclaimed now
    let remaining = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer).unwrap();
    assert_eq!(remaining, BigInt::from_i128(&env, 0));
}

#[test]
fn test_claim_dividends_insufficient() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Enable revenue sharing but don't distribute
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();

    // Try to claim (should have 0)
    let result = dividends::claim_dividends(&env, asset_id, tokenizer);
    assert!(result.is_err());
}

#[test]
fn test_proportional_dividend_distribution() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let holder2 = Address::random(&env);
    let holder3 = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Enable revenue sharing
    dividends::enable_revenue_sharing(&env, asset_id).unwrap();

    // Transfer: tokenizer 400, holder2 300, holder3 300 (total 1000)
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), BigInt::from_i128(&env, 300))
        .unwrap();
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), BigInt::from_i128(&env, 300))
        .unwrap();

    // Distribute 1000 as dividend
    dividends::distribute_dividends(&env, asset_id, BigInt::from_i128(&env, 1000)).unwrap();

    // Verify proportional distribution
    let t_div = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer).unwrap();
    let h2_div = dividends::get_unclaimed_dividends(&env, asset_id, holder2).unwrap();
    let h3_div = dividends::get_unclaimed_dividends(&env, asset_id, holder3).unwrap();

    // Tokenizer: 400/1000 * 1000 = 400
    // Holder2: 300/1000 * 1000 = 300
    // Holder3: 300/1000 * 1000 = 300
    assert_eq!(t_div, BigInt::from_i128(&env, 400));
    assert_eq!(h2_div, BigInt::from_i128(&env, 300));
    assert_eq!(h3_div, BigInt::from_i128(&env, 300));
}
