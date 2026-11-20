//! Two-step admin rotation tests (#1645).
//!
//! `init` stored `DataKey::Admin` and nothing could change it afterwards, so a
//! compromised admin key could never be replaced. The admin now rotates the way
//! `assetsup`'s does: `propose_admin`, then `accept_admin` by the nominee.
#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Events as _};
use soroban_sdk::{Address, Env, Symbol, TryIntoVal};

fn setup(env: &Env) -> (AssetMaintenanceContractClient<'_>, Address) {
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(env, &contract_id);
    let admin = Address::generate(env);

    env.mock_all_auths();
    client.init(&admin, &Address::generate(env));

    (client, admin)
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
    let (client, admin) = setup(&env);
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
fn admin_only_entrypoints_authorize_the_new_admin_after_rotation() {
    let env = Env::default();
    let (client, old_admin) = setup(&env);
    let new_admin = Address::generate(&env);
    client.propose_admin(&new_admin);
    client.accept_admin();

    // `propose_admin` takes its authorization from the *stored* admin, so after
    // rotation the authorization it asks for is the new admin's, not the old.
    client.propose_admin(&Address::generate(&env));

    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, new_admin);
    assert_ne!(auths[0].0, old_admin);
}

#[test]
fn accepting_requires_the_nominees_authorization() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let nominee = Address::generate(&env);
    client.propose_admin(&nominee);

    // The only authorization `accept_admin` records is the pending address's.
    client.accept_admin();
    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, nominee);

    // And with no authorization at all it fails and moves nothing.
    let (client, admin2) = setup(&env);
    client.propose_admin(&Address::generate(&env));
    env.set_auths(&[]);
    assert!(client.try_accept_admin().is_err());
    assert_eq!(client.get_admin(), admin2);
    assert_ne!(admin, admin2);
}

#[test]
fn proposing_requires_the_current_admins_authorization() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    env.set_auths(&[]);

    assert!(client.try_propose_admin(&Address::generate(&env)).is_err());
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn proposing_the_current_admin_is_rejected() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    assert_eq!(
        client.try_propose_admin(&admin),
        Err(Ok(Error::InvalidAdmin))
    );
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn accepting_with_no_proposal_in_flight_is_a_typed_error() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    assert_eq!(
        client.try_accept_admin(),
        Err(Ok(Error::NoPendingAdminProposal))
    );
}

#[test]
fn a_proposal_can_be_cancelled_and_then_cannot_be_accepted() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    client.propose_admin(&Address::generate(&env));
    client.cancel_admin_proposal();

    assert_eq!(client.get_pending_admin(), None);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(
        client.try_accept_admin(),
        Err(Ok(Error::NoPendingAdminProposal))
    );
}

#[test]
fn cancelling_with_no_proposal_in_flight_is_a_typed_error() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    assert_eq!(
        client.try_cancel_admin_proposal(),
        Err(Ok(Error::NoPendingAdminProposal))
    );
}

#[test]
fn a_new_proposal_replaces_the_one_in_flight() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
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
    let (client, _admin) = setup(&env);
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
fn rotation_before_initialization_is_a_typed_error() {
    let env = Env::default();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);
    env.mock_all_auths();

    assert_eq!(
        client.try_propose_admin(&Address::generate(&env)),
        Err(Ok(Error::NotInitialized))
    );
    assert_eq!(
        client.try_cancel_admin_proposal(),
        Err(Ok(Error::NotInitialized))
    );
    assert_eq!(client.try_get_admin(), Err(Ok(Error::NotInitialized)));
}
