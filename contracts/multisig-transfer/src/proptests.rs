//! Property-based tests for the approval rules and request lifecycle (#1653).
//!
//! The unit, auth, integration and pagination tests pin hand-picked examples.
//! These generate random rules, approver sets and sequences of
//! approve / reject / cancel / execute calls and assert the invariants that
//! must hold for *any* of them:
//!
//! - a request never executes below its threshold, and the registry's owner is
//!   untouched when it does not;
//! - an approver is never counted twice, however often they approve;
//! - a terminal status (`Rejected`, `Executed`, `Cancelled`) never changes, and
//!   an `Approved` request never goes back to `Pending`;
//! - `configure_approval_rule` accepts a rule exactly when
//!   `1 <= required_approvals <= approvers.len()`.
//!
//! Case counts are modest on purpose: every case builds a fresh `Env` with two
//! registered contracts, which is not free.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::errors::MultiSigError;
use crate::types::{ApprovalRule, RequestStatus};
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

const CATEGORY_SEED: u8 = 42;

struct Fixture<'a> {
    env: Env,
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    multisig_address: Address,
    admin: Address,
    approvers: Vec<Address>,
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[CATEGORY_SEED; 32])
}

fn rule(env: &Env, required_approvals: u32, approvers: &Vec<Address>) -> ApprovalRule {
    ApprovalRule {
        category: category(env),
        required_approvals,
        approvers: approvers.clone(),
        approval_timeout_secs: 86_400,
        auto_approve: false,
        priority: 1,
    }
}

fn addresses(env: &Env, count: u32) -> Vec<Address> {
    let mut out = Vec::new(env);
    for _ in 0..count {
        out.push_back(Address::generate(env));
    }
    out
}

impl<'a> Fixture<'a> {
    /// Wires the real registry and the multisig contract together and
    /// configures one category with `approver_count` approvers.
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

        let approvers = addresses(env, approver_count);
        multisig.configure_approval_rule(&admin, &rule(env, required_approvals, &approvers));

        Fixture {
            env: env.clone(),
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            approvers,
        }
    }

    /// Registers an asset owned by the multisig contract (the ownership model
    /// the workflow requires) and opens a transfer request for it.
    fn open_request(&self, recipient: &Address) -> (BytesN<32>, u64) {
        let timestamp = self.env.ledger().timestamp();
        let id = BytesN::from_array(&self.env, &[1u8; 32]);
        self.registry.register_asset(
            &assetsup::asset::Asset {
                id: id.clone(),
                name: String::from_str(&self.env, "Governed asset"),
                description: String::from_str(&self.env, "Property test asset"),
                category: String::from_str(&self.env, "Machinery"),
                owner: self.multisig_address.clone(),
                registration_timestamp: timestamp,
                last_transfer_timestamp: timestamp,
                status: assetsup::AssetStatus::Active,
                metadata_uri: String::from_str(&self.env, "ipfs://asset"),
                purchase_value: 500_000,
                custom_attributes: Vec::new(&self.env),
            },
            &self.admin,
        );

        let request_id = self.multisig.create_transfer_request(
            &self.multisig_address,
            &id,
            &category(&self.env),
            recipient,
            &BytesN::from_array(&self.env, &[0u8; 32]),
            &(timestamp + 100_000),
            &None,
        );
        (id, request_id)
    }

    fn status(&self, request_id: u64) -> RequestStatus {
        self.multisig.get_request(&request_id).status
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(24))]

    /// A request never executes below its threshold. Once the threshold is
    /// met it executes and ownership moves; below it, execution fails and the
    /// registry still shows the original owner.
    #[test]
    fn a_request_never_executes_below_its_threshold(
        approver_count in 1u32..7,
        required_seed in 0u32..7,
        attempted in 0u32..9,
    ) {
        let required = 1 + required_seed % approver_count;
        let approvals = attempted.min(approver_count);

        let env = Env::default();
        let f = Fixture::new(&env, required, approver_count);
        let recipient = Address::generate(&env);
        let (asset_id, request_id) = f.open_request(&recipient);

        for i in 0..approvals {
            // Approvals after the threshold is reached are refused
            // (`RequestNotPending`); that is part of what is being checked.
            let _ = f
                .multisig
                .try_approve_transfer_request(&f.approvers.get(i).unwrap(), &request_id);
        }

        let request = f.multisig.get_request(&request_id);
        prop_assert_eq!(request.received_approvals, approvals.min(required));

        let result = f.multisig.try_execute_transfer(&f.admin, &request_id);
        if approvals >= required {
            prop_assert!(matches!(result, Ok(Ok(()))));
            prop_assert_eq!(f.status(request_id), RequestStatus::Executed);
            prop_assert_eq!(f.registry.get_asset(&asset_id).owner, recipient);
        } else {
            prop_assert!(result.is_err(), "executed with {} of {} approvals", approvals, required);
            prop_assert_eq!(f.status(request_id), RequestStatus::Pending);
            prop_assert_eq!(f.registry.get_asset(&asset_id).owner, f.multisig_address.clone());
        }
    }

    /// An approver is counted once however often they approve, and the stored
    /// count always equals the number of distinct approvers that were accepted.
    #[test]
    fn an_approver_is_never_counted_twice(
        approver_count in 2u32..7,
        required_seed in 0u32..7,
        // Indices into the approver set, with deliberate repeats.
        sequence in prop::collection::vec(0u32..7, 0..14),
    ) {
        // A threshold above one keeps the request open long enough for repeats.
        let required = 2 + required_seed % (approver_count - 1);

        let env = Env::default();
        let f = Fixture::new(&env, required, approver_count);
        let (_asset_id, request_id) = f.open_request(&Address::generate(&env));

        let mut accepted = std::collections::BTreeSet::new();
        let mut approved = false;

        for raw in sequence {
            let idx = raw % approver_count;
            let result = f
                .multisig
                .try_approve_transfer_request(&f.approvers.get(idx).unwrap(), &request_id);

            if approved || accepted.contains(&idx) {
                prop_assert!(result.is_err(), "approver {} was accepted again", idx);
            } else {
                prop_assert!(matches!(result, Ok(Ok(()))), "first approval by {} was refused", idx);
                accepted.insert(idx);
                if accepted.len() as u32 >= required {
                    approved = true;
                }
            }
        }

        prop_assert_eq!(
            f.multisig.get_request(&request_id).received_approvals,
            accepted.len() as u32
        );
    }

    /// Whatever sequence of approve / reject / cancel / execute calls is
    /// thrown at a request, a terminal status never changes and an approved
    /// request never returns to pending.
    #[test]
    fn terminal_states_never_transition(
        approver_count in 1u32..5,
        required_seed in 0u32..5,
        operations in prop::collection::vec((0u8..4, 0u32..5), 0..16),
    ) {
        let required = 1 + required_seed % approver_count;

        let env = Env::default();
        let f = Fixture::new(&env, required, approver_count);
        let (_asset_id, request_id) = f.open_request(&Address::generate(&env));
        let reason = BytesN::from_array(&env, &[7u8; 32]);

        let mut terminal: Option<RequestStatus> = None;
        let mut was_approved = false;

        for (operation, who) in operations {
            let approver = f.approvers.get(who % approver_count).unwrap();
            match operation {
                0 => {
                    let _ = f.multisig.try_approve_transfer_request(&approver, &request_id);
                }
                1 => {
                    let _ = f
                        .multisig
                        .try_reject_transfer_request(&approver, &request_id, &reason);
                }
                2 => {
                    let _ = f.multisig.try_cancel_transfer_request(&f.admin, &request_id);
                }
                _ => {
                    let _ = f.multisig.try_execute_transfer(&f.admin, &request_id);
                }
            }

            let status = f.status(request_id);
            match &terminal {
                Some(settled) => prop_assert_eq!(&status, settled),
                None => {
                    if matches!(
                        status,
                        RequestStatus::Rejected | RequestStatus::Executed | RequestStatus::Cancelled
                    ) {
                        terminal = Some(status.clone());
                    }
                }
            }
            if status == RequestStatus::Approved {
                was_approved = true;
            }
            prop_assert!(
                !(was_approved && status == RequestStatus::Pending),
                "an approved request went back to pending"
            );
        }
    }

    /// `configure_approval_rule` accepts a rule exactly when it can be
    /// satisfied: `1 <= required_approvals <= approvers.len()`.
    #[test]
    fn a_rule_is_accepted_exactly_when_it_is_satisfiable(
        required in 0u32..10,
        signers in 0u32..8,
    ) {
        let env = Env::default();
        let f = Fixture::new(&env, 1, 1);
        let approvers = addresses(&env, signers);

        let result = f
            .multisig
            .try_configure_approval_rule(&f.admin, &rule(&env, required, &approvers));

        if (1..=signers).contains(&required) {
            prop_assert!(matches!(result, Ok(Ok(()))), "satisfiable rule {}-of-{} refused", required, signers);
        } else {
            prop_assert!(result.is_err(), "unsatisfiable rule {}-of-{} accepted", required, signers);
            let expected = if required == 0 {
                MultiSigError::InvalidThreshold
            } else {
                MultiSigError::ThresholdExceedsSignerCount
            };
            prop_assert!(matches!(result, Err(Ok(e)) if e == expected));
        }
    }
}
