#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, Env, String};
use soroban_sdk::testutils::Address as _;

use crate::tokenization;
use crate::types::{AssetType, TransferRestriction};
use crate::transfer_restrictions;
use crate::AssetUpContract;

fn setup_tokenized_asset(env: &Env, asset_id: u64, tokenizer: &Address) {
    tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "RESTR"),
        1000,
        2,
        100,
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
    )
    .unwrap();
}

#[test]
fn test_set_transfer_restriction() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = 900u64;

    let (set_ok, has_restrictions) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        let restriction = TransferRestriction {
            require_accredited: true,
            geographic_allowed: soroban_sdk::Vec::new(&env),
        };

        let ok = transfer_restrictions::set_transfer_restriction(&env, asset_id, restriction)
            .is_ok();
        let has = transfer_restrictions::has_transfer_restrictions(&env, asset_id).unwrap();
        (ok, has)
    });

    assert!(set_ok);
    assert!(has_restrictions);
}

#[test]
fn test_whitelist_operations() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let whitelisted = Address::generate(&env);
    let asset_id = 900u64;

    let (is_wl_after_add, list_len, is_wl_after_remove) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Add to whitelist
        transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

        let is_wl_add =
            transfer_restrictions::is_whitelisted(&env, asset_id, whitelisted.clone()).unwrap();
        let whitelist = transfer_restrictions::get_whitelist(&env, asset_id).unwrap();
        let len = whitelist.len();

        // Remove from whitelist
        transfer_restrictions::remove_from_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

        let is_wl_rem =
            transfer_restrictions::is_whitelisted(&env, asset_id, whitelisted.clone()).unwrap();
        (is_wl_add, len, is_wl_rem)
    });

    assert!(is_wl_after_add);
    assert_eq!(list_len, 1);
    assert!(!is_wl_after_remove);
}

#[test]
fn test_whitelist_duplicate_prevention() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let whitelisted = Address::generate(&env);
    let asset_id = 900u64;

    let list_len = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Add to whitelist twice
        transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();
        transfer_restrictions::add_to_whitelist(&env, asset_id, whitelisted.clone()).unwrap();

        // Should still have only 1 entry
        transfer_restrictions::get_whitelist(&env, asset_id).unwrap().len()
    });

    assert_eq!(list_len, 1);
}

#[test]
fn test_validate_transfer_no_restrictions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset_id = 900u64;

    let valid = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Validate transfer when no restrictions exist
        transfer_restrictions::validate_transfer(&env, asset_id, tokenizer.clone(), recipient.clone())
            .unwrap()
    });

    assert!(valid);
}

#[test]
fn test_get_transfer_restriction() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = 900u64;

    let (before_err, after_require_accredited) = env.as_contract(&contract_id, || {
        setup_tokenized_asset(&env, asset_id, &tokenizer);

        // Should fail initially (no restriction)
        let before = transfer_restrictions::get_transfer_restriction(&env, asset_id).is_err();

        // Set restriction
        let new_restriction = TransferRestriction {
            require_accredited: true,
            geographic_allowed: soroban_sdk::Vec::new(&env),
        };
        transfer_restrictions::set_transfer_restriction(&env, asset_id, new_restriction).unwrap();

        // Should now exist
        let after =
            transfer_restrictions::get_transfer_restriction(&env, asset_id).unwrap();
        (before, after.require_accredited)
    });

    assert!(before_err);
    assert!(after_require_accredited);
}
