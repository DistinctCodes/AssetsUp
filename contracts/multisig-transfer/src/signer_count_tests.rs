//! Signer-count tests ([SC-77]).
//!
//! `configure_approval_rule` rejected `required_approvals == 0` but accepted a
//! threshold *above* its own signer count. Nothing checked that the two halves of
//! a rule agreed with each other.
//!
//! That gap is not cosmetic. `create_transfer_request` copies
//! `required_approvals` onto the request and `approve_transfer_request` counts
//! distinct signers against it, so a rule with `required_approvals == 9` and
//! three signers can never be satisfied. The rule was accepted by a successful
//! transaction, and every transfer raised under it sat behind a pending request
//! that could neither execute nor be re-raised.
//!
//! The tests use a real `assetsup` registry so the wedge is demonstrated against
//! a genuine request rather than asserted in the abstract.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::errors::MultiSigError;
use crate::rules::MIN_SIGNERS;
use crate::types::{ApprovalRule, RequestStatus};
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

const CATEGORY_SEED: u8 = 46;
const TIMEOUT_SECS: u64 = 3600;

struct Fixture<'a> {
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    multisig_address: Address,
    admin: Address,
    signers: Vec<Address>,
}

impl<'a> Fixture<'a> {
    fn new(env: &'a Env, signer_count: u32) -> Fixture<'a> {
        let admin = Address::generate(env);

        let registry_id = env.register(AssetUpContract, ());
        let registry = AssetUpContractClient::new(env, &registry_id);

        let multisig_id = env.register(MultiSigTransferContract, ());
        let multisig = MultiSigTransferContractClient::new(env, &multisig_id);

        env.mock_all_auths();
        registry.initialize(&admin);
        multisig.initialize(&admin, &registry_id);
        registry.add_authorized_registrar(&multisig_id);

        let mut signers = Vec::new(env);
        for _ in 0..signer_count {
            signers.push_back(Address::generate(env));
        }

        Fixture {
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            signers,
        }
    }

    fn configure(&self, env: &Env, required_approvals: u32, approvers: &[Address]) -> Result<(), MultiSigError> {
        self.multisig.configure_approval_rule(
            &self.admin,
            &ApprovalRule {
                category: category(env),
                required_approvals,
                approvers: Vec::from_slice(env, approvers),
                approval_timeout_secs: TIMEOUT_SECS,
                auto_approve: false,
                priority: 1,
            },
        )
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
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[CATEGORY_SEED; 32])
}

fn asset(env: &Env, owner: &Address, id: BytesN<32>) -> assetsup::asset::Asset {
    let timestamp = env.ledger().timestamp();
    assetsup::asset::Asset {
        id,
        name: String::from_str(env, "Signer count asset"),
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

fn addresses(env: &Env, f: &Fixture<'_>) -> Vec<Address> {
    let mut out = Vec::new(env);
    for s in f.signers.iter() {
        out.push_back(s);
    }
    out
}

// ---------------------------------------------------------------------------
// The upper bound: threshold must be reachable
// ---------------------------------------------------------------------------

#[test]
fn a_threshold_above_the_signer_count_is_rejected() {
    // The dangerous case the issue is about.
    let env = Env::default();
    let f = Fixture::new(&env, 3);

    let res = f.configure(&env, 9, &addresses(&env, &f));
    assert_eq!(
        res,
        Err(MultiSigError::ThresholdExceedsSignerCount),
        "a rule no signer set could satisfy must be rejected"
    );
}

#[test]
fn a_threshold_equal_to_the_signer_count_is_allowed() {
    // The boundary must be inclusive: requiring every signer is a legitimate,
    // if strict, policy.
    let env = Env::default();
    let f = Fixture::new(&env, 3);
    let signers = addresses(&env, &f);

    assert_eq!(f.configure(&env, 3, &signers), Ok(()));
}

#[test]
fn a_zero_threshold_still_reports_invalid_threshold() {
    // Ordering: "no threshold set" must stay distinguishable from "threshold is
    // unreachable", or integrators cannot tell the two apart.
    let env = Env::default();
    let f = Fixture::new(&env, 3);

    let res = f.configure(&env, 0, &addresses(&env, &f));
    assert_eq!(res, Err(MultiSigError::InvalidThreshold));
}

#[test]
fn a_rejected_rule_is_not_written() {
    // A failed validation must leave no partial rule behind.
    let env = Env::default();
    let f = Fixture::new(&env, 3);

    let _ = f.configure(&env, 9, &addresses(&env, &f));

    assert!(
        f.multisig
            .try_get_required_approvers_category(&category(&env), &0, &0)
            .is_err(),
        "the rejected rule must not have been stored"
    );
}

// ---------------------------------------------------------------------------
// The lower bound: a category must be able to approve at all
// ---------------------------------------------------------------------------

#[test]
fn an_empty_signer_set_is_rejected() {
    let env = Env::default();
    let f = Fixture::new(&env, 3);

    let res = f.configure(&env, 1, &[]);
    assert_eq!(res, Err(MultiSigError::InsufficientSigners));
}

#[test]
fn the_minimum_signer_floor_is_one() {
    // Pinned so raising `MIN_SIGNERS` is a deliberate edit.
    assert_eq!(MIN_SIGNERS, 1);
}

#[test]
fn a_single_signer_is_allowed() {
    let env = Env::default();
    let f = Fixture::new(&env, 1);

    let signers = addresses(&env, &f);
    assert_eq!(f.configure(&env, 1, &signers), Ok(()));
}

// ---------------------------------------------------------------------------
// End to end: the wedge the validation prevents
// ---------------------------------------------------------------------------

#[test]
fn a_satisfiable_rule_still_approves_normally() {
    // The guard must not reject legitimate rules.
    let env = Env::default();
    let f = Fixture::new(&env, 3);
    let signers = addresses(&env, &f);
    f.configure(&env, 2, &signers).unwrap();

    let request_id = f.request_transfer(&env, 1);
    f.multisig.approve_transfer_request(&signers.get(0), &request_id);
    f.multisig.approve_transfer_request(&signers.get(1), &request_id);

    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Approved
    );
}

#[test]
fn removing_a_signer_below_the_threshold_is_rejected() {
    // The same wedge, reached from the other direction: narrowing the signer set
    // until it can no longer satisfy the threshold. Requests already raised keep
    // the threshold they were opened under, so this silently strands them -
    // hence the check has to happen at the point the set is narrowed.
    let env = Env::default();
    let f = Fixture::new(&env, 3);
    let signers = addresses(&env, &f);
    f.configure(&env, 2, &signers).unwrap();

    // Open a request under the healthy rule first.
    let request_id = f.request_transfer(&env, 2);
    f.multisig.approve_transfer_request(&signers.get(0), &request_id);

    // Now try to drop to a single signer while the threshold stays at two.
    let res = f.configure(&env, 2, &signers.slice(0..1));
    assert_eq!(res, Err(MultiSigError::ThresholdExceedsSignerCount));

    // The in-flight request is therefore still reachable by its remaining signer.
    f.multisig.approve_transfer_request(&signers.get(1), &request_id);
    assert_eq!(
        f.multisig.get_request(&request_id).status,
        RequestStatus::Approved
    );
}

#[test]
fn dropping_the_threshold_alongside_the_signer_is_allowed() {
    // The legitimate way to narrow the set: lower the threshold with it.
    let env = Env::default();
    let f = Fixture::new(&env, 3);
    let signers = addresses(&env, &f);
    f.configure(&env, 3, &signers).unwrap();

    assert_eq!(f.configure(&env, 1, &signers.slice(0..1)), Ok(()));
}