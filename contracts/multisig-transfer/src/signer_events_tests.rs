//! Signer-change event tests ([SC-74]).
//!
//! `ApproverAdded` and `ApproverRemoved` were declared in `events.rs` and
//! marked `#[allow(dead_code)]` -- present in the contract spec, never
//! published. `configure_approval_rule` emitted only `ApprovalRuleUpdated`,
//! which carries the new threshold but not *who* changed, so off-chain
//! monitoring had no signal to alert on a signer being granted or revoked.
//!
//! `env.events().all()` reports the events of the **most recent contract
//! invocation**, not every event since the test began, so each assertion here
//! looks at exactly what `configure_approval_rule` published.
#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Events as _};
use soroban_sdk::{Address, BytesN, Env, Symbol, TryIntoVal, Val, Vec};

use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

fn setup(env: &Env) -> (MultiSigTransferContractClient<'_>, Address) {
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(env, &contract_id);
    let admin = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&admin, &Address::generate(env));

    (client, admin)
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[11u8; 32])
}

fn rule(env: &Env, required: u32, approvers: &[Address]) -> ApprovalRule {
    ApprovalRule {
        category: category(env),
        required_approvals: required,
        approvers: Vec::from_slice(env, approvers),
        approval_timeout_secs: 3600,
        auto_approve: false,
        priority: 1,
    }
}

/// Topic 0 of every event published by the most recent invocation.
fn emitted_names(env: &Env) -> Vec<Symbol> {
    let events = env.events().all();
    let mut out = Vec::new(env);
    for (_contract, topics, _data) in events.iter() {
        let name: Symbol = topics
            .get(0)
            .expect("every contractevent carries a name topic")
            .try_into_val(env)
            .expect("topic 0 must decode as a Symbol");
        out.push_back(name);
    }
    out
}

/// Topic 1 (the primary entity) of every event published by the last invocation.
fn emitted_topics(env: &Env) -> Vec<Val> {
    let events = env.events().all();
    let mut out = Vec::new(env);
    for (_contract, topics, _data) in events.iter() {
        out.push_back(topics.get(1).expect("every event here is keyed by its subject"));
    }
    out
}

fn syms(env: &Env, names: &[&str]) -> Vec<Symbol> {
    let mut out = Vec::new(env);
    for name in names {
        out.push_back(Symbol::new(env, name));
    }
    out
}

#[test]
fn creating_a_rule_emits_one_approver_added_per_signer() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.configure_approval_rule(&admin, &rule(&env, 2, &[a.clone(), b.clone()]));

    assert_eq!(
        emitted_names(&env),
        syms(&env, &["approval_rule_updated", "approver_added", "approver_added"])
    );

    // Each event is keyed by the approver it is about, so an indexer can
    // subscribe to one address rather than diffing whole rule snapshots.
    let topics = emitted_topics(&env);
    assert_eq!(topics.len(), 3);
    let emitted: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, a);
    let emitted: Address = topics.get(2).unwrap().try_into_val(&env).unwrap();
    assert_eq!(emitted, b);
}

#[test]
fn swapping_a_signer_emits_exactly_one_add_and_one_remove() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let staying = Address::generate(&env);
    let leaving = Address::generate(&env);
    let joining = Address::generate(&env);

    client.configure_approval_rule(&admin, &rule(&env, 2, &[staying.clone(), leaving.clone()]));
    client.configure_approval_rule(&admin, &rule(&env, 2, &[staying.clone(), joining.clone()]));

    // The unchanged signer must not produce a spurious add/remove pair.
    assert_eq!(
        emitted_names(&env),
        syms(
            &env,
            &[
                "approval_rule_updated",
                "approver_added",
                "approver_removed"
            ]
        )
    );

    let topics = emitted_topics(&env);
    let added: Address = topics.get(1).unwrap().try_into_val(&env).unwrap();
    assert_eq!(added, joining);
    let removed: Address = topics.get(2).unwrap().try_into_val(&env).unwrap();
    assert_eq!(removed, leaving);
}

#[test]
fn clearing_the_signer_set_emits_one_remove_per_signer() {
    // Removing everyone must be as visible as adding everyone.
    let env = Env::default();
    let (client, admin) = setup(&env);

    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.configure_approval_rule(&admin, &rule(&env, 2, &[a.clone(), b.clone()]));
    client.configure_approval_rule(&admin, &rule(&env, 1, &[]));

    assert_eq!(
        emitted_names(&env),
        syms(
            &env,
            &["approval_rule_updated", "approver_removed", "approver_removed"]
        )
    );
}

#[test]
fn changing_only_the_threshold_emits_no_signer_events() {
    // The threshold already has its own event; duplicating it as a signer
    // change would make consumers reconcile two sources for one fact.
    let env = Env::default();
    let (client, admin) = setup(&env);

    let a = Address::generate(&env);
    client.configure_approval_rule(&admin, &rule(&env, 1, &[a.clone()]));
    client.configure_approval_rule(&admin, &rule(&env, 3, &[a.clone()]));

    assert_eq!(emitted_names(&env), syms(&env, &["approval_rule_updated"]));
}