//! Two-step admin rotation tests (#1644).
//!
//! The admin used to be written once, in `initialize`, with no entrypoint that
//! could change it: a lost or compromised admin key permanently locked or
//! exposed `configure_approval_rule`. `assetsup` already rotates its admin in
//! two steps (propose, then accept by the nominee); this crate now does the
//! same, and these tests mirror the `assetsup` admin-transfer tests.
#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Events as _, MockAuth, MockAuthInvoke};
use soroban_sdk::{Address, BytesN, Env, IntoVal, Symbol, TryIntoVal, Val, Vec};

use crate::errors::MultiSigError;
use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

fn setup(env: &Env) -> (MultiSigTransferContractClient<'_>, Address, Address) {
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(env, &contract_id);
    let admin = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&admin, &Address::generate(env));

    (client, contract_id, admin)
}

fn rule(env: &Env) -> ApprovalRule {
    ApprovalRule {
        category: BytesN::from_array(env, &[5u8; 32]),
        required_approvals: 1,
        approvers: Vec::from_array(env, [Address::generate(env)]),
        approval_timeout_secs: 3600,
        auto_approve: false,
        priority: 1,
    }
}

/// Topic 0 of the last event published by the most recent invocation.
fn last_event_name(env: &Env) -> Symbol {
    let events = env.events().all();
    let (_contract, topics, _data) = events.last().expect("an event was published");
    topics
        .get(0)
        .expect("every contractevent carries a name topic")
        .try_into_val(env)
        .expect("topic 0 must decode as a Symbol")
}

#[test]
fn the_admin_is_rotated_in_two_steps() {
    let env = Env::default();
    let (client, _id, admin) = setup(&env);
    let new_admin = Address::generate(&env);

    client.propose_admin(&new_admin);

    // Step one changes nothing but the pending slot.
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_pending_admin(), Some(new_admin.clone()));

    client.accept_admin();

    assert_eq!(client.get_admin(), new_admin);
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn the_old_admin_loses_its_rights_immediately() {
    let env = Env::default();
    let (client, _id, admin) = setup(&env);
    let new_admin = Address::generate(&env);

    client.propose_admin(&new_admin);
    client.accept_admin();

    // `configure_approval_rule` compares the caller with the stored admin.
    assert_eq!(
        client.try_configure_approval_rule(&admin, &rule(&env)),
        Err(Ok(MultiSigError::Unauthorized))
    );
    assert!(client
        .try_configure_approval_rule(&new_admin, &rule(&env))
        .is_ok());
}

#[test]
fn the_old_admin_can_no_longer_propose_a_successor() {
    let env = Env::default();
    let (client, id, admin) = setup(&env);
    let new_admin = Address::generate(&env);
    client.propose_admin(&new_admin);
    client.accept_admin();

    // Only the previous admin authorizes the call. `propose_admin` takes its
    // authorization from the *stored* admin, which is now `new_admin`.
    let successor = Address::generate(&env);
    env.set_auths(&[]);
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &id,
            fn_name: "propose_admin",
            args: (successor.clone(),).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    assert!(client.try_propose_admin(&successor).is_err());
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn an_address_that_was_not_proposed_cannot_accept() {
    let env = Env::default();
    let (client, id, admin) = setup(&env);
    let nominee = Address::generate(&env);
    let stranger = Address::generate(&env);
    client.propose_admin(&nominee);

    // `accept_admin` is authorized by the pending address, so a stranger's
    // authorization is not enough.
    env.set_auths(&[]);
    env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &id,
            fn_name: "accept_admin",
            args: Vec::<Val>::new(&env),
            sub_invokes: &[],
        },
    }]);

    assert!(client.try_accept_admin().is_err());
    assert_eq!(client.get_admin(), admin, "the admin must not have moved");
    assert_eq!(client.get_pending_admin(), Some(nominee));
}

#[test]
fn accepting_without_any_authorization_fails() {
    let env = Env::default();
    let (client, _id, admin) = setup(&env);
    client.propose_admin(&Address::generate(&env));

    env.set_auths(&[]);

    assert!(client.try_accept_admin().is_err());
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn proposing_requires_the_current_admins_authorization() {
    let env = Env::default();
    let (client, _id, _admin) = setup(&env);

    env.set_auths(&[]);

    assert!(client.try_propose_admin(&Address::generate(&env)).is_err());
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn proposing_the_current_admin_is_rejected() {
    let env = Env::default();
    let (client, _id, admin) = setup(&env);

    assert_eq!(
        client.try_propose_admin(&admin),
        Err(Ok(MultiSigError::InvalidAdmin))
    );
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn accepting_with_no_proposal_in_flight_is_an_error() {
    let env = Env::default();
    let (client, _id, _admin) = setup(&env);

    assert_eq!(
        client.try_accept_admin(),
        Err(Ok(MultiSigError::NoPendingAdminProposal))
    );
}

#[test]
fn a_proposal_can_be_cancelled_and_then_cannot_be_accepted() {
    let env = Env::default();
    let (client, _id, admin) = setup(&env);
    let nominee = Address::generate(&env);

    client.propose_admin(&nominee);
    client.cancel_admin_proposal();

    assert_eq!(client.get_pending_admin(), None);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(
        client.try_accept_admin(),
        Err(Ok(MultiSigError::NoPendingAdminProposal))
    );
}

#[test]
fn cancelling_with_no_proposal_in_flight_is_an_error() {
    let env = Env::default();
    let (client, _id, _admin) = setup(&env);

    assert_eq!(
        client.try_cancel_admin_proposal(),
        Err(Ok(MultiSigError::NoPendingAdminProposal))
    );
}

#[test]
fn a_new_proposal_replaces_the_one_in_flight() {
    let env = Env::default();
    let (client, _id, _admin) = setup(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);

    client.propose_admin(&first);
    client.propose_admin(&second);
    assert_eq!(client.get_pending_admin(), Some(second.clone()));

    client.accept_admin();
    assert_eq!(client.get_admin(), second);
}

#[test]
fn each_step_of_the_rotation_is_observable() {
    let env = Env::default();
    let (client, _id, _admin) = setup(&env);
    let nominee = Address::generate(&env);

    client.propose_admin(&nominee);
    assert_eq!(last_event_name(&env), Symbol::new(&env, "admin_proposed"));

    client.cancel_admin_proposal();
    assert_eq!(
        last_event_name(&env),
        Symbol::new(&env, "admin_proposal_cancelled")
    );

    client.propose_admin(&nominee);
    client.accept_admin();
    assert_eq!(last_event_name(&env), Symbol::new(&env, "admin_changed"));
}

#[test]
fn rotation_before_initialization_is_an_error() {
    let env = Env::default();
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(&env, &contract_id);
    env.mock_all_auths();

    assert_eq!(
        client.try_propose_admin(&Address::generate(&env)),
        Err(Ok(MultiSigError::NotInitialized))
    );
    assert_eq!(
        client.try_cancel_admin_proposal(),
        Err(Ok(MultiSigError::NotInitialized))
    );
    assert_eq!(
        client.try_accept_admin(),
        Err(Ok(MultiSigError::NoPendingAdminProposal))
    );
    assert_eq!(
        client.try_get_admin(),
        Err(Ok(MultiSigError::NotInitialized))
    );
}
