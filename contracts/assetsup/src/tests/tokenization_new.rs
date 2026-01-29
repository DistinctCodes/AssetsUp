#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::types::{AssetType, TokenizedAsset};
use crate::tokenization;

fn make_asset_id(seed: u64) -> u64 {
    seed
}

#[test]
fn test_tokenize_asset() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = make_asset_id(100);
    let symbol = String::from_str(&env, "ASSET100");
    let total_supply = BigInt::from_i128(&env, 1000);
    let decimals = 2u32;
    let name = String::from_str(&env, "Test Asset");
    let description = String::from_str(&env, "Testing tokenization");
    let asset_type = AssetType::Digital;
    let min_voting_threshold = BigInt::from_i128(&env, 100);

    let metadata = crate::types::TokenMetadata {
        name,
        description,
        asset_type,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: soroban_sdk::Vec::new(&env),
    };

    let tokenized_asset = tokenization::tokenize_asset(
        &env,
        asset_id,
        symbol.clone(),
        total_supply.clone(),
        decimals,
        min_voting_threshold,
        tokenizer.clone(),
        metadata,
    )
    .unwrap();

    assert_eq!(tokenized_asset.asset_id, asset_id);
    assert_eq!(tokenized_asset.symbol, symbol);
    assert_eq!(tokenized_asset.total_supply, total_supply);
    assert_eq!(tokenized_asset.decimals, decimals);
    assert_eq!(tokenized_asset.tokenizer, tokenizer);
    assert_eq!(tokenized_asset.token_holders_count, 1);
}

#[test]
fn test_tokenize_asset_invalid_supply() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let result = tokenization::tokenize_asset(
        &env,
        100,
        String::from_str(&env, "ASSET100"),
        BigInt::from_i128(&env, 0), // Invalid supply
        2,
        BigInt::from_i128(&env, 100),
        tokenizer,
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Test"),
            description: String::from_str(&env, "Test"),
            asset_type: AssetType::Digital,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: soroban_sdk::Vec::new(&env),
        },
    );

    assert!(result.is_err());
}

#[test]
fn test_mint_tokens() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = make_asset_id(200);
    let initial_supply = BigInt::from_i128(&env, 500);
    let mint_amount = BigInt::from_i128(&env, 200);

    // Tokenize first
    let _ = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "AST200"),
        initial_supply,
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Mint Test"),
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

    // Mint tokens
    let updated_asset = tokenization::mint_tokens(&env, asset_id, mint_amount.clone(), tokenizer.clone()).unwrap();

    // Verify supply increased
    assert_eq!(updated_asset.total_supply, &initial_supply + &mint_amount);

    // Verify tokenizer's balance updated
    let balance = tokenization::get_token_balance(&env, asset_id, tokenizer).unwrap();
    assert_eq!(balance, &initial_supply + &mint_amount);
}

#[test]
fn test_burn_tokens() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = make_asset_id(300);
    let initial_supply = BigInt::from_i128(&env, 1000);
    let burn_amount = BigInt::from_i128(&env, 400);

    // Tokenize
    let _ = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "AST300"),
        initial_supply,
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Burn Test"),
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

    // Burn tokens
    let updated_asset = tokenization::burn_tokens(&env, asset_id, burn_amount.clone(), tokenizer.clone()).unwrap();

    // Verify supply decreased
    assert_eq!(updated_asset.total_supply, &BigInt::from_i128(&env, 1000) - &burn_amount);
}

#[test]
fn test_transfer_tokens() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let recipient = Address::random(&env);

    let asset_id = make_asset_id(400);
    let total_supply = BigInt::from_i128(&env, 1000);
    let transfer_amount = BigInt::from_i128(&env, 300);

    // Tokenize
    let _ = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "AST400"),
        total_supply,
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Transfer Test"),
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

    // Transfer
    tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), recipient.clone(), transfer_amount.clone())
        .unwrap();

    // Verify balances
    let tokenizer_balance = tokenization::get_token_balance(&env, asset_id, tokenizer).unwrap();
    let recipient_balance = tokenization::get_token_balance(&env, asset_id, recipient).unwrap();

    assert_eq!(tokenizer_balance, &BigInt::from_i128(&env, 1000) - &transfer_amount);
    assert_eq!(recipient_balance, transfer_amount);
}

#[test]
fn test_lock_tokens() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let tokenizer = Address::random(&env);
    let asset_id = make_asset_id(500);

    // Tokenize
    let _ = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "AST500"),
        BigInt::from_i128(&env, 1000),
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Lock Test"),
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

    // Lock tokens until timestamp 5000
    tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 5000).unwrap();

    // Try to transfer (should fail)
    let recipient = Address::random(&env);
    let result =
        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), recipient.clone(), BigInt::from_i128(&env, 100));

    assert!(result.is_err());

    // Advance time past lock period
    env.ledger().with_mut(|li| {
        li.timestamp = 6000;
    });

    // Transfer should now succeed
    let result = tokenization::transfer_tokens(&env, asset_id, tokenizer, recipient, BigInt::from_i128(&env, 100));
    assert!(result.is_ok());
}

#[test]
fn test_ownership_percentage() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = make_asset_id(600);
    let total_supply = BigInt::from_i128(&env, 1000);

    // Tokenize
    let _ = tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "AST600"),
        total_supply,
        2,
        BigInt::from_i128(&env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(&env, "Percentage Test"),
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

    // Tokenizer should have 100% ownership
    let percentage = tokenization::calculate_ownership_percentage(&env, asset_id, tokenizer).unwrap();

    // 100% = 10000 basis points
    assert_eq!(percentage, BigInt::from_i128(&env, 10000));
}
