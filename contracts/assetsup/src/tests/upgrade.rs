//! Contract upgrade and migration tests ([SC-49]).
//!
//! The property that matters: **an upgrade must not lose the asset registry.**
//! Ownership records are exactly the data you cannot afford to lose.
//!
//! The unit-test environment registers contracts natively rather than from
//! uploaded WASM, so `update_current_contract_wasm` itself cannot execute
//! here. That step is verified by the deployment runbook in
//! `contracts/UPGRADE.md`. What these tests cover is everything around it that
//! could silently lose data: the admin gate on both entrypoints, the storage
//! version stamp, migration idempotency, and that a full registry — including
//! transferred and retired assets — reads back intact after migrating.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env};

use super::helpers::{create_env, create_test_asset, initialize_contract};
use crate::upgrade::CURRENT_VERSION;
use crate::{AssetUpContract, AssetUpContractClient};

fn asset_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

/// A placeholder WASM hash.
///
/// The unit-test environment registers contracts natively rather than from
/// uploaded WASM, so `update_current_contract_wasm` cannot actually run here —
/// the real swap is exercised by the deployment runbook in
/// `contracts/UPGRADE.md`, not by `cargo test`. What these tests do cover is
/// everything around it that can silently lose data: the admin gate, the
/// storage version, and migration idempotency.
fn placeholder_wasm_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[7u8; 32])
}

#[test]
fn upgrade_requires_the_admins_authorization() {
    // The auth check runs before the WASM swap, so this is testable natively
    // and is the gate that matters: an unauthenticated caller must never reach
    // update_current_contract_wasm.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    env.mock_all_auths();
    let hash = placeholder_wasm_hash(&env);

    env.set_auths(&[]);
    let res = client.try_upgrade(&hash);

    assert!(
        res.is_err(),
        "replacing the contract WASM must require the admin"
    );
}

#[test]
fn initialize_stamps_the_current_storage_version() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    assert_eq!(client.storage_version(), CURRENT_VERSION);
}

#[test]
fn migrate_is_idempotent() {
    // A retried or duplicated migration transaction must not corrupt state.
    // This is the property that makes a migration safe to re-run after a
    // failed or ambiguous submission.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let id = asset_id(&env, 4);
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    assert_eq!(client.migrate(), CURRENT_VERSION);
    assert_eq!(client.migrate(), CURRENT_VERSION);
    assert_eq!(client.migrate(), CURRENT_VERSION);

    assert_eq!(client.storage_version(), CURRENT_VERSION);
    assert_eq!(
        client.get_asset(&id).owner,
        owner,
        "repeated migration must not disturb stored data"
    );
}

#[test]
fn migration_preserves_the_whole_registry() {
    // Stands in for the post-upgrade check: after migrating, every record must
    // read back exactly as written, including transferred and retired ones.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let second_owner = Address::generate(&env);
    let kept = asset_id(&env, 1);
    let transferred = asset_id(&env, 2);
    let retired = asset_id(&env, 3);

    client.register_asset(&create_test_asset(&env, &owner, kept.clone()), &admin);
    client.register_asset(
        &create_test_asset(&env, &owner, transferred.clone()),
        &admin,
    );
    client.register_asset(&create_test_asset(&env, &owner, retired.clone()), &admin);
    client.transfer_asset_ownership(&transferred, &second_owner, &owner);
    client.retire_asset(&retired, &owner);

    client.migrate();

    assert_eq!(client.get_total_asset_count(), 3);
    assert_eq!(client.get_asset(&kept).owner, owner);
    assert_eq!(client.get_asset(&transferred).owner, second_owner);
    assert_eq!(
        client.get_asset(&retired).status,
        crate::types::AssetStatus::Retired
    );
    assert_eq!(client.get_admin(), admin);
    assert!(client.is_authorized_registrar(&admin));
}

#[test]
fn migrate_requires_the_admins_authorization() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    env.mock_all_auths();
    env.set_auths(&[]);

    assert!(
        client.try_migrate().is_err(),
        "migration must require the admin"
    );
}

#[test]
fn a_freshly_registered_contract_reports_the_current_version() {
    // Contracts initialized before versioning existed have no stored value and
    // are treated as the layout they were written with, rather than as
    // version 0 needing an imaginary migration.
    let env = create_env();
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    assert_eq!(client.storage_version(), CURRENT_VERSION);
}

#[test]
fn migrating_from_a_future_version_is_refused() {
    // Stored data written by a newer build than this one cannot be safely
    // interpreted; refusing is the only correct answer.
    let env = create_env();
    assert!(crate::upgrade::migrate_from(&env, CURRENT_VERSION + 1).is_err());
}
