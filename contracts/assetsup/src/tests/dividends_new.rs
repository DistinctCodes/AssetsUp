#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

use crate::dividends;
use crate::error::Error;
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

// ─── distribute_dividends ────────────────────────────────────────────────────

#[test]
fn test_distribute_dividends_no_revenue_sharing() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let result_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::distribute_dividends(&env, asset_id, 1000).is_err()
    });

    assert!(result_err);
}

#[test]
fn test_distribute_dividends_zero_amount_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 801u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 0).unwrap_err()
    });

    assert_eq!(err, Error::InvalidDividendAmount);
}

#[test]
fn test_distribute_dividends_negative_amount_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 802u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, -500).unwrap_err()
    });

    assert_eq!(err, Error::InvalidDividendAmount);
}

#[test]
fn test_distribute_dividends_untokenized_asset_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let asset_id = 803u64;

    let err = env.as_contract(&contract_id, || {
        dividends::distribute_dividends(&env, asset_id, 1000).unwrap_err()
    });

    assert_eq!(err, Error::AssetNotTokenized);
}

#[test]
fn test_distribute_dividends_two_holders_equal_split() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 800u64;

    let (tokenizer_dividend, holder2_dividend) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 500)
            .unwrap();

        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        let t_div = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let h2_div = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        (t_div, h2_div)
    });

    assert_eq!(tokenizer_dividend, 500_i128);
    assert_eq!(holder2_dividend, 500_i128);
}

#[test]
fn test_distribute_dividends_accumulates_across_rounds() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 810u64;

    let unclaimed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // Two distribution rounds without claiming in between
        dividends::distribute_dividends(&env, asset_id, 400).unwrap();
        dividends::distribute_dividends(&env, asset_id, 600).unwrap();

        dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap()
    });

    // Total: 400 + 600 = 1000 (sole holder owns 100%)
    assert_eq!(unclaimed, 1000_i128);
}

#[test]
fn test_distribute_dividends_after_disable_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 811u64;

    let err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::disable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 1000).unwrap_err()
    });

    assert_eq!(err, Error::InvalidDividendAmount);
}

// ─── claim_dividends ─────────────────────────────────────────────────────────

#[test]
fn test_claim_dividends() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 800u64;

    let (claimed, remaining) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 500).unwrap();

        let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let remaining =
            dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        (claimed, remaining)
    });

    assert_eq!(claimed, 500_i128);
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
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::claim_dividends(&env, asset_id, tokenizer.clone()).is_err()
    });

    assert!(result_err);
}

#[test]
fn test_claim_dividends_no_double_claim() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 820u64;

    let second_err = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 500).unwrap();

        dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        // Second claim must fail
        dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap_err()
    });

    assert_eq!(second_err, Error::NoDividendsToClaim);
}

#[test]
fn test_claim_dividends_partial_holder() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let holder2 = Address::generate(&env);
    let asset_id = 821u64;

    let (claimed, h2_remaining) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // tokenizer keeps 750, holder2 gets 250
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 250)
            .unwrap();

        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        // Only tokenizer claims
        let claimed = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let h2_remaining =
            dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        (claimed, h2_remaining)
    });

    assert_eq!(claimed, 750_i128);
    assert_eq!(h2_remaining, 250_i128);
}

#[test]
fn test_claim_resets_then_accumulates_again() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 822u64;

    let (first_claim, second_claim) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        dividends::distribute_dividends(&env, asset_id, 300).unwrap();
        let first = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();

        dividends::distribute_dividends(&env, asset_id, 700).unwrap();
        let second = dividends::claim_dividends(&env, asset_id, tokenizer.clone()).unwrap();

        (first, second)
    });

    assert_eq!(first_claim, 300_i128);
    assert_eq!(second_claim, 700_i128);
}

// ─── get_unclaimed_dividends ─────────────────────────────────────────────────

#[test]
fn test_get_unclaimed_dividends_unknown_holder_returns_zero() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let stranger = Address::generate(&env);
    let asset_id = 830u64;

    let amount = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::get_unclaimed_dividends(&env, asset_id, stranger).unwrap()
    });

    assert_eq!(amount, 0_i128);
}

#[test]
fn test_get_unclaimed_dividends_untokenized_asset_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let stranger = Address::generate(&env);
    let asset_id = 831u64;

    let err = env.as_contract(&contract_id, || {
        dividends::get_unclaimed_dividends(&env, asset_id, stranger).unwrap_err()
    });

    assert_eq!(err, Error::AssetNotTokenized);
}

// ─── revenue sharing toggle ──────────────────────────────────────────────────

#[test]
fn test_enable_revenue_sharing() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 840u64;

    let ok = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).is_ok()
    });

    assert!(ok);
}

#[test]
fn test_disable_revenue_sharing() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 841u64;

    let ok = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::disable_revenue_sharing(&env, asset_id).is_ok()
    });

    assert!(ok);
}

#[test]
fn test_enable_revenue_sharing_untokenized_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let asset_id = 842u64;

    let err = env.as_contract(&contract_id, || {
        dividends::enable_revenue_sharing(&env, asset_id).unwrap_err()
    });

    assert_eq!(err, Error::AssetNotTokenized);
}

#[test]
fn test_disable_revenue_sharing_untokenized_fails() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let asset_id = 843u64;

    let err = env.as_contract(&contract_id, || {
        dividends::disable_revenue_sharing(&env, asset_id).unwrap_err()
    });

    assert_eq!(err, Error::AssetNotTokenized);
}

#[test]
fn test_revenue_sharing_toggle_enables_distribution() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 844u64;

    let (disabled_err, enabled_ok) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        let disabled_err = dividends::distribute_dividends(&env, asset_id, 100).is_err();

        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        let enabled_ok = dividends::distribute_dividends(&env, asset_id, 100).is_ok();

        (disabled_err, enabled_ok)
    });

    assert!(disabled_err);
    assert!(enabled_ok);
}

// ─── proportional distribution ───────────────────────────────────────────────

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
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // tokenizer: 400, holder2: 300, holder3: 300
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder2.clone(), 300)
            .unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), holder3.clone(), 300)
            .unwrap();

        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        let t = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let h2 = dividends::get_unclaimed_dividends(&env, asset_id, holder2.clone()).unwrap();
        let h3 = dividends::get_unclaimed_dividends(&env, asset_id, holder3.clone()).unwrap();
        (t, h2, h3)
    });

    assert_eq!(t_div, 400_i128);
    assert_eq!(h2_div, 300_i128);
    assert_eq!(h3_div, 300_i128);
}

#[test]
fn test_sole_holder_receives_full_amount() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let asset_id = 850u64;

    let unclaimed = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();
        dividends::distribute_dividends(&env, asset_id, 999).unwrap();
        dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap()
    });

    assert_eq!(unclaimed, 999_i128);
}

#[test]
fn test_four_equal_holders_distribution() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let tokenizer = Address::generate(&env);
    let h2 = Address::generate(&env);
    let h3 = Address::generate(&env);
    let h4 = Address::generate(&env);
    let asset_id = 851u64;

    let (d1, d2, d3, d4) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);
        dividends::enable_revenue_sharing(&env, asset_id).unwrap();

        // 250 each
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), h2.clone(), 250).unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), h3.clone(), 250).unwrap();
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), h4.clone(), 250).unwrap();

        dividends::distribute_dividends(&env, asset_id, 1000).unwrap();

        let d1 = dividends::get_unclaimed_dividends(&env, asset_id, tokenizer.clone()).unwrap();
        let d2 = dividends::get_unclaimed_dividends(&env, asset_id, h2.clone()).unwrap();
        let d3 = dividends::get_unclaimed_dividends(&env, asset_id, h3.clone()).unwrap();
        let d4 = dividends::get_unclaimed_dividends(&env, asset_id, h4.clone()).unwrap();
        (d1, d2, d3, d4)
    });

    assert_eq!(d1, 250_i128);
    assert_eq!(d2, 250_i128);
    assert_eq!(d3, 250_i128);
    assert_eq!(d4, 250_i128);
}
