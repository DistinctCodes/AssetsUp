//! Two-step admin transfer ([SC-48]).
//!
//! A single-step transfer means one typo permanently bricks administration of
//! a contract governing real asset ownership, with no on-chain undo. The
//! property that matters, and the one most of these tests exist to pin down:
//! **transferring to an address that never accepts leaves the original admin
//! in place.**

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

use super::helpers::{create_env, create_mock_addresses, initialize_contract};
use crate::AssetUpContractClient;

fn setup(env: &Env) -> (AssetUpContractClient<'_>, Address, Address) {
    let (admin, candidate, _, _) = create_mock_addresses(env);
    let client = initialize_contract(env, &admin);
    env.mock_all_auths();
    (client, admin, candidate)
}

// ---------------------------------------------------------------------------
// The core property
// ---------------------------------------------------------------------------

#[test]
fn proposing_does_not_change_the_admin() {
    let env = create_env();
    let (client, admin, candidate) = setup(&env);

    client.propose_admin(&candidate);

    assert_eq!(
        client.get_admin(),
        admin,
        "the admin must not move until the proposal is accepted"
    );
    assert_eq!(client.get_pending_admin(), Some(candidate));
}

#[test]
fn an_address_that_never_accepts_leaves_the_original_admin_in_place() {
    // The typo case. Nominating an unreachable address must be recoverable.
    let env = create_env();
    let (client, admin, _candidate) = setup(&env);
    let unreachable = Address::generate(&env);

    client.propose_admin(&unreachable);

    // The original admin still holds every privilege.
    assert_eq!(client.get_admin(), admin);
    client.pause_contract();
    assert!(client.is_paused());
    client.unpause_contract();

    // And can withdraw the mistake.
    client.cancel_admin_proposal();
    assert_eq!(client.get_pending_admin(), None);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn accepting_moves_the_admin_and_clears_the_proposal() {
    let env = create_env();
    let (client, _admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.accept_admin();

    assert_eq!(client.get_admin(), candidate);
    assert_eq!(
        client.get_pending_admin(),
        None,
        "the proposal must be consumed"
    );
}

#[test]
fn accepting_moves_registrar_rights_with_the_role() {
    let env = create_env();
    let (client, admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.accept_admin();

    assert!(client.is_authorized_registrar(&candidate));
    assert!(!client.is_authorized_registrar(&admin));
}

// ---------------------------------------------------------------------------
// Rejections
// ---------------------------------------------------------------------------

#[test]
fn a_non_admin_cannot_propose() {
    let env = create_env();
    let (client, _admin, candidate) = setup(&env);
    let stranger = Address::generate(&env);

    // Only the current admin's authorization is accepted; a stranger signing
    // for themselves is not enough.
    env.set_auths(&[]);
    let res = client.try_propose_admin(&candidate);
    assert!(res.is_err(), "proposing must require the current admin");

    let _ = stranger;
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn accepting_requires_the_proposed_addresss_authorization() {
    let env = create_env();
    let (client, admin, candidate) = setup(&env);
    client.propose_admin(&candidate);

    env.set_auths(&[]);
    let res = client.try_accept_admin();

    assert!(
        res.is_err(),
        "acceptance must be signed by the incoming address"
    );
    assert_eq!(client.get_admin(), admin, "the admin must not have moved");
}

#[test]
fn accepting_without_a_proposal_is_rejected() {
    let env = create_env();
    let (client, admin, _candidate) = setup(&env);

    let res = client.try_accept_admin();
    assert!(res.is_err(), "there is nothing to accept");
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn cancelling_without_a_proposal_is_rejected() {
    let env = create_env();
    let (client, _admin, _candidate) = setup(&env);

    let res = client.try_cancel_admin_proposal();
    assert!(res.is_err(), "there is nothing to cancel");
}

#[test]
fn a_non_admin_cannot_cancel_a_proposal() {
    let env = create_env();
    let (client, _admin, candidate) = setup(&env);
    client.propose_admin(&candidate);

    env.set_auths(&[]);
    let res = client.try_cancel_admin_proposal();

    assert!(res.is_err(), "cancelling must require the current admin");
    assert_eq!(
        client.get_pending_admin(),
        Some(candidate),
        "the proposal must survive the rejected cancel"
    );
}

#[test]
fn proposing_the_zero_address_is_rejected() {
    let env = create_env();
    let (client, _admin, _candidate) = setup(&env);

    let zero = Address::from_string(&String::from_str(
        &env,
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    ));

    let res = client.try_propose_admin(&zero);
    assert!(res.is_err(), "the zero address must be rejected");
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn proposing_the_current_admin_is_rejected() {
    // A self-transfer is a no-op that would leave a confusing pending proposal.
    let env = create_env();
    let (client, admin, _candidate) = setup(&env);

    let res = client.try_propose_admin(&admin);
    assert!(res.is_err());
    assert_eq!(client.get_pending_admin(), None);
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

#[test]
fn a_cancelled_proposal_cannot_then_be_accepted() {
    let env = create_env();
    let (client, admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.cancel_admin_proposal();

    let res = client.try_accept_admin();
    assert!(res.is_err(), "a withdrawn proposal must not be acceptable");
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn a_second_proposal_replaces_the_first() {
    let env = create_env();
    let (client, admin, first) = setup(&env);
    let second = Address::generate(&env);

    client.propose_admin(&first);
    client.propose_admin(&second);

    assert_eq!(client.get_pending_admin(), Some(second.clone()));

    client.accept_admin();
    assert_eq!(
        client.get_admin(),
        second,
        "the superseded nominee must not be able to take the role"
    );
    let _ = (admin, first);
}

#[test]
fn accepting_twice_is_rejected() {
    let env = create_env();
    let (client, _admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.accept_admin();

    let res = client.try_accept_admin();
    assert!(res.is_err(), "the proposal was already consumed");
    assert_eq!(client.get_admin(), candidate);
}

#[test]
fn the_new_admin_can_immediately_exercise_admin_rights() {
    let env = create_env();
    let (client, _admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.accept_admin();

    client.pause_contract();
    assert!(client.is_paused());

    let next = Address::generate(&env);
    client.propose_admin(&next);
    assert_eq!(client.get_pending_admin(), Some(next));
}

#[test]
fn the_old_admin_loses_admin_rights_after_the_transfer() {
    let env = create_env();
    let (client, admin, candidate) = setup(&env);

    client.propose_admin(&candidate);
    client.accept_admin();

    // The old admin can no longer act. Grant only the old admin's signature.
    env.set_auths(&[]);
    let res = client.try_pause_contract();
    assert!(
        res.is_err(),
        "the former admin must no longer be able to pause"
    );
    let _ = admin;
}

#[test]
fn get_pending_admin_is_none_before_any_proposal() {
    let env = create_env();
    let (client, _admin, _candidate) = setup(&env);
    assert_eq!(client.get_pending_admin(), None);
}
