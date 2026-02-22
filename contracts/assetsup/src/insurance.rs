#![allow(dead_code)]

use crate::Error;
use soroban_sdk::{contracttype, log, Address, BytesN, Env, Vec};

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
    Liability,
    Property,
    Comprehensive,
    Custom,
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
    pub policy_type: PolicyType,
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

/// Create a new insurance policy with date validation and asset indexing
pub fn create_policy(env: Env, policy: InsurancePolicy) -> Result<(), Error> {
    // Validate coverage and deductible
    if policy.coverage_amount <= 0 || policy.deductible >= policy.coverage_amount {
        return Err(Error::InvalidPayment);
    }

    // Validate premium
    if policy.premium <= 0 {
        return Err(Error::InvalidPayment);
    }

    // Validate dates: start_date must be before end_date
    if policy.start_date >= policy.end_date {
        return Err(Error::InvalidPayment);
    }

    // Validate that start_date is not in the past (allow current timestamp)
    let current_time = env.ledger().timestamp();
    if policy.start_date < current_time {
        return Err(Error::InvalidPayment);
    }

    let key = DataKey::Policy(policy.policy_id.clone());
    let store = env.storage().persistent();

    // Check if policy already exists
    if store.has(&key) {
        return Err(Error::AssetAlreadyExists);
    }

    // Store the policy
    store.set(&key, &policy);

    // Maintain asset index: add policy to asset's policy list
    let mut list: Vec<BytesN<32>> = store
        .get(&DataKey::AssetPolicies(policy.asset_id.clone()))
        .unwrap_or_else(|| Vec::new(&env));

    list.push_back(policy.policy_id.clone());
    store.set(&DataKey::AssetPolicies(policy.asset_id.clone()), &list);

    log!(&env, "PolicyCreated: {:?}", policy.policy_id);
    Ok(())
}

/// Cancel a policy (authorized by holder or insurer)
pub fn cancel_policy(env: Env, policy_id: BytesN<32>, caller: Address) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Policy(policy_id.clone());

    let mut policy: InsurancePolicy = store.get(&key).ok_or(Error::AssetNotFound)?;

    // Only holder or insurer can cancel
    if caller != policy.holder && caller != policy.insurer {
        return Err(Error::Unauthorized);
    }

    // Validate status transition: only Active or Suspended policies can be cancelled
    if policy.status != PolicyStatus::Active && policy.status != PolicyStatus::Suspended {
        return Err(Error::Unauthorized);
    }

    policy.status = PolicyStatus::Cancelled;
    store.set(&key, &policy);

    log!(&env, "PolicyCancelled: {:?}", policy_id);
    Ok(())
}

/// Suspend a policy (insurer only)
pub fn suspend_policy(env: Env, policy_id: BytesN<32>, insurer: Address) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Policy(policy_id.clone());

    let mut policy: InsurancePolicy = store.get(&key).ok_or(Error::AssetNotFound)?;

    // Only insurer can suspend
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    // Validate status transition: only Active policies can be suspended
    if policy.status != PolicyStatus::Active {
        return Err(Error::Unauthorized);
    }

    policy.status = PolicyStatus::Suspended;
    store.set(&key, &policy);

    log!(&env, "PolicySuspended: {:?}", policy_id);
    Ok(())
}

/// Expire a policy (permissionless, but requires end_date < current timestamp)
pub fn expire_policy(env: Env, policy_id: BytesN<32>) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Policy(policy_id.clone());

    let mut policy: InsurancePolicy = store.get(&key).ok_or(Error::AssetNotFound)?;

    let current_time = env.ledger().timestamp();

    // Require that end_date has passed
    if policy.end_date >= current_time {
        return Err(Error::Unauthorized);
    }

    // Validate status transition: only Active or Suspended policies can expire
    if policy.status != PolicyStatus::Active && policy.status != PolicyStatus::Suspended {
        return Err(Error::Unauthorized);
    }

    policy.status = PolicyStatus::Expired;
    store.set(&key, &policy);

    log!(&env, "PolicyExpired: {:?}", policy_id);
    Ok(())
}

/// Renew a policy (insurer only)
pub fn renew_policy(
    env: Env,
    policy_id: BytesN<32>,
    new_end_date: u64,
    new_premium: i128,
    insurer: Address,
) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Policy(policy_id.clone());

    let mut policy: InsurancePolicy = store.get(&key).ok_or(Error::AssetNotFound)?;

    // Only insurer can renew
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    // Validate status transition: only Active or Expired policies can be renewed
    if policy.status != PolicyStatus::Active && policy.status != PolicyStatus::Expired {
        return Err(Error::Unauthorized);
    }

    let current_time = env.ledger().timestamp();

    // Validate new end date is in the future
    if new_end_date <= current_time {
        return Err(Error::InvalidPayment);
    }

    // Validate new premium is positive
    if new_premium <= 0 {
        return Err(Error::InvalidPayment);
    }

    // Update policy
    policy.end_date = new_end_date;
    policy.premium = new_premium;
    policy.status = PolicyStatus::Active;
    policy.last_payment = current_time;

    store.set(&key, &policy);

    log!(&env, "PolicyRenewed: {:?}", policy_id);
    Ok(())
}

/// Get all policies for a specific asset
pub fn get_asset_policies(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::AssetPolicies(asset_id))
        .unwrap_or_else(|| Vec::new(&env))
}

pub fn file_claim(env: Env, claim: InsuranceClaim) -> Result<(), Error> {
    claim.claimant.require_auth();

    let store = env.storage().persistent();
    let policy_key = DataKey::Policy(claim.policy_id.clone());

    let policy: InsurancePolicy = store.get(&policy_key).ok_or(Error::AssetNotFound)?;

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

pub fn approve_claim(env: Env, claim_id: BytesN<32>, approver: Address) -> Result<(), Error> {
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

pub fn pay_claim(env: Env, claim_id: BytesN<32>) -> Result<(), Error> {
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
