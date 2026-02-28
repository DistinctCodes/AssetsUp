#![allow(clippy::too_many_arguments)]

use soroban_sdk::{contracttype, Address, BytesN, Env, Vec, symbol_short};

use crate::error::Error;

// ── Enums ───────────────────────────────────────────────────────────────────

/// Lifecycle states of an insurance policy.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyStatus {
    Active,
    Expired,
    Cancelled,
    Suspended,
}

/// Lifecycle states of an insurance claim.
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

/// Category of coverage offered by a policy.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyType {
    Comprehensive,
    Theft,
    Damage,
    Liability,
    BusinessInterruption,
}

/// Nature of an insurance claim.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimType {
    Theft,
    Damage,
    Loss,
    Liability,
    Other,
}

// ── Structs ──────────────────────────────────────────────────────────────────

/// An insurance policy covering a registered asset.
#[contracttype]
#[derive(Clone, Debug)]
pub struct InsurancePolicy {
    pub policy_id: BytesN<32>,
    pub holder: Address,
    pub insurer: Address,
    pub asset_id: BytesN<32>,
    /// Category of coverage.
    pub policy_type: PolicyType,
    /// Maximum payout (in stroops).
    pub coverage_amount: i128,
    /// Amount the holder must bear before coverage kicks in (stroops).
    pub deductible: i128,
    /// Periodic premium cost (stroops).
    pub premium: i128,
    /// Ledger timestamp when coverage begins.
    pub start_date: u64,
    /// Ledger timestamp when coverage ends.
    pub end_date: u64,
    pub status: PolicyStatus,
    pub auto_renew: bool,
    /// Timestamp of last premium payment (0 = not yet paid).
    pub last_payment: u64,
}

/// A claim filed against an active policy.
#[contracttype]
#[derive(Clone, Debug)]
pub struct InsuranceClaim {
    pub claim_id: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub claimant: Address,
    /// Nature of the claim.
    pub claim_type: ClaimType,
    /// Amount requested (stroops).
    pub amount: i128,
    pub status: ClaimStatus,
    /// Ledger timestamp when the claim was filed.
    pub filed_at: u64,
    /// Final approved payout amount (0 until approved).
    pub approved_amount: i128,
}

/// Storage keys used by the insurance module.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Policy(BytesN<32>),
    Claim(BytesN<32>),
    /// List of policy_ids registered for an asset.
    AssetPolicies(BytesN<32>),
    /// List of claim_ids filed for an asset.
    AssetClaims(BytesN<32>),
}

// ── Internal helpers ─────────────────────────────────────────────────────────

fn load_policy(env: &Env, policy_id: &BytesN<32>) -> Result<InsurancePolicy, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Policy(policy_id.clone()))
        .ok_or(Error::PolicyNotFound)
}

fn load_claim(env: &Env, claim_id: &BytesN<32>) -> Result<InsuranceClaim, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Claim(claim_id.clone()))
        .ok_or(Error::ClaimNotFound)
}

fn save_policy(env: &Env, policy: &InsurancePolicy) {
    env.storage()
        .persistent()
        .set(&DataKey::Policy(policy.policy_id.clone()), policy);
}

fn save_claim(env: &Env, claim: &InsuranceClaim) {
    env.storage()
        .persistent()
        .set(&DataKey::Claim(claim.claim_id.clone()), claim);
}

// ── Policy operations ────────────────────────────────────────────────────────

/// Register a new insurance policy for an asset.
/// The insurer must authenticate.
pub fn create_policy(env: Env, policy: InsurancePolicy) -> Result<(), Error> {
    policy.insurer.require_auth();

    if policy.coverage_amount <= 0 || policy.deductible >= policy.coverage_amount {
        return Err(Error::InvalidPayment);
    }
    if policy.end_date <= policy.start_date {
        return Err(Error::InvalidPayment);
    }

    let store = env.storage().persistent();

    if store.has(&DataKey::Policy(policy.policy_id.clone())) {
        return Err(Error::PolicyAlreadyExists);
    }

    store.set(&DataKey::Policy(policy.policy_id.clone()), &policy);

    // Index by asset
    let mut list: Vec<BytesN<32>> = store
        .get(&DataKey::AssetPolicies(policy.asset_id.clone()))
        .unwrap_or_else(|| Vec::new(&env));
    list.push_back(policy.policy_id.clone());
    store.set(&DataKey::AssetPolicies(policy.asset_id.clone()), &list);

    env.events().publish(
        (symbol_short!("pol_cr"),),
        (policy.policy_id, policy.asset_id, policy.insurer, env.ledger().timestamp()),
    );

    Ok(())
}

/// Cancel an active policy.
/// Either the holder or the insurer may cancel.
pub fn cancel_policy(env: Env, policy_id: BytesN<32>, caller: Address) -> Result<(), Error> {
    caller.require_auth();

    let mut policy = load_policy(&env, &policy_id)?;

    if policy.status != PolicyStatus::Active {
        return Err(Error::PolicyNotActive);
    }
    if caller != policy.holder && caller != policy.insurer {
        return Err(Error::Unauthorized);
    }

    policy.status = PolicyStatus::Cancelled;
    save_policy(&env, &policy);

    env.events().publish(
        (symbol_short!("pol_cx"),),
        (policy_id, caller, env.ledger().timestamp()),
    );

    Ok(())
}

/// Suspend an active policy.
/// Only the insurer may suspend (e.g. missed premium payment).
pub fn suspend_policy(env: Env, policy_id: BytesN<32>, insurer: Address) -> Result<(), Error> {
    insurer.require_auth();

    let mut policy = load_policy(&env, &policy_id)?;

    if policy.status != PolicyStatus::Active {
        return Err(Error::PolicyNotActive);
    }
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    policy.status = PolicyStatus::Suspended;
    save_policy(&env, &policy);

    env.events().publish(
        (symbol_short!("pol_sus"),),
        (policy_id, insurer, env.ledger().timestamp()),
    );

    Ok(())
}

/// Mark a policy as expired once its end_date has passed.
/// Anyone may call this permissionlessly.
pub fn expire_policy(env: Env, policy_id: BytesN<32>) -> Result<(), Error> {
    let mut policy = load_policy(&env, &policy_id)?;

    if policy.status != PolicyStatus::Active {
        return Err(Error::PolicyNotActive);
    }
    if env.ledger().timestamp() < policy.end_date {
        return Err(Error::PolicyNotExpired);
    }

    policy.status = PolicyStatus::Expired;
    save_policy(&env, &policy);

    env.events().publish(
        (symbol_short!("pol_ex"),),
        (policy_id, env.ledger().timestamp()),
    );

    Ok(())
}

/// Renew an expired or active policy with a new end date.
/// Only the insurer may renew.
pub fn renew_policy(
    env: Env,
    policy_id: BytesN<32>,
    new_end_date: u64,
    insurer: Address,
) -> Result<(), Error> {
    insurer.require_auth();

    let mut policy = load_policy(&env, &policy_id)?;

    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }
    // Can renew Active or Expired policies (not Cancelled/Suspended).
    if policy.status == PolicyStatus::Cancelled || policy.status == PolicyStatus::Suspended {
        return Err(Error::PolicyNotActive);
    }
    if new_end_date <= env.ledger().timestamp() {
        return Err(Error::InvalidPayment);
    }

    policy.end_date = new_end_date;
    policy.status = PolicyStatus::Active;
    policy.last_payment = env.ledger().timestamp();
    save_policy(&env, &policy);

    env.events().publish(
        (symbol_short!("pol_ren"),),
        (policy_id, insurer, new_end_date),
    );

    Ok(())
}

// ── Claim operations ─────────────────────────────────────────────────────────

/// File a claim against an active policy.
/// The claimant must authenticate.
pub fn file_claim(env: Env, claim: InsuranceClaim) -> Result<(), Error> {
    claim.claimant.require_auth();

    if claim.amount <= 0 {
        return Err(Error::InvalidPayment);
    }

    let store = env.storage().persistent();
    let policy: InsurancePolicy = store
        .get(&DataKey::Policy(claim.policy_id.clone()))
        .ok_or(Error::PolicyNotFound)?;

    if policy.status != PolicyStatus::Active {
        return Err(Error::PolicyNotActive);
    }
    if claim.amount > policy.coverage_amount {
        return Err(Error::InvalidPayment);
    }

    if store.has(&DataKey::Claim(claim.claim_id.clone())) {
        return Err(Error::ClaimAlreadyExists);
    }

    store.set(&DataKey::Claim(claim.claim_id.clone()), &claim);

    // Index claims by asset
    let mut asset_claims: Vec<BytesN<32>> = store
        .get(&DataKey::AssetClaims(claim.asset_id.clone()))
        .unwrap_or_else(|| Vec::new(&env));
    asset_claims.push_back(claim.claim_id.clone());
    store.set(&DataKey::AssetClaims(claim.asset_id.clone()), &asset_claims);

    env.events().publish(
        (symbol_short!("clm_fil"),),
        (claim.claim_id, claim.policy_id, claim.claimant, env.ledger().timestamp()),
    );

    Ok(())
}

/// Move a submitted claim into the UnderReview state.
/// Only the policy's insurer may do this.
pub fn mark_claim_under_review(
    env: Env,
    claim_id: BytesN<32>,
    insurer: Address,
) -> Result<(), Error> {
    insurer.require_auth();

    let mut claim = load_claim(&env, &claim_id)?;

    if claim.status != ClaimStatus::Submitted {
        return Err(Error::InvalidClaimStatus);
    }

    let policy = load_policy(&env, &claim.policy_id)?;
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    claim.status = ClaimStatus::UnderReview;
    save_claim(&env, &claim);

    env.events().publish(
        (symbol_short!("clm_rev"),),
        (claim_id, insurer, env.ledger().timestamp()),
    );

    Ok(())
}

/// Approve a claim and set the approved payout amount.
/// Only the policy's insurer may approve.
pub fn approve_claim(
    env: Env,
    claim_id: BytesN<32>,
    insurer: Address,
    approved_amount: i128,
) -> Result<(), Error> {
    insurer.require_auth();

    let mut claim = load_claim(&env, &claim_id)?;

    if claim.status != ClaimStatus::Submitted && claim.status != ClaimStatus::UnderReview {
        return Err(Error::InvalidClaimStatus);
    }

    let policy = load_policy(&env, &claim.policy_id)?;
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }
    if approved_amount <= 0 || approved_amount > policy.coverage_amount {
        return Err(Error::InvalidPayment);
    }

    claim.status = ClaimStatus::Approved;
    claim.approved_amount = approved_amount;
    save_claim(&env, &claim);

    env.events().publish(
        (symbol_short!("clm_app"),),
        (claim_id, insurer, approved_amount),
    );

    Ok(())
}

/// Reject a submitted or under-review claim.
/// Only the policy's insurer may reject.
pub fn reject_claim(
    env: Env,
    claim_id: BytesN<32>,
    insurer: Address,
) -> Result<(), Error> {
    insurer.require_auth();

    let mut claim = load_claim(&env, &claim_id)?;

    if claim.status != ClaimStatus::Submitted && claim.status != ClaimStatus::UnderReview {
        return Err(Error::InvalidClaimStatus);
    }

    let policy = load_policy(&env, &claim.policy_id)?;
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    claim.status = ClaimStatus::Rejected;
    save_claim(&env, &claim);

    env.events().publish(
        (symbol_short!("clm_rej"),),
        (claim_id, insurer, env.ledger().timestamp()),
    );

    Ok(())
}

/// Dispute a rejected claim. Only the original claimant may dispute.
pub fn dispute_claim(
    env: Env,
    claim_id: BytesN<32>,
    claimant: Address,
) -> Result<(), Error> {
    claimant.require_auth();

    let mut claim = load_claim(&env, &claim_id)?;

    if claim.status != ClaimStatus::Rejected {
        return Err(Error::InvalidClaimStatus);
    }
    if claimant != claim.claimant {
        return Err(Error::Unauthorized);
    }

    claim.status = ClaimStatus::Disputed;
    save_claim(&env, &claim);

    env.events().publish(
        (symbol_short!("clm_dis"),),
        (claim_id, claimant, env.ledger().timestamp()),
    );

    Ok(())
}

/// Mark an approved claim as paid.
/// The insurer confirms off-chain payment has been processed.
pub fn pay_claim(env: Env, claim_id: BytesN<32>, insurer: Address) -> Result<(), Error> {
    insurer.require_auth();

    let mut claim = load_claim(&env, &claim_id)?;

    if claim.status != ClaimStatus::Approved {
        return Err(Error::InvalidClaimStatus);
    }

    let policy = load_policy(&env, &claim.policy_id)?;
    if insurer != policy.insurer {
        return Err(Error::Unauthorized);
    }

    claim.status = ClaimStatus::Paid;
    save_claim(&env, &claim);

    env.events().publish(
        (symbol_short!("clm_pay"),),
        (claim_id, insurer, claim.approved_amount),
    );

    Ok(())
}

// ── Read operations ──────────────────────────────────────────────────────────

pub fn get_policy(env: Env, policy_id: BytesN<32>) -> Result<InsurancePolicy, Error> {
    load_policy(&env, &policy_id)
}

pub fn get_claim(env: Env, claim_id: BytesN<32>) -> Result<InsuranceClaim, Error> {
    load_claim(&env, &claim_id)
}

/// Return all policy IDs registered for an asset.
pub fn get_asset_policies(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::AssetPolicies(asset_id))
        .unwrap_or_else(|| Vec::new(&env))
}

/// Return all claim IDs filed for an asset.
pub fn get_asset_claims(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::AssetClaims(asset_id))
        .unwrap_or_else(|| Vec::new(&env))
}
