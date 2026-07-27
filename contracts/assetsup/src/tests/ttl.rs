//! Storage TTL tests ([SC-44]).
//!
//! These advance the ledger past the default entry lifetime and prove critical
//! registry entries are still readable. Without the `extend_ttl` calls in
//! `lib.rs` these fail: Soroban archives the entry and the asset simply
//! disappears from the contract's view.

use soroban_sdk::testutils::{Address as _, Ledger as _, LedgerInfo};
use soroban_sdk::{Address, BytesN, Env};

use super::helpers::{create_env, create_test_asset, initialize_contract};
use crate::ttl::{LEDGERS_PER_DAY, PERSISTENT_EXTEND_TO};
use crate::AssetUpContractClient;

fn asset_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

/// Sets a ledger with a short default entry lifetime so archival is reachable
/// within a test, then advances by `ledgers`.
fn advance_ledgers(env: &Env, ledgers: u32) {
    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.sequence_number += ledgers;
        li.timestamp += (ledgers as u64) * 5;
    });
}

fn setup(env: &Env) -> (AssetUpContractClient<'_>, Address) {
    // A generous max entry TTL so the contract's own extension is what keeps
    // entries alive, rather than the harness silently capping it.
    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.sequence_number = 1;
        li.min_persistent_entry_ttl = 100;
        li.min_temp_entry_ttl = 16;
        li.max_entry_ttl = PERSISTENT_EXTEND_TO + LEDGERS_PER_DAY;
    });

    let admin = Address::generate(env);
    let client = initialize_contract(env, &admin);
    (client, admin)
}

#[test]
fn a_registered_asset_survives_past_the_default_entry_lifetime() {
    let env = create_env();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 1);

    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    // Well past the 100-ledger default set above, and past the point where an
    // unextended entry would have been archived.
    advance_ledgers(&env, 60 * LEDGERS_PER_DAY);

    let asset = client.get_asset(&id);
    assert_eq!(
        asset.owner, owner,
        "the ownership record must still be readable"
    );
}

#[test]
fn reading_an_asset_keeps_it_alive() {
    // The property that makes read-side extension necessary: an asset that is
    // queried but never modified must not be archived.
    let env = create_env();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 2);

    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    // Three hops, each shorter than the extension window, reading each time.
    // Cumulatively they exceed the window, so only read-side extension keeps
    // the entry alive to the end.
    for _ in 0..3 {
        advance_ledgers(&env, 45 * LEDGERS_PER_DAY);
        let asset = client.get_asset(&id);
        assert_eq!(asset.owner, owner);
    }

    assert!(client.check_asset_exists(&id));
}

#[test]
fn a_transferred_asset_survives_past_the_default_lifetime() {
    let env = create_env();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let id = asset_id(&env, 3);

    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);
    client.transfer_asset_ownership(&id, &new_owner, &owner);

    advance_ledgers(&env, 60 * LEDGERS_PER_DAY);

    assert_eq!(
        client.get_asset(&id).owner,
        new_owner,
        "the post-transfer ownership record must survive"
    );
}

#[test]
fn contract_configuration_survives_past_the_default_lifetime() {
    let env = create_env();
    let (client, admin) = setup(&env);

    advance_ledgers(&env, 60 * LEDGERS_PER_DAY);

    assert_eq!(client.get_admin(), admin, "admin must still be readable");
    assert!(!client.is_paused());
    assert!(client.is_authorized_registrar(&admin));
}
