//! Tokenization is tied to a registered asset and to its owner (#1647), and
//! token locks are capped and need the holder's consent (#1646).
//!
//! `tokenize_asset` used to take a free `u64` and check only the supply and
//! that the `u64` was unused, so any account could claim a token id first
//! (front-running) and nothing tied a token to a real asset. It now also takes
//! the registry asset id and requires that asset to exist, be active, be owned
//! by the tokenizer and not be tokenized already.
//!
//! `lock_tokens` let the tokenizer store any `until_timestamp` for any holder,
//! including `u64::MAX`. The duration is now capped and the holder must
//! authorize the lock.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String};

use super::helpers::{create_env, create_mock_addresses, initialize_contract, register_asset_for};
use crate::error::Error;
use crate::types::AssetType;
use crate::AssetUpContractClient;

const SUPPLY: i128 = 1_000;

fn tokenize<'a>(
    env: &Env,
    client: &AssetUpContractClient<'a>,
    token_id: u64,
    registry_id: &BytesN<32>,
    symbol: &str,
    tokenizer: &Address,
) -> Result<(), Error> {
    match client.try_tokenize_asset(
        &token_id,
        registry_id,
        &String::from_str(env, symbol),
        &SUPPLY,
        &7u32,
        &1i128,
        tokenizer,
        &String::from_str(env, "Token"),
        &String::from_str(env, "A linked token"),
        &AssetType::Physical,
    ) {
        Ok(Ok(_)) => Ok(()),
        Err(Ok(e)) => Err(e),
        other => panic!("unexpected result: {other:?}"),
    }
}

/// An initialized contract with one registered asset owned by `owner`.
fn setup(env: &Env) -> (AssetUpContractClient<'_>, Address, Address, BytesN<32>) {
    let (admin, owner, _, _) = create_mock_addresses(env);
    let client = initialize_contract(env, &admin);
    let registry_id = register_asset_for(env, &client, &admin, &owner, 1);
    (client, admin, owner, registry_id)
}

// ---------------------------------------------------------------------------
// #1647: tokenization is linked to a registered asset and its owner
// ---------------------------------------------------------------------------

#[test]
fn the_owner_of_an_active_registered_asset_can_tokenize_it() {
    let env = create_env();
    let (client, _admin, owner, registry_id) = setup(&env);

    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "OWN", &owner),
        Ok(())
    );

    assert_eq!(client.get_registry_asset_of_token(&7u64), Some(registry_id));
    assert_eq!(client.get_token_balance(&7u64, &owner), SUPPLY);
}

#[test]
fn an_unregistered_asset_cannot_be_tokenized() {
    let env = create_env();
    let (client, _admin, owner, _registry_id) = setup(&env);
    let unknown = BytesN::from_array(&env, &[99u8; 32]);

    assert_eq!(
        tokenize(&env, &client, 7, &unknown, "GHOST", &owner),
        Err(Error::AssetNotFound)
    );
    assert_eq!(client.get_registry_asset_of_token(&7u64), None);
}

#[test]
fn only_the_registered_owner_can_tokenize_an_asset() {
    // Nobody else can claim a token id for somebody's asset (front-running).
    let env = create_env();
    let (client, _admin, _owner, registry_id) = setup(&env);
    let attacker = Address::generate(&env);

    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "STEAL", &attacker),
        Err(Error::Unauthorized)
    );
    assert!(client.try_get_token_holders(&7u64).is_err());
}

#[test]
fn a_retired_asset_cannot_be_tokenized() {
    let env = create_env();
    let (client, _admin, owner, registry_id) = setup(&env);
    client.retire_asset(&registry_id, &owner);

    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "DEAD", &owner),
        Err(Error::AssetRetired)
    );
}

#[test]
fn a_registry_asset_can_back_only_one_token_id() {
    let env = create_env();
    let (client, _admin, owner, registry_id) = setup(&env);
    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "ONE", &owner),
        Ok(())
    );

    // A different token id and a different symbol: still the same asset.
    assert_eq!(
        tokenize(&env, &client, 8, &registry_id, "TWO", &owner),
        Err(Error::AssetAlreadyTokenized)
    );
    assert_eq!(client.get_registry_asset_of_token(&8u64), None);
}

#[test]
fn a_tokenized_asset_cannot_be_transferred_or_retired_directly() {
    let env = create_env();
    let (client, _admin, owner, registry_id) = setup(&env);
    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "LOCK", &owner),
        Ok(())
    );
    let buyer = Address::generate(&env);

    assert!(matches!(
        client.try_transfer_asset_ownership(&registry_id, &buyer, &owner),
        Err(Ok(Error::AssetIsTokenized))
    ));
    assert!(matches!(
        client.try_retire_asset(&registry_id, &owner),
        Err(Ok(Error::AssetIsTokenized))
    ));
    assert_eq!(client.get_asset(&registry_id).owner, owner);
}

#[test]
fn releasing_the_link_makes_the_asset_transferable_again() {
    // Detokenization calls `unlink_registry_asset`.
    let env = create_env();
    let (client, _admin, owner, registry_id) = setup(&env);
    assert_eq!(
        tokenize(&env, &client, 7, &registry_id, "FREE", &owner),
        Ok(())
    );
    let buyer = Address::generate(&env);

    env.as_contract(&client.address, || {
        crate::tokenization::unlink_registry_asset(&env, 7);
    });

    assert_eq!(client.get_registry_asset_of_token(&7u64), None);
    client.transfer_asset_ownership(&registry_id, &buyer, &owner);
    assert_eq!(client.get_asset(&registry_id).owner, buyer);
}

// ---------------------------------------------------------------------------
// #1646: lock duration is capped and the holder must consent
// ---------------------------------------------------------------------------

fn tokenized_with_investor(env: &Env) -> (AssetUpContractClient<'_>, Address, Address, Address) {
    let (client, admin, owner, registry_id) = setup(env);
    assert_eq!(
        tokenize(env, &client, 7, &registry_id, "LCK", &owner),
        Ok(())
    );
    let investor = Address::generate(env);
    (client, admin, owner, investor)
}

#[test]
fn a_lock_longer_than_the_default_maximum_is_rejected() {
    let env = create_env();
    let (client, _admin, owner, investor) = tokenized_with_investor(&env);
    let one_year = 365 * 24 * 60 * 60u64;
    assert_eq!(client.get_max_lock_duration(), one_year);

    assert!(matches!(
        client.try_lock_tokens(&7u64, &investor, &(one_year + 1), &owner),
        Err(Ok(Error::LockDurationTooLong))
    ));
    assert!(matches!(
        client.try_lock_tokens(&7u64, &investor, &u64::MAX, &owner),
        Err(Ok(Error::LockDurationTooLong))
    ));
    assert!(!client.is_tokens_locked(&7u64, &investor));

    // Exactly the maximum is allowed.
    client.lock_tokens(&7u64, &investor, &one_year, &owner);
    assert!(client.is_tokens_locked(&7u64, &investor));
}

#[test]
fn the_admin_can_configure_the_maximum_lock_duration() {
    let env = create_env();
    let (client, _admin, owner, investor) = tokenized_with_investor(&env);

    client.set_max_lock_duration(&100u64);
    assert_eq!(client.get_max_lock_duration(), 100);

    assert!(matches!(
        client.try_lock_tokens(&7u64, &investor, &101u64, &owner),
        Err(Ok(Error::LockDurationTooLong))
    ));
    client.lock_tokens(&7u64, &investor, &100u64, &owner);
}

#[test]
fn a_zero_maximum_is_rejected() {
    let env = create_env();
    let (client, _admin, _owner, _investor) = tokenized_with_investor(&env);

    assert!(matches!(
        client.try_set_max_lock_duration(&0u64),
        Err(Ok(Error::InvalidInput))
    ));
    assert_eq!(client.get_max_lock_duration(), 365 * 24 * 60 * 60);
}

#[test]
fn only_the_tokenizer_can_lock() {
    let env = create_env();
    let (client, _admin, _owner, investor) = tokenized_with_investor(&env);
    let intruder = Address::generate(&env);

    assert!(matches!(
        client.try_lock_tokens(&7u64, &investor, &100u64, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn locking_somebody_elses_tokens_needs_the_holders_authorization_too() {
    let env = create_env();
    let (client, _admin, owner, investor) = tokenized_with_investor(&env);

    client.lock_tokens(&7u64, &investor, &100u64, &owner);

    let authorizers: std::vec::Vec<Address> =
        env.auths().iter().map(|(who, _)| who.clone()).collect();
    assert!(authorizers.contains(&owner), "the tokenizer must authorize");
    assert!(
        authorizers.contains(&investor),
        "the holder must consent to the lock"
    );
}

#[test]
fn a_tokenizer_locking_its_own_tokens_needs_only_one_authorization() {
    let env = create_env();
    let (client, _admin, owner, _investor) = tokenized_with_investor(&env);

    client.lock_tokens(&7u64, &owner, &100u64, &owner);

    assert_eq!(env.auths().len(), 1);
}
