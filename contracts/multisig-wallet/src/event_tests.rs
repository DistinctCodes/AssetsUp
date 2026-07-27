//! Event emission tests.
//!
//! `env.events().all()` reports the events of the **most recent contract
//! invocation**, not every event since the test began, so each assertion here
//! looks at exactly what the entrypoint under test published.
//!
//! See `contracts/EVENTS.md` for the catalogue these assertions pin down.

use soroban_sdk::testutils::{Address as _, Events as _};
use soroban_sdk::{Address, Env, Symbol, TryIntoVal, Val, Vec};

use crate::{MultisigWallet, MultisigWalletClient};

fn setup(env: &Env) -> (MultisigWalletClient<'_>, Address, Address, Address) {
    let admin = Address::generate(env);
    let alice = Address::generate(env);
    let bob = Address::generate(env);
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(
        &admin,
        &Vec::from_array(env, [alice.clone(), bob.clone()]),
        &2,
    );
    (client, admin, alice, bob)
}

/// Topics of the last event published by the most recent invocation.
fn last_topics(env: &Env) -> Vec<Val> {
    let events = env.events().all();
    assert!(!events.is_empty(), "expected at least one event");
    let (_contract, topics, _data) = events.last().unwrap();
    topics
}

/// Names of every event published by the most recent invocation, in order.
fn event_names(env: &Env) -> Vec<Symbol> {
    let mut names = Vec::new(env);
    for (_contract, topics, _data) in env.events().all().iter() {
        names.push_back(event_name(env, &topics));
    }
    names
}

fn event_name(env: &Env, topics: &Vec<Val>) -> Symbol {
    topics
        .get(0)
        .expect("event must have a name topic")
        .try_into_val(env)
        .expect("topic 0 must decode as a Symbol")
}

#[test]
fn initialize_emits_wallet_initialized() {
    // initialize was silent before the event catalogue.
    let env = Env::default();
    let (_client, admin, _alice, _bob) = setup(&env);

    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "wallet_initialized")
    );
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, admin);
}

#[test]
fn propose_change_threshold_emits_proposal_submitted() {
    // The propose_* entrypoints were silent before the event catalogue, so a
    // pending governance change was invisible off-chain until it executed.
    let env = Env::default();
    let (client, _admin, alice, _bob) = setup(&env);

    let proposal_id = client.propose_change_threshold(&alice, &2);

    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "proposal_submitted")
    );
    let emitted: u64 = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, proposal_id, "proposal id must be indexable");
}

#[test]
fn confirm_proposal_emits_proposal_confirmed() {
    let env = Env::default();
    let (client, _admin, alice, _bob) = setup(&env);
    let proposal_id = client.propose_add_owner(&alice, &Address::generate(&env));

    client.confirm_proposal(&alice, &proposal_id);

    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "proposal_confirmed")
    );
}

#[test]
fn threshold_change_reaching_quorum_emits_threshold_changed() {
    let env = Env::default();
    let (client, _admin, alice, bob) = setup(&env);
    let proposal_id = client.propose_change_threshold(&alice, &1);

    client.confirm_proposal(&alice, &proposal_id);
    // Second confirmation reaches the 2-of-2 threshold and auto-executes.
    client.confirm_proposal(&bob, &proposal_id);

    // Read the events before any other call: `events().all()` only reports the
    // most recent invocation, and even a read entrypoint like get_threshold()
    // is an invocation that would clear this view.
    let names = event_names(&env);
    assert!(
        names.contains(Symbol::new(&env, "proposal_confirmed")),
        "the confirming call should emit proposal_confirmed"
    );
    assert!(
        names.contains(Symbol::new(&env, "threshold_changed")),
        "reaching quorum should auto-execute and emit threshold_changed"
    );

    assert_eq!(client.get_threshold(), 1, "proposal should have executed");
}

#[test]
fn freeze_and_unfreeze_emit_distinct_events() {
    let env = Env::default();
    let (client, _admin, alice, bob) = setup(&env);

    client.emergency_freeze(&alice);
    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "wallet_frozen")
    );

    // Unfreezing requires an owner, not the admin.
    client.emergency_unfreeze(&bob);
    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "wallet_unfrozen")
    );
}

#[test]
fn set_daily_limit_emits_daily_limit_changed() {
    // set_daily_limit was silent before the event catalogue.
    let env = Env::default();
    let (client, _admin, alice, _bob) = setup(&env);

    client.set_daily_limit(&alice, &1_000u128);

    let topics = last_topics(&env);
    assert_eq!(
        event_name(&env, &topics),
        Symbol::new(&env, "daily_limit_changed")
    );
}
