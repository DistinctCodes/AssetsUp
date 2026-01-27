#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BigInt, Env, String};

use crate::tokenization;
use crate::types::{AssetType, TransferRestriction};
use crate::transfer_restrictions;

fn setup_tokenized_asset(env: &Env, tokenizer: &Address) -> u64 {
    let asset_id = 900u64;
    let _ = tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "RESTR"),
        BigInt::from_i128(env, 1000),
        2,
        BigInt::from_i128(env, 100),
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(env, "Restriction Test"),
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
fn test_set_transfer_restriction() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    let restriction = TransferRestriction {
        require_accredited: true,
        geographic_allowed: soroban_sdk::Vec::new(&env),
    };

    let result = transfer_restrictions::set_transfer_restriction(&env, asset_id, restriction);
    assert!(result.is_ok());

    // Verify restriction was set
    let has_restrictions = transfer_restrictions::has_transfer_restrictions(&env, asset_id).unwrap();
    assert!(has_restrictions);
}

#[test]
fn test_whitelist_operations() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let whitelisted = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Add to whitelist
    transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

    // Check if whitelisted
    let is_wl = transfer_restrictions::is_whitelisted(&env, asset_id, whitelisted.clone()).unwrap();
    assert!(is_wl);

    // Get whitelist
    let whitelist = transfer_restrictions::get_whitelist(&env, asset_id).unwrap();
    assert_eq!(whitelist.len(), 1);

    // Remove from whitelist
    transfer_restrictions::remove_from_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

    // Verify removed
    let is_wl = transfer_restrictions::is_whitelisted(&env, asset_id, whitelisted).unwrap();
    assert!(!is_wl);
}

#[test]
fn test_whitelist_duplicate_prevention() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let whitelisted = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Add to whitelist twice
    transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();
    transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

    // Should still have only 1 entry
    let whitelist = transfer_restrictions::get_whitelist(&env, asset_id).unwrap();
    assert_eq!(whitelist.len(), 1);
}

#[test]
fn test_validate_transfer_no_restrictions() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let recipient = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Validate transfer when no restrictions exist
    let valid = transfer_restrictions::validate_transfer(&env, asset_id, tokenizer, recipient).unwrap();
    assert!(valid);
}

#[test]
fn test_get_transfer_restriction() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let asset_id = setup_tokenized_asset(&env, &tokenizer);

    // Should fail initially (no restriction)
    let restriction = transfer_restrictions::get_transfer_restriction(&env, asset_id);
    assert!(restriction.is_err());

    // Set restriction
    let new_restriction = TransferRestriction {
        require_accredited: true,
        geographic_allowed: soroban_sdk::Vec::new(&env),
    };
    transfer_restrictions::set_transfer_restriction(&env, asset_id, new_restriction.clone()).unwrap();

    // Should now exist
    let restriction = transfer_restrictions::get_transfer_restriction(&env, asset_id).unwrap();
    assert_eq!(restriction.require_accredited, true);
}
