//! Authorization tests ([SC-42]).
//!
//! Every test here runs **without** `mock_all_auths`, which is the only way to
//! prove an entrypoint actually authenticates. With auths mocked, an entrypoint
//! that never calls `require_auth` is indistinguishable from one that does.
//!
//! The regression these guard against: `register_asset`,
//! `update_asset_metadata`, `transfer_asset_ownership` and `retire_asset` each
//! take a `caller: Address` and compare it against a registrar allowlist, the
//! asset owner, or the admin — but originally never called
//! `caller.require_auth()`. Because `caller` is supplied by whoever builds the
//! transaction, the comparison could be satisfied by simply naming a privileged
//! address. `transfer_asset_ownership` was a direct asset-theft path.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{Address, BytesN, Env, IntoVal, String, Vec};

use super::helpers::{create_env, create_test_asset, register_asset_for};
use crate::error::Error;
use crate::{AssetUpContract, AssetUpContractClient};

/// Registers the contract and initializes it, then clears the mocked auths so
/// every subsequent call must carry real authorization.
fn setup_unmocked(env: &Env) -> (AssetUpContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(env, &contract_id);

    env.mock_all_auths();
    client.initialize(&admin);
    env.set_auths(&[]);

    (client, admin)
}

fn asset_id(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

#[test]
fn initialize_requires_the_admins_authorization() {
    let env = create_env();
    let admin = Address::generate(&env);
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);

    let res = client.try_initialize(&admin);
    assert!(
        res.is_err(),
        "initialize must not succeed without the admin's authorization"
    );
}

// ---------------------------------------------------------------------------
// register_asset
// ---------------------------------------------------------------------------

#[test]
fn register_asset_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let asset = create_test_asset(&env, &owner, asset_id(&env, 1));

    // `admin` is an authorized registrar, but this call carries no signature
    // from them.
    let res = client.try_register_asset(&asset, &admin);
    assert!(
        res.is_err(),
        "naming an authorized registrar must not be enough to register an asset"
    );
}

#[test]
fn register_asset_succeeds_once_the_caller_authenticates() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 2);
    let asset = create_test_asset(&env, &owner, id.clone());

    env.mock_all_auths();
    client.register_asset(&asset, &admin);

    assert_eq!(client.get_asset(&id).owner, owner);
}

// ---------------------------------------------------------------------------
// transfer_asset_ownership — the asset-theft path
// ---------------------------------------------------------------------------

#[test]
fn transfer_asset_ownership_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 3);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    // An attacker names the real owner as `caller` and tries to move the asset
    // to themselves. Without authentication this would succeed.
    env.set_auths(&[]);
    let attacker = Address::generate(&env);
    let res = client.try_transfer_asset_ownership(&id, &attacker, &owner);

    assert!(
        res.is_err(),
        "naming the owner must not be enough to transfer their asset"
    );
    assert_eq!(
        client.get_asset(&id).owner,
        owner,
        "ownership must be unchanged after the rejected transfer"
    );
}

#[test]
fn transfer_asset_ownership_succeeds_for_the_authenticated_owner() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let id = asset_id(&env, 4);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);
    client.transfer_asset_ownership(&id, &new_owner, &owner);

    assert_eq!(client.get_asset(&id).owner, new_owner);
}

// ---------------------------------------------------------------------------
// update_asset_metadata
// ---------------------------------------------------------------------------

#[test]
fn update_asset_metadata_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 5);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    env.set_auths(&[]);
    let res = client.try_update_asset_metadata(
        &id,
        &Some(String::from_str(&env, "rewritten")),
        &None,
        &None,
        &owner,
    );

    assert!(
        res.is_err(),
        "naming the owner must not be enough to rewrite their asset's metadata"
    );
}

// ---------------------------------------------------------------------------
// retire_asset
// ---------------------------------------------------------------------------

#[test]
fn retire_asset_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 6);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    env.set_auths(&[]);
    let res = client.try_retire_asset(&id, &owner);

    assert!(
        res.is_err(),
        "naming the owner must not be enough to retire their asset"
    );
    assert_eq!(
        client.get_asset(&id).status,
        crate::types::AssetStatus::Active,
        "the asset must still be active after the rejected retire"
    );
}

// ---------------------------------------------------------------------------
// Admin-gated entrypoints
// ---------------------------------------------------------------------------

#[test]
fn admin_transfer_requires_the_current_admins_authorization() {
    // Admin transfer is two-step ([SC-48]): the current admin nominates, and
    // the incoming address accepts. Both halves must be authenticated, or the
    // two-step flow would be no safer than the single-step one it replaced.
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let usurper = Address::generate(&env);

    let res = client.try_propose_admin(&usurper);
    assert!(
        res.is_err(),
        "nominating a new admin must require the current admin's auth"
    );
    assert_eq!(
        client.get_pending_admin(),
        None,
        "the rejected proposal must not have been recorded"
    );
    assert_eq!(client.get_admin(), admin, "the admin must be unchanged");
}

#[test]
fn accepting_an_admin_transfer_requires_the_incoming_addresss_authorization() {
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let successor = Address::generate(&env);

    env.mock_all_auths();
    client.propose_admin(&successor);

    env.set_auths(&[]);
    let res = client.try_accept_admin();

    assert!(
        res.is_err(),
        "acceptance must be signed by the incoming address"
    );
    assert_eq!(
        client.get_admin(),
        admin,
        "an unaccepted proposal must leave the original admin in place"
    );
}

#[test]
fn add_authorized_registrar_requires_the_admins_authorization() {
    let env = create_env();
    let (client, _admin) = setup_unmocked(&env);
    let candidate = Address::generate(&env);

    let res = client.try_add_authorized_registrar(&candidate);
    assert!(
        res.is_err(),
        "granting registrar rights must require the admin's auth"
    );
    // And the grant must not have taken effect.
    assert!(!client.is_authorized_registrar(&candidate));
}

#[test]
fn remove_authorized_registrar_requires_the_admins_authorization() {
    let env = create_env();
    let (client, _admin) = setup_unmocked(&env);
    let candidate = Address::generate(&env);

    env.mock_all_auths();
    client.add_authorized_registrar(&candidate);
    assert!(client.is_authorized_registrar(&candidate));

    env.set_auths(&[]);
    let res = client.try_remove_authorized_registrar(&candidate);
    assert!(
        res.is_err(),
        "revoking registrar rights must require the admin's auth"
    );
    assert!(client.is_authorized_registrar(&candidate));
}

#[test]
fn pause_and_unpause_require_the_admins_authorization() {
    let env = create_env();
    let (client, _admin) = setup_unmocked(&env);

    assert!(
        client.try_pause_contract().is_err(),
        "pause must require the admin's auth"
    );
    assert!(!client.is_paused());

    env.mock_all_auths();
    client.pause_contract();
    assert!(client.is_paused());

    env.set_auths(&[]);
    assert!(
        client.try_unpause_contract().is_err(),
        "unpause must require the admin's auth"
    );
    assert!(client.is_paused(), "the contract must still be paused");
}

// ---------------------------------------------------------------------------
// Reads stay open
// ---------------------------------------------------------------------------

#[test]
fn read_entrypoints_do_not_require_authorization() {
    // The audit is only useful if it distinguishes "protected" from "locked
    // down"; reads must stay callable by anyone.
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let id = asset_id(&env, 7);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);
    env.set_auths(&[]);

    assert_eq!(client.get_asset(&id).owner, owner);
    assert!(client.check_asset_exists(&id));
    assert_eq!(client.get_total_asset_count(), 1);
    assert_eq!(client.get_admin(), admin);
    assert!(!client.is_paused());
    assert_eq!(client.get_assets_by_owner(&owner).len(), 1);
    assert_eq!(client.get_asset_info(&id).id, id);

    let ids: Vec<BytesN<32>> = Vec::from_array(&env, [id.clone()]);
    assert_eq!(client.batch_get_asset_info(&ids).len(), 1);
}

// ---------------------------------------------------------------------------
// The auth is bound to the right principal, not just "some" auth
// ---------------------------------------------------------------------------

#[test]
fn a_third_party_signature_does_not_authorize_a_transfer() {
    // `mock_auths` grants exactly one address's authorization. An attacker who
    // can sign for themselves must still not be able to move someone else's
    // asset by naming the owner as `caller`.
    let env = create_env();
    let (client, admin) = setup_unmocked(&env);
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);
    let id = asset_id(&env, 8);

    env.mock_all_auths();
    client.register_asset(&create_test_asset(&env, &owner, id.clone()), &admin);

    env.set_auths(&[soroban_sdk::testutils::MockAuth {
        address: &attacker,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &client.address,
            fn_name: "transfer_asset_ownership",
            args: (id.clone(), attacker.clone(), owner.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }
    .into()]);

    let res = client.try_transfer_asset_ownership(&id, &attacker, &owner);
    assert!(
        res.is_err(),
        "the attacker's own signature must not authorize the owner's transfer"
    );
    assert_eq!(client.get_asset(&id).owner, owner);
}

// ---------------------------------------------------------------------------
// Restriction and lock entrypoints (#1789, #1788, #1787, #1782)
//
// These entrypoints used to call require_not_paused but never authenticated
// anyone; the module functions they delegate to contain no require_auth. Each
// now takes `caller` last and routes it through the shared
// `require_asset_admin_or_tokenizer` helper. The tests below cover both halves:
// an unmocked call (no signature at all) and a mock_all_auths call by a
// well-signed intruder (authentication is not the same as authorization).
// ---------------------------------------------------------------------------

/// Register and tokenize a fresh asset, then clear all mocked auths so every
/// subsequent call must carry a real signature.
///
/// Returns `(client, admin, tokenizer, holder)`.
fn setup_restricted_unmocked(
    env: &Env,
) -> (AssetUpContractClient<'_>, Address, Address, Address) {
    let (client, admin) = setup_unmocked(env);
    let tokenizer = Address::generate(env);
    let holder = Address::generate(env);

    env.mock_all_auths();
    let registry_id = register_asset_for(env, &client, &admin, &tokenizer, 21);
    client.tokenize_asset(
        &21u64,
        &registry_id,
        &String::from_str(env, "AUTH"),
        &1_000i128,
        &0u32,
        &0i128,
        &tokenizer,
        &String::from_str(env, "Auth Token"),
        &String::from_str(env, "Authorization test token"),
        &crate::types::AssetType::Physical,
    );
    env.set_auths(&[]);

    (client, admin, tokenizer, holder)
}

// -- #1789 set_geographic_restriction ---------------------------------------

#[test]
fn set_geographic_restriction_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, _admin, _tokenizer, _holder) = setup_restricted_unmocked(&env);
    let jurisdictions = Vec::from_array(&env, [String::from_str(&env, "US")]);
    let intruder = Address::generate(&env);

    // Naming a caller without their signature must not be enough.
    assert!(client
        .try_set_geographic_restriction(&21u64, &jurisdictions, &intruder)
        .is_err());
}

#[test]
fn set_geographic_restriction_rejects_an_authenticated_non_admin() {
    let env = create_env();
    let (client, _admin, _tokenizer, _holder) = setup_restricted_unmocked(&env);
    let jurisdictions = Vec::from_array(&env, [String::from_str(&env, "US")]);
    let intruder = Address::generate(&env);

    env.mock_all_auths();
    assert!(matches!(
        client.try_set_geographic_restriction(&21u64, &jurisdictions, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn set_geographic_restriction_succeeds_for_the_tokenizer() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder) = setup_restricted_unmocked(&env);
    let jurisdictions = Vec::from_array(&env, [String::from_str(&env, "US")]);

    env.mock_all_auths();
    assert!(client
        .try_set_geographic_restriction(&21u64, &jurisdictions, &tokenizer)
        .is_ok());
}

// -- #1788 add_to_whitelist / remove_from_whitelist --------------------------

#[test]
fn whitelist_writes_reject_an_unauthenticated_caller() {
    let env = create_env();
    let (client, _admin, _tokenizer, holder) = setup_restricted_unmocked(&env);

    assert!(client
        .try_add_to_whitelist(&21u64, &holder, &holder)
        .is_err());
    assert!(client
        .try_remove_from_whitelist(&21u64, &holder, &holder)
        .is_err());
}

#[test]
fn whitelist_writes_reject_an_authenticated_non_admin() {
    let env = create_env();
    let (client, _admin, _tokenizer, holder) = setup_restricted_unmocked(&env);
    let intruder = Address::generate(&env);

    env.mock_all_auths();
    assert!(matches!(
        client.try_add_to_whitelist(&21u64, &holder, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
    assert!(matches!(
        client.try_remove_from_whitelist(&21u64, &holder, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn whitelist_writes_succeed_for_the_tokenizer() {
    let env = create_env();
    let (client, _admin, tokenizer, holder) = setup_restricted_unmocked(&env);

    env.mock_all_auths();
    client.add_to_whitelist(&21u64, &holder, &tokenizer);
    assert!(client.is_whitelisted(&21u64, &holder));

    client.remove_from_whitelist(&21u64, &holder, &tokenizer);
    assert!(!client.is_whitelisted(&21u64, &holder));
}

// -- #1787 set_transfer_restriction -----------------------------------------

#[test]
fn set_transfer_restriction_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, _admin, _tokenizer, _holder) = setup_restricted_unmocked(&env);
    let intruder = Address::generate(&env);

    assert!(client
        .try_set_transfer_restriction(&21u64, &true, &intruder)
        .is_err());
}

#[test]
fn set_transfer_restriction_rejects_an_authenticated_non_admin() {
    let env = create_env();
    let (client, _admin, _tokenizer, _holder) = setup_restricted_unmocked(&env);
    let intruder = Address::generate(&env);

    env.mock_all_auths();
    assert!(matches!(
        client.try_set_transfer_restriction(&21u64, &true, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
}

#[test]
fn set_transfer_restriction_succeeds_for_the_tokenizer() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder) = setup_restricted_unmocked(&env);

    env.mock_all_auths();
    assert!(client
        .try_set_transfer_restriction(&21u64, &true, &tokenizer)
        .is_ok());
}

// -- #1782 unlock_tokens ----------------------------------------------------

#[test]
fn unlock_tokens_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, _admin, tokenizer, holder) = setup_restricted_unmocked(&env);
    let intruder = Address::generate(&env);

    env.mock_all_auths();
    client.lock_tokens(&21u64, &holder, &1_000u64, &tokenizer);
    env.set_auths(&[]);

    assert!(client
        .try_unlock_tokens(&21u64, &holder, &intruder)
        .is_err());
    assert!(client.is_tokens_locked(&21u64, &holder));
}

#[test]
fn unlock_tokens_rejects_an_authenticated_non_admin() {
    let env = create_env();
    let (client, _admin, tokenizer, holder) = setup_restricted_unmocked(&env);
    let intruder = Address::generate(&env);

    env.mock_all_auths();
    client.lock_tokens(&21u64, &holder, &1_000u64, &tokenizer);

    assert!(matches!(
        client.try_unlock_tokens(&21u64, &holder, &intruder),
        Err(Ok(Error::Unauthorized))
    ));
    assert!(client.is_tokens_locked(&21u64, &holder));
}

#[test]
fn unlock_tokens_succeeds_for_the_tokenizer() {
    let env = create_env();
    let (client, _admin, tokenizer, holder) = setup_restricted_unmocked(&env);

    env.mock_all_auths();
    client.lock_tokens(&21u64, &holder, &1_000u64, &tokenizer);
    assert!(client.is_tokens_locked(&21u64, &holder));

    client.unlock_tokens(&21u64, &holder, &tokenizer);
    assert!(!client.is_tokens_locked(&21u64, &holder));
}
