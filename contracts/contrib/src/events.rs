//! Typed contract events for `contrib`.
//!
//! See `contracts/EVENTS.md` for the workspace-wide convention. Struct names
//! are `<Subject><PastTenseVerb>`; the SDK derives topic 0 from the name in
//! `lower_snake_case`. The primary entity identifier is marked `#[topic]`.
//!
//! Only the modules `contrib/src/lib.rs` actually declares are covered here —
//! `audit`, `pause`, `types`, `insurance`, and `lease`. The other files in
//! `contrib/src/` are not compiled into the crate; see the crate README.

use soroban_sdk::{contractevent, Address, BytesN, Env};

use crate::insurance::ClaimStatus;

/// The contract was initialized with an admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

/// An asset was registered by an authorized registrar.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRegistered {
    #[topic]
    pub asset_id: BytesN<32>,
    pub owner: Address,
    pub timestamp: u64,
}

/// Ownership of an asset moved to a new owner.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetTransferred {
    #[topic]
    pub asset_id: BytesN<32>,
    pub old_owner: Address,
    pub new_owner: Address,
    pub timestamp: u64,
}

/// An asset was retired and can no longer be transferred.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRetired {
    #[topic]
    pub asset_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// An address was granted registrar rights.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistrarAdded {
    #[topic]
    pub registrar: Address,
    pub caller: Address,
    pub timestamp: u64,
}

/// An address had its registrar rights revoked.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistrarRemoved {
    #[topic]
    pub registrar: Address,
    pub caller: Address,
    pub timestamp: u64,
}

/// The contract was paused; mutating entrypoints now reject.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractPaused {
    #[topic]
    pub caller: Address,
    pub timestamp: u64,
}

/// The contract was unpaused and resumed normal operation.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractUnpaused {
    #[topic]
    pub caller: Address,
    pub timestamp: u64,
}

/// An insurance policy was created for an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyCreated {
    #[topic]
    pub policy_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub insurer: Address,
    pub holder: Address,
    pub timestamp: u64,
}

/// An insurance policy was cancelled.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyCancelled {
    #[topic]
    pub policy_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// A claim was submitted against an insurance policy.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimSubmitted {
    #[topic]
    pub claim_id: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub claimant: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// The status of an insurance claim was changed by the insurer.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimStatusUpdated {
    #[topic]
    pub claim_id: BytesN<32>,
    pub status: ClaimStatus,
    pub timestamp: u64,
}

/// A lease was created over an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseCreated {
    #[topic]
    pub lease_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub lessor: Address,
    pub lessee: Address,
    pub timestamp: u64,
}

/// A leased asset was checked back in by the lessor.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseCheckedIn {
    #[topic]
    pub lease_id: BytesN<32>,
    pub timestamp: u64,
}

/// A lease was cancelled by the lessor or admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseCancelled {
    #[topic]
    pub lease_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Emission helpers
// ---------------------------------------------------------------------------

pub fn contract_initialized(env: &Env, admin: &Address) {
    ContractInitialized {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_registered(env: &Env, asset_id: &BytesN<32>, owner: &Address) {
    AssetRegistered {
        asset_id: asset_id.clone(),
        owner: owner.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_transferred(
    env: &Env,
    asset_id: &BytesN<32>,
    old_owner: &Address,
    new_owner: &Address,
) {
    AssetTransferred {
        asset_id: asset_id.clone(),
        old_owner: old_owner.clone(),
        new_owner: new_owner.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_retired(env: &Env, asset_id: &BytesN<32>, caller: &Address) {
    AssetRetired {
        asset_id: asset_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn registrar_added(env: &Env, registrar: &Address, caller: &Address) {
    RegistrarAdded {
        registrar: registrar.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn registrar_removed(env: &Env, registrar: &Address, caller: &Address) {
    RegistrarRemoved {
        registrar: registrar.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_paused(env: &Env, caller: &Address) {
    ContractPaused {
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_unpaused(env: &Env, caller: &Address) {
    ContractUnpaused {
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn policy_created(
    env: &Env,
    policy_id: &BytesN<32>,
    asset_id: &BytesN<32>,
    insurer: &Address,
    holder: &Address,
) {
    PolicyCreated {
        policy_id: policy_id.clone(),
        asset_id: asset_id.clone(),
        insurer: insurer.clone(),
        holder: holder.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn policy_cancelled(env: &Env, policy_id: &BytesN<32>, caller: &Address) {
    PolicyCancelled {
        policy_id: policy_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn claim_submitted(
    env: &Env,
    claim_id: &BytesN<32>,
    policy_id: &BytesN<32>,
    claimant: &Address,
    amount: i128,
) {
    ClaimSubmitted {
        claim_id: claim_id.clone(),
        policy_id: policy_id.clone(),
        claimant: claimant.clone(),
        amount,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn claim_status_updated(env: &Env, claim_id: &BytesN<32>, status: ClaimStatus) {
    ClaimStatusUpdated {
        claim_id: claim_id.clone(),
        status,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_created(
    env: &Env,
    lease_id: &BytesN<32>,
    asset_id: &BytesN<32>,
    lessor: &Address,
    lessee: &Address,
) {
    LeaseCreated {
        lease_id: lease_id.clone(),
        asset_id: asset_id.clone(),
        lessor: lessor.clone(),
        lessee: lessee.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_checked_in(env: &Env, lease_id: &BytesN<32>) {
    LeaseCheckedIn {
        lease_id: lease_id.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_cancelled(env: &Env, lease_id: &BytesN<32>, caller: &Address) {
    LeaseCancelled {
        lease_id: lease_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}
