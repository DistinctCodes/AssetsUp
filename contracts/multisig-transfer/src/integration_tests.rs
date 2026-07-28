//! Cross-contract integration tests ([SC-51]).
//!
//! Every other test in this workspace exercises one contract in isolation. The
//! seams between them were untested — and untested seams is exactly why
//! `registry.rs` shipped as a set of placeholders that reported success without
//! doing anything. `transfer_owner` returned `Ok(())` having moved nothing, so
//! a per-crate test of `execute_transfer` passed while the asset never changed
//! hands.
//!
//! These register the **real** `assetsup` registry alongside this contract in a
//! single `Env`, so a call that claims to move ownership has to actually move
//! it in the other contract's storage.
//!
//! ## Adding a case
//!
//! [`Fixture::new`] wires both contracts together and returns the clients. The
//! registry is initialized with the multisig contract as an authorized
//! registrar, and assets governed by the workflow are registered **owned by the
//! multisig contract's address** — see `registry.rs` for why that ownership
//! model is required.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

struct Fixture<'a> {
    env: Env,
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    /// The multisig contract's own address; governed assets are owned by it.
    multisig_address: Address,
    admin: Address,
    approvers: Vec<Address>,
}

const CATEGORY_SEED: u8 = 42;

impl<'a> Fixture<'a> {
    fn new(env: &'a Env, required_approvals: u32, approver_count: u32) -> Fixture<'a> {
        let admin = Address::generate(env);

        let registry_id = env.register(AssetUpContract, ());
        let registry = AssetUpContractClient::new(env, &registry_id);

        let multisig_id = env.register(MultiSigTransferContract, ());
        let multisig = MultiSigTransferContractClient::new(env, &multisig_id);

        env.mock_all_auths();

        registry.initialize(&admin);
        multisig.initialize(&admin, &registry_id);

        // The multisig contract must be able to register and move assets in
        // the registry.
        registry.add_authorized_registrar(&multisig_id);

        let mut approvers = Vec::new(env);
        for _ in 0..approver_count {
            approvers.push_back(Address::generate(env));
        }

        multisig.configure_approval_rule(
            &admin,
            &ApprovalRule {
                category: category(env),
                required_approvals,
                approvers: approvers.clone(),
                approval_timeout_secs: 86_400,
                auto_approve: false,
                priority: 1,
            },
        );

        Fixture {
            env: env.clone(),
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            approvers,
        }
    }

    /// Registers an asset in the registry owned by the multisig contract.
    fn register_governed_asset(&self, seed: u8) -> BytesN<32> {
        let id = BytesN::from_array(&self.env, &[seed; 32]);
        self.registry.register_asset(
            &asset(&self.env, &self.multisig_address, id.clone()),
            &self.admin,
        );
        id
    }

    fn request_transfer(&self, asset_id: &BytesN<32>, to: &Address) -> u64 {
        self.multisig.create_transfer_request(
            &self.multisig_address,
            asset_id,
            &category(&self.env),
            to,
            &BytesN::from_array(&self.env, &[0u8; 32]),
            &(self.env.ledger().timestamp() + 100_000),
            &None,
        )
    }
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[CATEGORY_SEED; 32])
}

fn asset(env: &Env, owner: &Address, id: BytesN<32>) -> assetsup::asset::Asset {
    let timestamp = env.ledger().timestamp();
    assetsup::asset::Asset {
        id,
        name: String::from_str(env, "High-value asset"),
        description: String::from_str(env, "Governed by multisig approval"),
        category: String::from_str(env, "Machinery"),
        owner: owner.clone(),
        registration_timestamp: timestamp,
        last_transfer_timestamp: timestamp,
        status: assetsup::AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://asset"),
        purchase_value: 500_000,
        custom_attributes: Vec::new(env),
    }
}

// ---------------------------------------------------------------------------
// Flow 1: register -> request -> approve to threshold -> ownership moves
// ---------------------------------------------------------------------------

#[test]
fn a_fully_approved_transfer_moves_ownership_in_the_registry() {
    let env = Env::default();
    let f = Fixture::new(&env, 2, 3);

    let asset_id = f.register_governed_asset(1);
    let recipient = Address::generate(&env);

    assert_eq!(
        f.registry.get_asset(&asset_id).owner,
        f.multisig_address,
        "the asset starts owned by the governing contract"
    );

    let request_id = f.request_transfer(&asset_id, &recipient);

    f.multisig
        .approve_transfer_request(&f.approvers.get(0).unwrap(), &request_id);
    f.multisig
        .approve_transfer_request(&f.approvers.get(1).unwrap(), &request_id);

    f.multisig.execute_transfer(&f.admin, &request_id);

    // The assertion the stubbed registry made impossible: ownership actually
    // changed in the *other* contract.
    assert_eq!(
        f.registry.get_asset(&asset_id).owner,
        recipient,
        "execute_transfer must move ownership in the registry, not just report success"
    );
}

// ---------------------------------------------------------------------------
// Flow 2: threshold not reached leaves no partial state anywhere
// ---------------------------------------------------------------------------

#[test]
fn a_transfer_below_the_threshold_leaves_ownership_unchanged() {
    let env = Env::default();
    let f = Fixture::new(&env, 3, 3);

    let asset_id = f.register_governed_asset(2);
    let recipient = Address::generate(&env);
    let request_id = f.request_transfer(&asset_id, &recipient);

    // One approval short.
    f.multisig
        .approve_transfer_request(&f.approvers.get(0).unwrap(), &request_id);
    f.multisig
        .approve_transfer_request(&f.approvers.get(1).unwrap(), &request_id);

    let result = f.multisig.try_execute_transfer(&f.admin, &request_id);
    assert!(result.is_err(), "execution below the threshold must fail");

    assert_eq!(
        f.registry.get_asset(&asset_id).owner,
        f.multisig_address,
        "a failed execution must leave ownership untouched"
    );

    // And no partial state in the multisig contract either: the request is
    // still pending and can still be completed.
    f.multisig
        .approve_transfer_request(&f.approvers.get(2).unwrap(), &request_id);
    f.multisig.execute_transfer(&f.admin, &request_id);

    assert_eq!(f.registry.get_asset(&asset_id).owner, recipient);
}

// ---------------------------------------------------------------------------
// Flow 3: an unauthorized actor is rejected at the approval boundary
// ---------------------------------------------------------------------------

#[test]
fn an_unauthorized_approver_is_rejected_and_cannot_reach_the_threshold() {
    let env = Env::default();
    let f = Fixture::new(&env, 2, 2);

    let asset_id = f.register_governed_asset(3);
    let recipient = Address::generate(&env);
    let request_id = f.request_transfer(&asset_id, &recipient);

    let stranger = Address::generate(&env);
    let result = f
        .multisig
        .try_approve_transfer_request(&stranger, &request_id);
    assert!(
        result.is_err(),
        "an address outside the approver set must be rejected"
    );

    // One legitimate approval is not enough on its own.
    f.multisig
        .approve_transfer_request(&f.approvers.get(0).unwrap(), &request_id);

    assert!(
        f.multisig
            .try_execute_transfer(&f.admin, &request_id)
            .is_err(),
        "the rejected approval must not have counted toward the threshold"
    );
    assert_eq!(
        f.registry.get_asset(&asset_id).owner,
        f.multisig_address,
        "ownership must be unchanged"
    );
}

// ---------------------------------------------------------------------------
// Flow 4: the registry is genuinely consulted, not assumed
// ---------------------------------------------------------------------------

#[test]
fn a_request_for_an_unregistered_asset_is_rejected() {
    // The stubbed asset_exists returned `true` unconditionally, so this case
    // silently succeeded against an asset that did not exist.
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let missing = BytesN::from_array(&env, &[99u8; 32]);
    let result = f.multisig.try_create_transfer_request(
        &f.multisig_address,
        &missing,
        &category(&env),
        &Address::generate(&env),
        &BytesN::from_array(&env, &[0u8; 32]),
        &(env.ledger().timestamp() + 100_000),
        &None,
    );

    assert!(
        result.is_err(),
        "the registry must be consulted for existence"
    );
}

#[test]
fn a_request_for_a_retired_asset_is_rejected() {
    // asset_is_retired previously returned `false` unconditionally.
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let asset_id = f.register_governed_asset(4);
    f.registry.retire_asset(&asset_id, &f.multisig_address);

    let result = f.multisig.try_create_transfer_request(
        &f.multisig_address,
        &asset_id,
        &category(&env),
        &Address::generate(&env),
        &BytesN::from_array(&env, &[0u8; 32]),
        &(env.ledger().timestamp() + 100_000),
        &None,
    );

    assert!(result.is_err(), "a retired asset must not be transferable");
}

#[test]
fn a_non_owner_cannot_raise_a_transfer_request() {
    // The ownership check was skipped entirely while the registry was stubbed,
    // so anyone could raise a request against any asset.
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let asset_id = f.register_governed_asset(5);
    let stranger = Address::generate(&env);

    let result = f.multisig.try_create_transfer_request(
        &stranger,
        &asset_id,
        &category(&env),
        &Address::generate(&env),
        &BytesN::from_array(&env, &[0u8; 32]),
        &(env.ledger().timestamp() + 100_000),
        &None,
    );

    assert!(
        result.is_err(),
        "only the asset's owner or the admin may raise a request"
    );
}

// ---------------------------------------------------------------------------
// Flow 5: the audit trail spans both contracts
// ---------------------------------------------------------------------------

#[test]
fn a_completed_transfer_is_visible_in_both_contracts() {
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let asset_id = f.register_governed_asset(6);
    let recipient = Address::generate(&env);
    let request_id = f.request_transfer(&asset_id, &recipient);

    f.multisig
        .approve_transfer_request(&f.approvers.get(0).unwrap(), &request_id);
    f.multisig.execute_transfer(&f.admin, &request_id);

    // Registry side: the new owner, and the asset listed under them.
    assert_eq!(f.registry.get_asset(&asset_id).owner, recipient);
    assert_eq!(f.registry.get_assets_by_owner(&recipient).len(), 1);

    // Multisig side: the request records this asset in its history.
    let history = f.multisig.get_asset_history(&asset_id);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap(), request_id);
}

#[test]
fn two_assets_are_governed_independently() {
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let first = f.register_governed_asset(7);
    let second = f.register_governed_asset(8);
    let recipient = Address::generate(&env);

    let request_id = f.request_transfer(&first, &recipient);
    f.multisig
        .approve_transfer_request(&f.approvers.get(0).unwrap(), &request_id);
    f.multisig.execute_transfer(&f.admin, &request_id);

    assert_eq!(f.registry.get_asset(&first).owner, recipient);
    assert_eq!(
        f.registry.get_asset(&second).owner,
        f.multisig_address,
        "an unrelated asset must be untouched"
    );
}
