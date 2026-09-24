#![cfg(test)]
//! [SC-63] Pagination tests for the three list-returning view functions.
//!
//! Registers the real `assetsup` registry alongside this contract (same
//! fixture pattern as the SC-51 integration suite) so that request history and
//! pending queues can be grown far enough to exercise more than one page.

extern crate std;

use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

struct PgFixture<'a> {
    env: Env,
    registry: AssetUpContractClient<'a>,
    multisig: MultiSigTransferContractClient<'a>,
    multisig_address: Address,
    admin: Address,
    approvers: Vec<Address>,
    asset_id: BytesN<32>,
}

const CATEGORY_SEED: u8 = 42;

impl<'a> PgFixture<'a> {
    fn new(env: &'a Env) -> PgFixture<'a> {
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
                approval_timeout_secs: 86_400,
                auto_approve: true, // lets history pagination advance without confirmations
                priority: 1,
            },
        );

        let asset_id = BytesN::from_array(env, &[7u8; 32]);
        registry.register_asset(&governed_asset(env, &multisig_id, asset_id.clone()), &admin);

        PgFixture {
            env: env.clone(),
            registry,
            multisig,
            multisig_address: multisig_id,
            admin,
            approvers,
            asset_id,
        }
    }

    /// Registers a fresh asset owned by the multisig contract.
    fn register_asset(&self, seed: u8) -> BytesN<32> {
        let id = BytesN::from_array(&self.env, &[seed; 32]);
        self.registry.register_asset(
            &governed_asset(&self.env, &self.multisig_address, id.clone()),
            &self.admin,
        );
        id
    }

    /// Completes one transfer of the fixture asset: raise (admin) + execute.
    ///
    /// The recipient is the multisig contract itself, so ownership returns to
    /// the governing contract after each transfer and the next one stays
    /// lawful (registry transfer requires the caller to be the current owner).
    fn raise_and_execute(&self) -> u64 {
        let id = self.multisig.create_transfer_request(
            &self.admin,
            &self.asset_id,
            &category(&self.env),
            &self.multisig_address,
            &BytesN::from_array(&self.env, &[0u8; 32]),
            &(self.env.ledger().timestamp() + 100_000),
            &None,
        );
        self.multisig.execute_transfer(&self.admin, &id);
        id
    }

    /// Raises a transfer request for the given asset, leaving it pending.
    fn raise_pending(&self, asset_id: &BytesN<32>) -> u64 {
        self.multisig.create_transfer_request(
            &self.admin,
            asset_id,
            &category(&self.env),
            &Address::generate(&self.env),
            &BytesN::from_array(&self.env, &[0u8; 32]),
            &(self.env.ledger().timestamp() + 100_000),
            &None,
        )
    }
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[CATEGORY_SEED; 32])
}

fn governed_asset(env: &Env, owner: &Address, id: BytesN<32>) -> assetsup::asset::Asset {
    let timestamp = env.ledger().timestamp();
    assetsup::asset::Asset {
        id,
        name: String::from_str(env, "Governed asset"),
        description: String::from_str(env, "Used to exercise pagination"),
        category: String::from_str(env, "Machinery"),
        owner: owner.clone(),
        registration_timestamp: timestamp,
        last_transfer_timestamp: timestamp,
        status: assetsup::AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://asset"),
        purchase_value: 100,
        custom_attributes: Vec::new(env),
    }
}

#[test]
fn asset_history_is_paginated_across_pages() {
    let env = Env::default();
    let f = PgFixture::new(&env);

    let mut ids = Vec::new(&env);
    for _ in 0..7 {
        ids.push_back(f.raise_and_execute());
    }
    assert_eq!(
        f.multisig.get_asset_history(&f.asset_id, &0, &0).len(),
        7,
        "limit 0 means no limit"
    );

    let page1 = f.multisig.get_asset_history(&f.asset_id, &0, &3);
    assert_eq!(page1.len(), 3);
    assert_eq!(page1.get(0).unwrap(), ids.get(0).unwrap());
    assert_eq!(page1.get(2).unwrap(), ids.get(2).unwrap());

    let page2 = f.multisig.get_asset_history(&f.asset_id, &3, &3);
    assert_eq!(page2.len(), 3);
    assert_eq!(page2.get(0).unwrap(), ids.get(3).unwrap());
    assert_eq!(page2.get(2).unwrap(), ids.get(5).unwrap());

    // Third page holds the remainder; offset past the end is empty.
    let page3 = f.multisig.get_asset_history(&f.asset_id, &6, &3);
    assert_eq!(page3.len(), 1);
    assert_eq!(page3.get(0).unwrap(), ids.get(6).unwrap());
    assert_eq!(
        f.multisig.get_asset_history(&f.asset_id, &7, &3).len(),
        0,
        "offset at the end yields an empty page"
    );
}

#[test]
fn pending_transfers_are_paginated_per_approver() {
    let env = Env::default();
    let f = PgFixture::new(&env);

    // Pending requests need a non-auto-approving rule.
    f.multisig.configure_approval_rule(
        &f.admin,
        &ApprovalRule {
            category: category(&env),
            required_approvals: 1,
            approvers: f.approvers.clone(),
            approval_timeout_secs: 86_400,
            auto_approve: false,
            priority: 1,
        },
    );

    // Five assets, one pending request each — all visible to approver[0].
    for seed in 8..13u8 {
        let asset = f.register_asset(seed);
        f.raise_pending(&asset);
    }

    let all = f
        .multisig
        .get_pending_transfers_approver(&f.approvers.get(0).unwrap(), &0, &0);
    assert_eq!(all.len(), 5);

    // Storage-map iteration order is unspecified, so compare by membership,
    // not position.
    let mut sorted: std::vec::Vec<u64> = all.try_iter().map(|id| id.unwrap()).collect();
    let mut consumed = Vec::new(&env);
    let mut consumed_std: std::vec::Vec<u64> = std::vec::Vec::new();
    let mut offset = 0u32;
    while offset < 5 {
        let page =
            f.multisig
                .get_pending_transfers_approver(&f.approvers.get(0).unwrap(), &offset, &2);
        let expect_len = std::cmp::min(5u32 - offset, 2);
        assert_eq!(page.len(), expect_len, "page at offset {}", offset);
        for id in page.try_iter() {
            let id = id.unwrap();
            consumed.push_back(id);
            consumed_std.push(id);
        }
        offset += 2;
    }

    consumed_std.sort_unstable();
    sorted.sort_unstable();
    assert_eq!(
        consumed_std, sorted,
        "paging every 2 elements must reproduce the full queue"
    );
}

#[test]
fn required_approvers_are_paginated() {
    let env = Env::default();
    let f = PgFixture::new(&env);

    let all = f
        .multisig
        .get_required_approvers_category(&category(&env), &0, &0);
    assert_eq!(all.len(), 2, "limit 0 means no limit");

    // Stable positional order here: the approvers come from a configured rule,
    // not a storage-map scan.
    let first = f
        .multisig
        .get_required_approvers_category(&category(&env), &0, &1);
    assert_eq!(first.len(), 1);
    assert_eq!(first.get(0).unwrap(), all.get(0).unwrap());

    let second = f
        .multisig
        .get_required_approvers_category(&category(&env), &1, &1);
    assert_eq!(second.len(), 1);
    assert_eq!(second.get(0).unwrap(), all.get(1).unwrap());

    assert_eq!(
        f.multisig
            .get_required_approvers_category(&category(&env), &2, &1)
            .len(),
        0,
        "offset past the end yields an empty page"
    );
}
