#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, Env, String};
use soroban_sdk::testutils::{Address as _, Ledger as _};

use crate::types::AssetType;
use crate::tokenization;
use crate::AssetUpContract;

fn make_asset_id(seed: u64) -> u64 {
    seed
}

fn setup_tokenized(env: &Env, asset_id: u64, tokenizer: &Address) {
    tokenization::tokenize_asset(
        env,
        asset_id,
        String::from_str(env, "TOKEN"),
        1000,
        2,
        100,
        tokenizer.clone(),
        crate::types::TokenMetadata {
            name: String::from_str(env, "Lock Test Asset"),
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
fn test_tokenize_asset() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);

    let asset_id = make_asset_id(100);
    let symbol = String::from_str(&env, "ASSET100");
    let total_supply = 1000_i128;
    let decimals = 2u32;
    let min_voting_threshold = 100_i128;

    let metadata = crate::types::TokenMetadata {
        name: String::from_str(&env, "Test Asset"),
        description: String::from_str(&env, "Testing tokenization"),
        asset_type: AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: soroban_sdk::Vec::new(&env),
    };

    let tokenized_asset = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            symbol.clone(),
            total_supply,
            decimals,
            min_voting_threshold,
            tokenizer.clone(),
            metadata,
        )
        .unwrap()
    });

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
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);

    let result = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            100,
            String::from_str(&env, "ASSET100"),
            0, // Invalid supply
            2,
            100,
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
        )
    });

    assert!(result.is_err());
}

#[test]
fn test_mint_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);

    let asset_id = make_asset_id(200);
    let initial_supply = 500_i128;
    let mint_amount = 200_i128;

    let (updated_supply, balance) = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "AST200"),
            initial_supply,
            2,
            100,
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

        let updated = tokenization::mint_tokens(&env, asset_id, mint_amount, tokenizer.clone()).unwrap();
        let bal = tokenization::get_token_balance(&env, asset_id, tokenizer.clone()).unwrap();
        (updated.total_supply, bal)
    });

    assert_eq!(updated_supply, initial_supply + mint_amount);
    assert_eq!(balance, initial_supply + mint_amount);
}

#[test]
fn test_burn_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);

    let asset_id = make_asset_id(300);
    let initial_supply = 1000_i128;
    let burn_amount = 400_i128;

    let new_supply = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "AST300"),
            initial_supply,
            2,
            100,
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

        let updated = tokenization::burn_tokens(&env, asset_id, burn_amount, tokenizer.clone()).unwrap();
        updated.total_supply
    });

    assert_eq!(new_supply, 1000_i128 - burn_amount);
}

#[test]
fn test_transfer_tokens() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let recipient = Address::generate(&env);

    let asset_id = make_asset_id(400);
    let total_supply = 1000_i128;
    let transfer_amount = 300_i128;

    let (tokenizer_balance, recipient_balance) = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "AST400"),
            total_supply,
            2,
            100,
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

        tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), recipient.clone(), transfer_amount)
            .unwrap();

        let tb = tokenization::get_token_balance(&env, asset_id, tokenizer.clone()).unwrap();
        let rb = tokenization::get_token_balance(&env, asset_id, recipient.clone()).unwrap();
        (tb, rb)
    });

    assert_eq!(tokenizer_balance, 1000_i128 - transfer_amount);
    assert_eq!(recipient_balance, transfer_amount);
}

#[test]
fn test_lock_tokens() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset_id = make_asset_id(500);

    env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "AST500"),
            1000,
            2,
            100,
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

        tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 5000, tokenizer.clone()).unwrap();

        // Try to transfer (should fail)
        let result = tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), recipient.clone(), 100);
        assert!(result.is_err());
    });

    // Advance time past lock period
    env.ledger().with_mut(|li| li.timestamp = 6000);

    env.as_contract(&contract_id, || {
        // Transfer should now succeed
        let result = tokenization::transfer_tokens(&env, asset_id, tokenizer.clone(), recipient.clone(), 100);
        assert!(result.is_ok());
    });
}

#[test]
fn test_ownership_percentage() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);

    let asset_id = make_asset_id(600);

    let percentage = env.as_contract(&contract_id, || {
        tokenization::tokenize_asset(
            &env,
            asset_id,
            String::from_str(&env, "AST600"),
            1000,
            2,
            100,
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

        tokenization::calculate_ownership_percentage(&env, asset_id, tokenizer.clone()).unwrap()
    });

    // 100% = 10000 basis points
    assert_eq!(percentage, 10000_i128);
}

// =====================
// Token Lock Tests
// =====================

#[test]
fn test_is_tokens_locked_when_active() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = make_asset_id(700);

    let locked = env.as_contract(&contract_id, || {
        setup_tokenized(&env, asset_id, &tokenizer);
        // Lock until 5000; current timestamp is 1000 — should be locked
        tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 5000, tokenizer.clone()).unwrap();
        tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone())
    });

    assert!(locked);
}

#[test]
fn test_is_tokens_locked_after_expiry() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset_id = make_asset_id(800);

    env.as_contract(&contract_id, || {
        setup_tokenized(&env, asset_id, &tokenizer);
        // Lock until 2000
        tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 2000, tokenizer.clone()).unwrap();
    });

    // Advance time past the lock
    env.ledger().with_mut(|li| li.timestamp = 3000);

    env.as_contract(&contract_id, || {
        // Lock has expired — is_tokens_locked should return false
        assert!(!tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone()));

        // Transfer should also succeed because lock expired
        let result = tokenization::transfer_tokens(
            &env,
            asset_id,
            tokenizer.clone(),
            recipient.clone(),
            100,
        );
        assert!(result.is_ok());
    });
}

#[test]
fn test_unlock_tokens_clears_lock_regardless_of_timestamp() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset_id = make_asset_id(900);

    env.as_contract(&contract_id, || {
        setup_tokenized(&env, asset_id, &tokenizer);

        // Lock until far future
        tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 99999, tokenizer.clone()).unwrap();
        assert!(tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone()));

        // Unlock while still inside the lock window
        tokenization::unlock_tokens(&env, asset_id, tokenizer.clone()).unwrap();

        // Lock should be gone
        assert!(!tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone()));

        // Transfer should now succeed even though original lock hasn't "expired"
        let result = tokenization::transfer_tokens(
            &env,
            asset_id,
            tokenizer.clone(),
            recipient.clone(),
            100,
        );
        assert!(result.is_ok());
    });
}

#[test]
fn test_is_tokens_locked_no_lock_returns_false() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let asset_id = make_asset_id(1000);

    let locked = env.as_contract(&contract_id, || {
        setup_tokenized(&env, asset_id, &tokenizer);
        // No lock set — should return false
        tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone())
    });

    assert!(!locked);
}

#[test]
fn test_lock_tokens_unauthorized() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    let contract_id = env.register_contract(None, AssetUpContract);
    let tokenizer = Address::generate(&env);
    let intruder = Address::generate(&env);
    let asset_id = make_asset_id(1100);

    let (lock_result, still_unlocked) = env.as_contract(&contract_id, || {
        setup_tokenized(&env, asset_id, &tokenizer);

        // Non-tokenizer tries to lock — should fail
        let r = tokenization::lock_tokens(&env, asset_id, tokenizer.clone(), 5000, intruder.clone());

        // Holder is still unlocked
        let unlocked = !tokenization::is_tokens_locked(&env, asset_id, tokenizer.clone());
        (r, unlocked)
    });

    assert!(lock_result.is_err());
    assert!(still_unlocked);
}
