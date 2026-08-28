//! Typed contract events for `contrib`.
//!
//! See `contracts/EVENTS.md` for the workspace-wide convention. Struct names
//! are `<Subject><PastTenseVerb>`; the SDK derives topic 0 from the name in
//! `lower_snake_case`. The primary entity identifier is marked `#[topic]`.
//!
//! Covers every module `contrib/src/lib.rs` declares: `audit`, `pause`,
//! `types`, `insurance`, `lease`, `kyc`, `oracle`, `staking`, and `escrow`.

use soroban_sdk::{contractevent, Address, BytesN, Env, String};

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

/// An address submitted itself for KYC review.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycSubmitted {
    #[topic]
    pub address: Address,
    pub timestamp: u64,
}

/// The admin approved an address's KYC at a given tier.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycApproved {
    #[topic]
    pub address: Address,
    pub tier: u32,
    pub expires_at: u64,
    pub timestamp: u64,
}

/// The admin revoked a previously approved KYC record.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycRevoked {
    #[topic]
    pub address: Address,
    pub caller: Address,
    pub timestamp: u64,
}

/// The admin authorized an address to publish valuations.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleAdded {
    #[topic]
    pub oracle: Address,
    pub caller: Address,
    pub timestamp: u64,
}

/// The admin revoked an address's authorization to publish valuations.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleRemoved {
    #[topic]
    pub oracle: Address,
    pub caller: Address,
    pub timestamp: u64,
}

/// An authorized oracle published a new valuation for an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValuationUpdated {
    #[topic]
    pub asset_id: u64,
    pub value: i128,
    pub currency: String,
    pub source: Address,
    pub timestamp: u64,
}

/// A staker locked tokens against an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Staked {
    #[topic]
    pub asset_id: u64,
    pub staker: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// A staker withdrew their stake after the lock period elapsed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Unstaked {
    #[topic]
    pub asset_id: u64,
    pub staker: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// The admin distributed staking rewards across an asset's stakers.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakingRewardsAccrued {
    #[topic]
    pub asset_id: u64,
    pub total_rewards: i128,
    pub timestamp: u64,
}

/// A buyer opened an escrow for an asset sale.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowOpened {
    #[topic]
    pub escrow_id: u64,
    pub asset_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// The buyer confirmed receipt and released the escrow to the seller.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowReleased {
    #[topic]
    pub escrow_id: u64,
    pub caller: Address,
    pub timestamp: u64,
}

/// The escrow was cancelled by the buyer or seller before release.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowCancelled {
    #[topic]
    pub escrow_id: u64,
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

pub fn kyc_submitted(env: &Env, address: &Address) {
    KycSubmitted {
        address: address.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn kyc_approved(env: &Env, address: &Address, tier: u32, expires_at: u64) {
    KycApproved {
        address: address.clone(),
        tier,
        expires_at,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn kyc_revoked(env: &Env, address: &Address, caller: &Address) {
    KycRevoked {
        address: address.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn oracle_added(env: &Env, oracle: &Address, caller: &Address) {
    OracleAdded {
        oracle: oracle.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn oracle_removed(env: &Env, oracle: &Address, caller: &Address) {
    OracleRemoved {
        oracle: oracle.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn valuation_updated(
    env: &Env,
    asset_id: u64,
    value: i128,
    currency: &String,
    source: &Address,
) {
    ValuationUpdated {
        asset_id,
        value,
        currency: currency.clone(),
        source: source.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn staked(env: &Env, asset_id: u64, staker: &Address, amount: i128) {
    Staked {
        asset_id,
        staker: staker.clone(),
        amount,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn unstaked(env: &Env, asset_id: u64, staker: &Address, amount: i128) {
    Unstaked {
        asset_id,
        staker: staker.clone(),
        amount,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn staking_rewards_accrued(env: &Env, asset_id: u64, total_rewards: i128) {
    StakingRewardsAccrued {
        asset_id,
        total_rewards,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn escrow_opened(
    env: &Env,
    escrow_id: u64,
    asset_id: u64,
    seller: &Address,
    buyer: &Address,
    amount: i128,
) {
    EscrowOpened {
        escrow_id,
        asset_id,
        seller: seller.clone(),
        buyer: buyer.clone(),
        amount,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn escrow_released(env: &Env, escrow_id: u64, caller: &Address) {
    EscrowReleased {
        escrow_id,
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn escrow_cancelled(env: &Env, escrow_id: u64, caller: &Address) {
    EscrowCancelled {
        escrow_id,
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}
