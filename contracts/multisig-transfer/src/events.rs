//! Typed contract events for `multisig-transfer`.
//!
//! Every event is a `#[contractevent]` struct following the workspace
//! convention documented in `contracts/EVENTS.md`:
//!
//! - The struct name is `<Subject><PastTenseVerb>`; the SDK derives topic 0
//!   from it in `lower_snake_case` (`TransferRequested` -> `transfer_requested`).
//! - The primary entity identifier is marked `#[topic]` so downstream systems
//!   can index on it.
//! - Remaining fields form the data map, and every event carries `timestamp`.
//!
//! Because these types are emitted into the contract spec, clients can
//! generate bindings for them rather than hand-decoding tuples.

use soroban_sdk::{contractevent, Address, BytesN, Env};

/// A transfer request was created and is awaiting approvals.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRequested {
    #[topic]
    pub request_id: u64,
    pub asset_id: BytesN<32>,
    pub from_owner: Address,
    pub to_owner: Address,
    pub timestamp: u64,
}

/// An authorized approver approved a pending transfer request.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferApproved {
    #[topic]
    pub request_id: u64,
    pub approver: Address,
    pub approval_count: u32,
    pub timestamp: u64,
}

/// An authorized approver rejected a pending transfer request.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRejected {
    #[topic]
    pub request_id: u64,
    pub rejector: Address,
    pub reason_hash: BytesN<32>,
    pub timestamp: u64,
}

/// A fully approved transfer was executed and ownership moved in the registry.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferExecuted {
    #[topic]
    pub request_id: u64,
    pub asset_id: BytesN<32>,
    pub new_owner: Address,
    pub timestamp: u64,
}

/// A pending transfer request was cancelled by its requester or the admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferCancelled {
    #[topic]
    pub request_id: u64,
    pub cancelled_by: Address,
    pub timestamp: u64,
}

/// The approval rule for an asset category was created or changed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApprovalRuleUpdated {
    #[topic]
    pub category: BytesN<32>,
    pub required_approvals: u32,
    pub timestamp: u64,
}

/// An address was granted approver rights.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApproverAdded {
    #[topic]
    pub approver: Address,
    pub added_by: Address,
    pub timestamp: u64,
}

/// An address had its approver rights revoked.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ApproverRemoved {
    #[topic]
    pub approver: Address,
    pub removed_by: Address,
    pub timestamp: u64,
}

/// The contract was initialized with an admin and a registry address.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub asset_registry: Address,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Emission helpers
//
// These keep call sites in `lib.rs` terse and ensure every event is published
// from exactly one place.
// ---------------------------------------------------------------------------

pub fn contract_initialized(e: &Env, admin: &Address, asset_registry: &Address, timestamp: u64) {
    ContractInitialized {
        admin: admin.clone(),
        asset_registry: asset_registry.clone(),
        timestamp,
    }
    .publish(e);
}

pub fn transfer_requested(
    e: &Env,
    request_id: u64,
    asset_id: &BytesN<32>,
    from_owner: &Address,
    to_owner: &Address,
    timestamp: u64,
) {
    TransferRequested {
        request_id,
        asset_id: asset_id.clone(),
        from_owner: from_owner.clone(),
        to_owner: to_owner.clone(),
        timestamp,
    }
    .publish(e);
}

pub fn transfer_approved(e: &Env, request_id: u64, approver: &Address, count: u32, timestamp: u64) {
    TransferApproved {
        request_id,
        approver: approver.clone(),
        approval_count: count,
        timestamp,
    }
    .publish(e);
}

pub fn transfer_rejected(
    e: &Env,
    request_id: u64,
    rejector: &Address,
    reason_hash: &BytesN<32>,
    timestamp: u64,
) {
    TransferRejected {
        request_id,
        rejector: rejector.clone(),
        reason_hash: reason_hash.clone(),
        timestamp,
    }
    .publish(e);
}

pub fn transfer_executed(
    e: &Env,
    request_id: u64,
    asset_id: &BytesN<32>,
    new_owner: &Address,
    timestamp: u64,
) {
    TransferExecuted {
        request_id,
        asset_id: asset_id.clone(),
        new_owner: new_owner.clone(),
        timestamp,
    }
    .publish(e);
}

pub fn transfer_cancelled(e: &Env, request_id: u64, cancelled_by: &Address, timestamp: u64) {
    TransferCancelled {
        request_id,
        cancelled_by: cancelled_by.clone(),
        timestamp,
    }
    .publish(e);
}

pub fn approval_rule_updated(e: &Env, category: &BytesN<32>, required: u32, timestamp: u64) {
    ApprovalRuleUpdated {
        category: category.clone(),
        required_approvals: required,
        timestamp,
    }
    .publish(e);
}

#[allow(dead_code)]
pub fn approver_added(e: &Env, approver: &Address, added_by: &Address, timestamp: u64) {
    ApproverAdded {
        approver: approver.clone(),
        added_by: added_by.clone(),
        timestamp,
    }
    .publish(e);
}

#[allow(dead_code)]
pub fn approver_removed(e: &Env, approver: &Address, removed_by: &Address, timestamp: u64) {
    ApproverRemoved {
        approver: approver.clone(),
        removed_by: removed_by.clone(),
        timestamp,
    }
    .publish(e);
}
