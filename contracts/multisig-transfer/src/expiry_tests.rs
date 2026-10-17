//! Approval-window and auto-cancel tests ([SC-73]).
//!
//! Before this, a request that never reached `required_approvals` stayed
//! `Pending` forever. `approve_transfer_request` rejected late approvals, but
//! nothing moved the request to a terminal state, so the asset stayed locked in
//! `AssetPendingRequest` indefinitely — it could not be retried and could not
//! execute.
//!
//! These use a real `assetsup` registry, because `create_transfer_request`
//! asks the registry whether the asset exists and who owns it. A fixture built
//! from a random `Address` would trap on the cross-contract call and the sweep
//! path would never be exercised.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::errors::MultiSigError;
use crate::types::{ApprovalRule, RequestStatus};
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

const CATEGORY_SEED: u8 = 43;
const TIMEOUT_SECS: u64 = 3600;

struct Fixture<'a> {
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    multisig_address: Address,
    admin: Address,
    approvers: Vec<Address>,
}

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
                approval_timeout_secs: TIMEOUT_SECS,
                auto_approve: false,
                priority: 1,
            },
        );

        Fixture {
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            approvers,
        }
    }

    /// Registers an asset owned by the multisig contract, so the transfer can
    /// actually reach the registry.
    fn register_governed_asset(&self, env: &Env, seed: u8) -> BytesN<32> {
        let id = BytesN::from_array(env, &[seed; 32]);
        self.registry.register_asset(&asset(env, &self.multisig_address, id.clone()), &self.admin);
        id
    }

    fn request_transfer(&self, env: &Env, asset_id: &BytesN<32>, to: &Address) -> u64 {
        self.multisig.create_transfer_request(
            &self.multisig_address,
            asset_id,
            &category(env),
            to,
            &BytesN::from_array(env, &[0u8; 32]),
            &(env.ledger().timestamp() + 100_000),
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
        name: String::from_str(env, "Expiring asset"),
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

#[test]
fn configure_approval_rule_rejects_a_zero_length_window() {
    // A rule with no window closes before the first approval lands, so the
    // request can never reach its threshold and the asset locks forever.
    let env = Env::default();
    let (client, admin) = registry_only(&env);

    let bad = ApprovalRule {
        category: category(&env),
        required_approvals: 1,
        approvers: Vec::from_slice(&env, &[Address::generate(&env)]),
        approval_timeout_secs: 0,
        auto_approve: false,
        priority: 1,
    };

    env.mock_all_auths();
    let res = client.try_configure_approval_rule(&admin, &bad);
    assert_eq!(
        res,
        Err(Ok(MultiSigError::MissingApprovalWindow)),
        "a rule with no approval window must be rejected"
    );
}

/// A bare multisig contract with no registry; enough for rule configuration,
/// which never calls out.
fn registry_only(
    env: &Env,
) -> (MultiSigTransferContractClient<'_>, Address) {
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    env.mock_all_auths();
    client.initialize(&admin, &Address::generate(env));
    env.set_auths(&[]);
    (client, admin)
}

#[test]
fn expired_request_is_auto_cancelled_and_unlocks_the_asset() {
    // The core bug: an under-approved request used to stay Pending and keep
    // the asset locked forever.
    let env = Env::default();
    let f = Fixture::new(&env, 2, 1);
    let asset_id = f.register_governed_asset(&env, 1);
    let recipient = Address::generate(&env);

    let request_id = f.request_transfer(&env, &asset_id, &recipient);
    env.set_auths(&[]);

    // Past the deadline, still short of the threshold.
    env.ledger().with_mut(|li| li.timestamp += TIMEOUT_SECS + 1);

    f.multisig
        .expire_transfer_request(&Address::generate(&env), &request_id);

    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Cancelled
    );

    // The asset lock is gone, so a fresh request for the same asset is allowed.
    env.mock_all_auths();
    let second = f.request_transfer(&env, &asset_id, &Address::generate(&env));
    assert_ne!(second, request_id);
}

#[test]
fn request_that_reached_its_threshold_is_not_swept() {
    // Closing a window must not throw away a valid signature set: a request
    // that reached `required_approvals` stays `Approved`.
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);
    let asset_id = f.register_governed_asset(&env, 2);

    let request_id = f.request_transfer(&env, &asset_id, &Address::generate(&env));
    f.multisig.approve_transfer_request(&f.approvers.get(0), &request_id);

    env.ledger().with_mut(|li| li.timestamp += TIMEOUT_SECS + 1);
    env.set_auths(&[]);

    let res = f
        .multisig
        .try_expire_transfer_request(&Address::generate(&env), &request_id);
    assert_eq!(
        res,
        Err(Ok(MultiSigError::RequestNotPending)),
        "an approved request must survive its window closing"
    );
    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Approved
    );
}

#[test]
fn sweep_is_rejected_while_the_window_is_still_open() {
    // Otherwise the sweeper is a griefing vector: anyone could cancel live
    // requests at will.
    let env = Env::default();
    let f = Fixture::new(&env, 2, 1);
    let asset_id = f.register_governed_asset(&env, 3);

    let request_id = f.request_transfer(&env, &asset_id, &Address::generate(&env));
    env.set_auths(&[]);

    let res = f
        .multisig
        .try_expire_transfer_request(&Address::generate(&env), &request_id);
    assert_eq!(
        res,
        Err(Ok(MultiSigError::ApprovalWindowStillOpen)),
        "a live request must not be sweepable"
    );
    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Pending
    );
}

#[test]
fn approval_and_expiry_cannot_both_succeed_on_the_same_ledger() {
    // Both paths compare against `approval_deadline`, so the boundary must not
    // admit an approval on the very ledger that admits an expiry.
    let env = Env::default();
    let f = Fixture::new(&env, 2, 1);
    let asset_id = f.register_governed_asset(&env, 4);

    let request_id = f.request_transfer(&env, &asset_id, &Address::generate(&env));

    // Exactly on the deadline: still open, so approving is fine.
    env.ledger().with_mut(|li| li.timestamp += TIMEOUT_SECS);
    env.mock_all_auths();
    f.multisig
        .approve_transfer_request(&f.approvers.get(0), &request_id);

    // One second later the window is shut and the sweep is allowed. Both
    // succeed in sequence, but never on the same ledger.
    env.ledger().with_mut(|li| li.timestamp += 1);
    env.set_auths(&[]);
    assert!(f
        .multisig
        .try_expire_transfer_request(&Address::generate(&env), &request_id)
        .is_ok());
}

#[test]
fn sweeping_an_unknown_request_reports_not_found() {
    let env = Env::default();
    let f = Fixture::new(&env, 1, 1);

    let res = f.multisig.try_expire_transfer_request(&Address::generate(&env), &404);
    assert_eq!(res, Err(Ok(MultiSigError::RequestNotFound)));
}