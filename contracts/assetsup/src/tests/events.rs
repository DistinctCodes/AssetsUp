//! Event emission tests.
//!
//! `env.events().all()` reports the events of the **most recent contract
//! invocation**, not every event since the test began, so each assertion here
//! looks at exactly what the entrypoint under test published.
//!
//! See `contracts/EVENTS.md` for the catalogue these assertions pin down.

use soroban_sdk::testutils::{Address as _, Events as _};
use soroban_sdk::{Address, BytesN, Env, Symbol, TryIntoVal, Val, Vec};

use super::helpers::{create_env, create_test_asset, initialize_contract};
use crate::{AssetUpContract, AssetUpContractClient};

fn asset_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

/// Returns the topics and data of the single event published by the most
/// recent invocation, failing if the entrypoint did not emit exactly one.
fn only_event(env: &Env) -> (Vec<Val>, Val) {
    let events = env.events().all();
    assert_eq!(
        events.len(),
        1,
        "expected exactly one event from the last invocation"
    );
    let (_contract, topics, data) = events.last().unwrap();
    (topics, data)
}

fn assert_event_name(env: &Env, topics: &Vec<Val>, expected: &str) {
    let name: Symbol = topics
        .get(0)
        .expect("event must have a name topic")
        .try_into_val(env)
        .expect("topic 0 must decode as a Symbol");
    assert_eq!(
        name,
        Symbol::new(env, expected),
        "topic 0 should name the event"
    );
}

#[test]
fn initialize_emits_contract_initialized() {
    let env = create_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    env.mock_all_auths();

    client.initialize(&admin);

    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "contract_initialized");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, admin);
}

#[test]
fn register_asset_emits_asset_registered_keyed_by_asset_id() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 1);

    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "asset_registered");
    let emitted: BytesN<32> = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, id, "asset id must be indexable as topic 1");
}

#[test]
fn transfer_asset_ownership_emits_asset_transferred() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let id = asset_id(&env, 2);
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    client.transfer_asset_ownership(&id, &new_owner, &owner);

    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "asset_transferred");
    let emitted: BytesN<32> = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, id);
}

#[test]
fn retire_asset_emits_asset_retired() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 3);
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    client.retire_asset(&id, &owner);

    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "asset_retired");
    let emitted: BytesN<32> = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, id);
}

#[test]
fn the_two_step_admin_transfer_emits_a_distinct_event_at_each_step() {
    // Admin transfer is two-step ([SC-48]). Each step is separately
    // observable, so a consumer can tell a nomination from a completed
    // handover — which the old single-step admin_changed could not express.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let new_admin = Address::generate(&env);

    client.propose_admin(&new_admin);
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "admin_proposed");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(
        emitted, new_admin,
        "the nominee is the indexable topic while the transfer is pending"
    );

    client.accept_admin();
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "admin_changed");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, new_admin);
}

#[test]
fn cancelling_an_admin_proposal_is_observable() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let candidate = Address::generate(&env);

    client.propose_admin(&candidate);
    client.cancel_admin_proposal();

    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "admin_proposal_cancelled");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, candidate);
}

#[test]
fn registrar_changes_are_observable() {
    // These two entrypoints were silent before the event catalogue: an
    // off-chain consumer could not tell that the registrar allowlist changed.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    let registrar = Address::generate(&env);

    client.add_authorized_registrar(&registrar);
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "registrar_added");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, registrar);

    client.remove_authorized_registrar(&registrar);
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "registrar_removed");
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, registrar);
}

#[test]
fn pause_and_unpause_emit_distinct_events() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    client.pause_contract();
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "contract_paused");

    client.unpause_contract();
    let (topics, _) = only_event(&env);
    assert_event_name(&env, &topics, "contract_unpaused");
}
