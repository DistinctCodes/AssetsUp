//! Emergency pause coverage ([SC-47]).
//!
//! A pause is only useful if it covers **every** mutating entrypoint. One
//! unguarded function defeats the entire control during an incident.
//!
//! Before this change the pause covered four registry entrypoints out of
//! roughly thirty-five. Tokenization, dividends, voting, leasing, insurance and
//! detokenization all kept running while the contract was "paused".
//!
//! The important test here is [`every_mutating_entrypoint_is_covered`], which
//! is driven off the source rather than a hand-maintained list, so an
//! entrypoint added later without a guard fails the build rather than quietly
//! escaping the pause.

extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use super::helpers::{create_env, create_test_asset, initialize_contract};
use crate::AssetUpContractClient;

fn setup_paused(env: &Env) -> (AssetUpContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let client = initialize_contract(env, &admin);
    env.mock_all_auths();
    client.pause_contract();
    assert!(client.is_paused());
    (client, admin)
}

fn asset_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

// ---------------------------------------------------------------------------
// The guard rail: every mutating entrypoint must reference the pause
// ---------------------------------------------------------------------------

/// Entrypoints deliberately exempt from the pause, each with its reason.
///
/// Changing this list is a security decision. See `contracts/PAUSE.md`.
const PAUSE_EXEMPT: &[(&str, &str)] = &[
    ("initialize", "nothing exists to pause yet"),
    ("pause_contract", "the control itself"),
    (
        "unpause_contract",
        "the control itself; must work while paused",
    ),
    (
        "propose_admin",
        "incident response may require rotating a compromised admin key",
    ),
    ("accept_admin", "completes the rotation above"),
    ("cancel_admin_proposal", "withdraws the rotation above"),
    (
        "claim_dividends",
        "user exit path: freezing it would trap funds users have already earned",
    ),
    (
        "upgrade",
        "an upgrade is how you fix the incident that caused the pause",
    ),
    (
        "migrate",
        "must run after upgrade to bring storage up to date",
    ),
    (
        "storage_version",
        "read-only: returns the current storage layout version",
    ),
];

/// Reads never mutate, so they are not in scope for the pause.
fn is_read(name: &str) -> bool {
    name.starts_with("get_")
        || name.starts_with("is_")
        || name.starts_with("check_")
        || name.starts_with("has_")
        || name.starts_with("batch_get")
        || name == "proposal_passed"
}

#[test]
fn every_mutating_entrypoint_is_covered() {
    // Parsed from the source so a newly added entrypoint cannot slip past by
    // simply not being added to a list here.
    let source = include_str!("../lib.rs");

    let mut unguarded: std::vec::Vec<&str> = std::vec::Vec::new();
    let parts: std::vec::Vec<&str> = source.split("\n    pub fn ").collect();

    for part in parts.iter().skip(1) {
        let name = part.split('(').next().unwrap_or("").trim();
        if name.is_empty() || is_read(name) {
            continue;
        }
        if PAUSE_EXEMPT.iter().any(|(exempt, _)| *exempt == name) {
            continue;
        }

        // Only look at this function's own body: stop at the next entrypoint.
        let body = part;
        if !body.contains("require_not_paused") && !body.contains("ContractPaused") {
            unguarded.push(name);
        }
    }

    assert!(
        unguarded.is_empty(),
        "these mutating entrypoints do not check the pause guard: {unguarded:?}\n\
         Add `Self::require_not_paused(&env)?;`, or add the entrypoint to \
         PAUSE_EXEMPT with a written reason."
    );
}

// ---------------------------------------------------------------------------
// Behavioural checks across each area the pause previously missed
// ---------------------------------------------------------------------------

#[test]
fn registry_writes_are_blocked_while_paused() {
    let env = create_env();
    let (client, admin) = setup_paused(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 1);

    assert!(client
        .try_register_asset(&create_test_asset(&env, &owner, id.clone()), &admin)
        .is_err());
    assert!(client
        .try_transfer_asset_ownership(&id, &Address::generate(&env), &owner)
        .is_err());
    assert!(client.try_retire_asset(&id, &owner).is_err());
}

#[test]
fn registrar_changes_are_blocked_while_paused() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    let candidate = Address::generate(&env);

    assert!(client.try_add_authorized_registrar(&candidate).is_err());
    assert!(client.try_remove_authorized_registrar(&candidate).is_err());
}

#[test]
fn tokenization_is_blocked_while_paused() {
    // Previously fully operational during a pause.
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    let holder = Address::generate(&env);

    assert!(client
        .try_tokenize_asset(
            &1u64,
            &String::from_str(&env, "TKN"),
            &1000i128,
            &7u32,
            &1i128,
            &holder,
            &String::from_str(&env, "Token"),
            &String::from_str(&env, "A token"),
            &crate::types::AssetType::Physical,
        )
        .is_err());
    assert!(client.try_mint_tokens(&1u64, &10i128, &holder).is_err());
    assert!(client.try_burn_tokens(&1u64, &10i128, &holder).is_err());
    assert!(client
        .try_lock_tokens(&1u64, &holder, &100u64, &holder)
        .is_err());
    assert!(client.try_unlock_tokens(&1u64, &holder).is_err());
}

#[test]
fn dividends_and_voting_are_blocked_while_paused() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);

    assert!(client.try_distribute_dividends(&1u64, &100i128).is_err());
    assert!(client.try_enable_revenue_sharing(&1u64).is_err());
    assert!(client.try_disable_revenue_sharing(&1u64).is_err());
    assert!(client
        .try_cast_vote(&1u64, &1u64, &Address::generate(&env))
        .is_err());
}

#[test]
fn transfer_restrictions_are_blocked_while_paused() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    let who = Address::generate(&env);

    assert!(client.try_add_to_whitelist(&1u64, &who).is_err());
    assert!(client.try_remove_from_whitelist(&1u64, &who).is_err());
}

#[test]
fn leasing_is_blocked_while_paused() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    let id = asset_id(&env, 2);
    let who = Address::generate(&env);

    assert!(client.try_cancel_lease(&id, &who).is_err());
    assert!(client.try_expire_lease(&id).is_err());
}

#[test]
fn detokenization_is_blocked_while_paused() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);

    assert!(client
        .try_propose_detokenization(&1u64, &Address::generate(&env))
        .is_err());
    assert!(client.try_execute_detokenization(&1u64, &1u64).is_err());
}

// ---------------------------------------------------------------------------
// Reads and exemptions
// ---------------------------------------------------------------------------

#[test]
fn reads_still_work_while_paused() {
    // A pause that also blocks reads is an outage, not a safety control.
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let id = asset_id(&env, 3);
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    client.pause_contract();

    assert!(client.is_paused());
    assert_eq!(client.get_asset(&id).owner, owner);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_total_asset_count(), 1);
    assert!(client.check_asset_exists(&id));
    assert_eq!(client.get_assets_by_owner(&owner).len(), 1);
    let ids: Vec<BytesN<32>> = Vec::from_array(&env, [id]);
    assert_eq!(client.batch_get_asset_info(&ids).len(), 1);
}

#[test]
fn the_admin_transfer_flow_still_works_while_paused() {
    // Deliberate exemption: an incident may be *caused* by a compromised admin
    // key, so rotating it must not require unpausing first.
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    let successor = Address::generate(&env);

    client.propose_admin(&successor);
    assert_eq!(client.get_pending_admin(), Some(successor.clone()));

    client.accept_admin();
    assert_eq!(client.get_admin(), successor);
    assert!(client.is_paused(), "the pause must survive the rotation");
}

#[test]
fn unpausing_restores_normal_operation() {
    let env = create_env();
    let (client, admin) = setup_paused(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 4);

    assert!(client
        .try_register_asset(&create_test_asset(&env, &owner, id.clone()), &admin)
        .is_err());

    client.unpause_contract();

    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);
    assert_eq!(client.get_asset(&id).owner, owner);
}

#[test]
fn pausing_twice_is_harmless() {
    let env = create_env();
    let (client, _admin) = setup_paused(&env);
    client.pause_contract();
    assert!(client.is_paused());
}
