#![allow(clippy::too_many_arguments)]

use soroban_sdk::{
    contracttype, Address, BytesN, Env, String, Vec, Map, Symbol, log
};
use crate::{Error, handle_error};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyStatus {
    Active,
    Expired,
    Cancelled,
    Suspended,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Paid,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyType {
    Comprehensive,
    Theft,
    Damage,
    Liability,
    BusinessInterruption,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimType {
    Theft,
    Damage,
    Loss,
    Liability,
    Other,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct InsurancePolicy {
    pub policy_id: BytesN<32>,
    pub holder: Address,
    pub insurer: Address,
    pub asset_id: BytesN<32>,
    pub coverage_amount: i128,
    pub deductible: i128,
    pub premium: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub status: PolicyStatus,
    pub auto_renew: bool,
    pub last_payment: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct InsuranceClaim {
    pub claim_id: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub claimant: Address,
    pub amount: i128,
    pub status: ClaimStatus,
    pub filed_at: u64,
    pub approved_amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Policy(BytesN<32>),
    Claim(BytesN<32>),
    AssetPolicies(BytesN<32>),
}

pub fn create_policy(
    env: Env,
    policy: InsurancePolicy,
) -> Result<(), Error> {
    policy.insurer.require_auth();

    if policy.coverage_amount <= 0 || policy.deductible >= policy.coverage_amount {
        return Err(Error::InvalidPayment);
    }

    let key = DataKey::Policy(policy.policy_id.clone());
    let store = env.storage().persistent();

    if store.has(&key) {
        return Err(Error::AssetAlreadyExists);
    }

    store.set(&key, &policy);

    let mut list: Vec<BytesN<32>> = store
        .get(&DataKey::AssetPolicies(policy.asset_id.clone()))
        .unwrap_or_else(|| Vec::new(&env));

    list.push_back(policy.policy_id.clone());
    store.set(&DataKey::AssetPolicies(policy.asset_id.clone()), &list);

    log!(&env, "PolicyCreated: {:?}", policy.policy_id);
    Ok(())
}

pub fn file_claim(
    env: Env,
    claim: InsuranceClaim,
) -> Result<(), Error> {
    claim.claimant.require_auth();

    let store = env.storage().persistent();
    let policy_key = DataKey::Policy(claim.policy_id.clone());

    let policy: InsurancePolicy = store
        .get(&policy_key)
        .ok_or(Error::AssetNotFound)?;

    if policy.status != PolicyStatus::Active {
        return Err(Error::Unauthorized);
    }

    let key = DataKey::Claim(claim.claim_id.clone());
    if store.has(&key) {
        return Err(Error::AssetAlreadyExists);
    }

    store.set(&key, &claim);

    log!(&env, "ClaimFiled: {:?}", claim.claim_id);
    Ok(())
}

pub fn approve_claim(
    env: Env,
    claim_id: BytesN<32>,
    approver: Address,
) -> Result<(), Error> {
    approver.require_auth();

    let store = env.storage().persistent();
    let key = DataKey::Claim(claim_id.clone());

    let mut claim: InsuranceClaim = store.get(&key).ok_or(Error::AssetNotFound)?;

    claim.status = ClaimStatus::Approved;
    claim.approved_amount = claim.amount;

    store.set(&key, &claim);

    log!(&env, "ClaimApproved: {:?}", claim_id);
    Ok(())
}

pub fn pay_claim(
    env: Env,
    claim_id: BytesN<32>,
) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Claim(claim_id.clone());

    let mut claim: InsuranceClaim = store.get(&key).ok_or(Error::AssetNotFound)?;

    if claim.status != ClaimStatus::Approved {
        return Err(Error::Unauthorized);
    }

    claim.status = ClaimStatus::Paid;
    store.set(&key, &claim);

    log!(&env, "ClaimPaid: {:?}", claim_id);
    Ok(())
}

pub fn get_policy(env: Env, policy_id: BytesN<32>) -> Option<InsurancePolicy> {
    env.storage().persistent().get(&DataKey::Policy(policy_id))
}

pub fn get_claim(env: Env, claim_id: BytesN<32>) -> Option<InsuranceClaim> {
    env.storage().persistent().get(&DataKey::Claim(claim_id))
}
