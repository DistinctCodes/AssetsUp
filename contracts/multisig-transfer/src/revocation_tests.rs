//! Revoked-signer tests ([SC-76]).
//!
//! `auth_tests.rs` covers who may call an entrypoint, but it does not cover a
//! signer whose authorization was **revoked after the fact**. That gap matters
//! because the approver set is mutable at runtime: `configure_approval_rule`
//! replaces `ApprovalRule.approvers` wholesale, so a compromised signer can be
//! removed while a request they were named on is still open.
//!
//! ## The stale reference
//!
//! `create_transfer_request` snapshots the rule's approvers into
//! `PendingApprovals` so "requests waiting on me" can be listed cheaply. That
//! snapshot is a *convenience index*, not the authorization source. If approval
//! were checked against it, revoking a signer would be defeated by any request
//! that happened to be raised before the revocation.
//!
//! These tests pin down that `approve_transfer_request` re-reads the **live**
//! rule instead, so revocation is effective immediately and retroactively for
//! every still-pending request.
//!
//! The reverse case is pinned too: revocation is prospective only. An approval
//! already counted towards a threshold is not undone, because silently
//! discarding a valid signature set would make an approved transfer
//! un-executable for reasons no participant could observe.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::errors::MultiSigError;
use crate::types::{ApprovalRule, RequestStatus};
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

const CATEGORY_SEED: u8 = 45;
const TIMEOUT_SECS: u64 = 3600;

struct Fixture<'a> {
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    multisig_address: Address,
    admin: Address,
    /// The signer that gets revoked part-way through a test.
    revoked: Address,
    /// A second signer, kept so a rule can stay satisfiable.
    retained: Address,
}

impl<'a> Fixture<'a> {
    fn new(env: &'a Env, required_approvals: u32) -> Fixture<'a> {
        let admin = Address::generate(env);

        let registry_id = env.register(AssetUpContract, ());
        let registry = AssetUpContractClient::new(env, &registry_id);

        let multisig_id = env.register(MultiSigTransferContract, ());
        let multisig = MultiSigTransferContractClient::new(env, &multisig_id);

        env.mock_all_auths();
        registry.initialize(&admin);
        multisig.initialize(&admin, &registry_id);
        registry.add_authorized_registrar(&multisig_id);

        let revoked = Address::generate(env);
        let retained = Address::generate(env);

        multisig.configure_approval_rule(
            &admin,
            &rule(env, required_approvals, &[revoked.clone(), retained.clone()]),
        );

        Fixture {
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            revoked,
            retained,
        }
    }

    fn register_governed_asset(&self, env: &Env, seed: u8) -> BytesN<32> {
        let id = BytesN::from_array(env, &[seed; 32]);
        self.registry.register_asset(
            &asset(env, &self.multisig_address, id.clone()),
            &self.admin,
        );
        id
    }

    fn request_transfer(&self, env: &Env, seed: u8) -> u64 {
        let asset_id = self.register_governed_asset(env, seed);
        self.multisig.create_transfer_request(
            &self.multisig_address,
            &asset_id,
            &category(env),
            &Address::generate(env),
            &BytesN::from_array(env, &[0u8; 32]),
            &(env.ledger().timestamp() + 100_000),
            &None,
        )
    }

    /// The admin narrows the rule's approver set, dropping `gone`.
    fn revoke(&self, env: &Env, required_approvals: u32, kept: &[Address]) {
        self.multisig
            .configure_approval_rule(&self.admin, &rule(env, required_approvals, kept));
    }
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[CATEGORY_SEED; 32])
}

fn rule(env: &Env, required_approvals: u32, approvers: &[Address]) -> ApprovalRule {
    ApprovalRule {
        category: category(env),
        required_approvals,
        approvers: Vec::from_slice(env, approvers),
        approval_timeout_secs: TIMEOUT_SECS,
        auto_approve: false,
        priority: 1,
    }
}

fn asset(env: &Env, owner: &Address, id: BytesN<32>) -> assetsup::asset::Asset {
    let timestamp = env.ledger().timestamp();
    assetsup::asset::Asset {
        id,
        name: String::from_str(env, "Revocation asset"),
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
// The stale-reference case the issue is about
// ---------------------------------------------------------------------------

#[test]
fn a_revoked_signer_cannot_approve_using_a_stale_pending_reference() {
    // `PendingApprovals` still lists the revoked signer, because the snapshot
    // was taken when the request was raised. If approval were authorized
    // against that snapshot, revocation would be defeated by every request that
    // happened to predate it.
    let env = Env::default();
    let f = Fixture::new(&env, 2);
    let request_id = f.request_transfer(&env, 1);

    // The revoked signer is still listed as pending on this request.
    assert_eq!(
        f.multisig
            .get_pending_transfers_approver(&f.revoked, &0, &0)
            .len(),
        1,
        "the signer must still appear in the stale pending index"
    );

    f.revoke(&env, 2, &[f.retained.clone()]);

    let res = f.multisig.try_approve_transfer_request(&f.revoked, &request_id);
    assert_eq!(
        res,
        Err(Ok(MultiSigError::ApproverNotAuthorized)),
        "a revoked signer must not be able to approve via a stale reference"
    );

    // And the approval must not have been recorded.
    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Pending
    );
}

#[test]
fn a_revoked_signer_cannot_approve_a_second_time() {
    // Revocation between two approvals from the same signer.
    let env = Env::default();
    let f = Fixture::new(&env, 2);
    let request_id = f.request_transfer(&env, 2);

    f.multisig.approve_transfer_request(&f.revoked, &request_id);

    f.revoke(&env, 2, &[f.retained.clone()]);

    let res = f.multisig.try_approve_transfer_request(&f.revoked, &request_id);
    assert_eq!(res, Err(Ok(MultiSigError::ApproverNotAuthorized)));
}

// ---------------------------------------------------------------------------
// The boundary: revocation is prospective, not retroactive
// ---------------------------------------------------------------------------

#[test]
fn revocation_does_not_undo_an_approval_already_counted() {
    // Discarding a signature that was valid when it was given would make an
    // approved transfer un-executable for reasons no participant could observe.
    // Revocation governs *future* approvals only.
    let env = Env::default();
    let f = Fixture::new(&env, 1);
    let request_id = f.request_transfer(&env, 3);

    f.multisig.approve_transfer_request(&f.revoked, &request_id);
    f.revoke(&env, 1, &[f.retained.clone()]);

    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Approved,
        "an approval given while the signer was authorized must survive revocation"
    );
}

#[test]
fn revoking_a_signer_leaves_the_retained_signer_working() {
    // The point of revocation is to be able to carry on without them.
    let env = Env::default();
    let f = Fixture::new(&env, 1);
    let request_id = f.request_transfer(&env, 4);

    f.revoke(&env, 1, &[f.retained.clone()]);
    f.multisig.approve_transfer_request(&f.retained, &request_id);

    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Approved
    );
}

// ---------------------------------------------------------------------------
// Liveness: revocation can strand a request
// ---------------------------------------------------------------------------

#[test]
fn a_request_whose_threshold_can_no_longer_be_reached_stays_pending() {
    // Revoking enough signers leaves the remaining ones unable to reach the
    // threshold. That is a real operational hazard and worth pinning: the
    // request must not quietly approve itself, and must not silently execute.
    let env = Env::default();
    let f = Fixture::new(&env, 2);
    let request_id = f.request_transfer(&env, 5);

    // Only one signer remains but the threshold is still two.
    f.revoke(&env, 2, &[f.retained.clone()]);
    f.multisig.approve_transfer_request(&f.retained, &request_id);

    let request = f.multisig.get_request(&request_id);
    assert_eq!(request.status, RequestStatus::Pending);
    assert_eq!(request.received_approvals, 1);
    assert_eq!(request.required_approvals, 2);

    // And it therefore cannot be executed either.
    let res = f.multisig.try_execute_transfer(&Address::generate(&env), &request_id);
    assert_eq!(res, Err(Ok(MultiSigError::NotEnoughApprovals)));
}

#[test]
fn lowering_the_rule_threshold_does_not_reach_an_existing_request() {
    // A request snapshots `required_approvals` when it is raised, so editing the
    // rule afterwards cannot move a live request's bar. That is the right
    // default -- a threshold the requester never agreed to would be a different
    // contract -- but it means the recovery path is cancel and re-raise, not
    // just editing the rule. Pinned here so the limitation is visible.
    let env = Env::default();
    let f = Fixture::new(&env, 2);
    let request_id = f.request_transfer(&env, 6);

    // Revoke a signer *and* lower the rule's threshold to match.
    f.revoke(&env, 1, &[f.retained.clone()]);
    f.multisig.approve_transfer_request(&f.retained, &request_id);

    assert_eq!(
        f.multisig.get_request(&request_id).required_approvals,
        2,
        "the request keeps the threshold it was raised under"
    );
    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Pending
    );

    // The remedy: cancel it and raise a fresh request, which picks up the new
    // rule and is therefore approvable by the single remaining signer.
    f.multisig
        .cancel_transfer_request(&f.admin, &request_id);

    let second = f.request_transfer(&env, 7);
    f.multisig.approve_transfer_request(&f.retained, &second);
    assert_eq!(
        f.multisig.get_request(&second).status,
        RequestStatus::Approved
    );
}