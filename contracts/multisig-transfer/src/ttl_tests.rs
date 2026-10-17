//! Storage TTL tests ([SC-75]).
//!
//! Before this, no entrypoint in this crate called `extend_ttl`. Every write
//! landed with the network's minimum TTL and nothing ever pushed it out, so
//! request records, approver sets and the `AssetPendingRequest` index all
//! drifted towards archival regardless of how active the contract was.
//!
//! The failure is not graceful: an archived entry in `AssetPendingRequest` still
//! reads as "this asset has a pending request" to `create_transfer_request`, so
//! the asset stays wedged with no visible cause.
//!
//! `Env::default()` sets `min_persistent_entry_ttl` to 4096 ledgers, so a freshly
//! written entry is unambiguously distinguishable from one this contract has
//! bumped to its 90-day window.
#![cfg(test)]

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::storage::Persistent as _;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::storage::DataKey;
use crate::ttl::{PERSISTENT_EXTEND_TO, PERSISTENT_THRESHOLD};
use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

const CATEGORY_SEED: u8 = 44;
const TIMEOUT_SECS: u64 = 3600;

/// Enough sequence numbers that the default 4096-ledger TTL has run down well
/// past the 30-day (518 400 ledger) threshold.
const AGE_OUT_SEQUENCE: u32 = 1_000_000;

struct Fixture<'a> {
    registry_id: Address,
    multisig_id: Address,
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    admin: Address,
    approvers: Vec<Address>,
}

impl<'a> Fixture<'a> {
    fn new(env: &'a Env) -> Fixture<'a> {
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
        approvers.push_back(Address::generate(env));
        approvers.push_back(Address::generate(env));

        multisig.configure_approval_rule(
            &admin,
            &ApprovalRule {
                category: category(env),
                required_approvals: 1,
                approvers: approvers.clone(),
                approval_timeout_secs: TIMEOUT_SECS,
                auto_approve: false,
                priority: 1,
            },
        );

        Fixture {
            registry_id,
            multisig_id,
            registry,
            multisig,
            admin,
            approvers,
        }
    }

    /// Registers an asset owned by the multisig contract and raises a request
    /// for it, which is what creates the `Requests`, `AssetPendingRequest` and
    /// `AssetHistory` entries.
    fn request_transfer(&self, env: &Env, seed: u8) -> u64 {
        let id = BytesN::from_array(env, &[seed; 32]);
        self.registry
            .register_asset(&asset(env, &self.multisig_id, id.clone()), &self.admin);

        self.multisig.create_transfer_request(
            &self.multisig_id,
            &id,
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
        name: String::from_str(env, "TTL asset"),
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

/// Remaining ledgers on `key`, read inside the contract's own storage context so
/// the key is namespaced to it.
fn ttl_of(env: &Env, contract_id: &Address, key: &DataKey) -> u32 {
    env.as_contract(contract_id, || {
        env.storage().persistent().get_ttl(key)
    })
}

#[test]
fn a_request_raises_the_ttl_of_the_entries_it_touches() {
    let env = Env::default();
    let f = Fixture::new(&env);
    let _request_id = f.request_transfer(&env, 1);

    // `create_transfer_request` writes then leaves these behind; without an
    // explicit bump they would sit at the network minimum and drift towards
    // archival.
    for key in [
        DataKey::Requests,
        DataKey::AssetPendingRequest,
        DataKey::AssetHistory,
        DataKey::PendingApprovals,
        DataKey::Rules,
    ] {
        let ttl = ttl_of(&env, &f.multisig_id, &key);
        assert!(
            ttl > PERSISTENT_THRESHOLD,
            "{:?} was left at {} ledgers, below the {} threshold, so it was never bumped",
            key,
            ttl,
            PERSISTENT_THRESHOLD
        );
    }
}

#[test]
fn a_read_only_query_bumps_the_ttl() {
    // The important half. A completed transfer is never written again, so a
    // write-only policy would let its record lapse while it is still being
    // queried by an indexer every day.
    let env = Env::default();
    let f = Fixture::new(&env);
    let request_id = f.request_transfer(&env, 2);

    // Age every entry back down below the threshold.
    env.ledger().set_sequence_number(AGE_OUT_SEQUENCE);
    let before = ttl_of(&env, &f.multisig_id, &DataKey::Requests);
    assert!(
        before < PERSISTENT_THRESHOLD,
        "test setup failed: entry is already at {} ledgers",
        before
    );

    // A pure read.
    f.multisig.get_request(&request_id);

    let after = ttl_of(&env, &f.multisig_id, &DataKey::Requests);
    assert!(
        after > PERSISTENT_THRESHOLD,
        "reading a request must extend its TTL, but it went from {} to {}",
        before,
        after
    );
}

#[test]
fn a_paginated_query_bumps_the_ttl_too() {
    // A full query page, not just a single-row lookup.
    let env = Env::default();
    let f = Fixture::new(&env);
    let _ = f.request_transfer(&env, 3);

    env.ledger().set_sequence_number(AGE_OUT_SEQUENCE);
    let before = ttl_of(&env, &f.multisig_id, &DataKey::AssetHistory);
    assert!(before < PERSISTENT_THRESHOLD);

    f.multisig
        .get_asset_history(&BytesN::from_array(&env, &[3u8; 32]), &0, &10);

    assert!(
        ttl_of(&env, &f.multisig_id, &DataKey::AssetHistory) > PERSISTENT_THRESHOLD
    );
}

#[test]
fn approval_flags_are_bumped_on_write() {
    // Flags are individually keyed by (request_id, approver), so `extend_all`
    // cannot reach them and they need their own treatment.
    let env = Env::default();
    let f = Fixture::new(&env);
    let request_id = f.request_transfer(&env, 4);

    env.ledger().set_sequence_number(AGE_OUT_SEQUENCE);
    f.multisig
        .approve_transfer_request(&f.approvers.get(0), &request_id);

    let key = (request_id, f.approvers.get(0));
    let flag_ttl = env.as_contract(&f.multisig_id, || {
        env.storage().persistent().get_ttl(&key)
    });
    assert!(
        flag_ttl > PERSISTENT_THRESHOLD,
        "an approval flag was written at {} ledgers, below the threshold",
        flag_ttl
    );
}

#[test]
fn the_window_is_ninety_days() {
    // Pins the policy itself, so changing the constants has to be a deliberate
    // edit to this test rather than an accident.
    assert_eq!(PERSISTENT_EXTEND_TO, 90 * 17_280);
    assert!(PERSISTENT_THRESHOLD < PERSISTENT_EXTEND_TO);
}

#[test]
fn bumping_an_absent_entry_does_not_trap() {
    // `extend_all` runs before most entries exist on a freshly deployed
    // contract. `extend_ttl` on a missing key traps, so the existence check in
    // `extend_persistent` is load-bearing.
    let env = Env::default();
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(&env, &contract_id);

    env.mock_all_auths();
    client.initialize(&Address::generate(&env), &Address::generate(&env));

    // Only Admin/AssetRegistry/NextRequestId exist now; the rest are absent.
    client.get_asset_history(&BytesN::from_array(&env, &[9u8; 32]), &0, &0);
}