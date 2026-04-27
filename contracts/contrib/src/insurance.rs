use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, String, Vec};
use crate::DataKey as GlobalDataKey;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyStatus {
    Active,
    Expired,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Paid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsurancePolicy {
    pub policy_id: BytesN<32>,
    pub holder: Address,
    pub insurer: Address,
    pub asset_id: BytesN<32>,
    pub coverage_amount: i128,
    pub premium: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub status: PolicyStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InsuranceClaim {
    pub claim_id: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub claimant: Address,
    pub amount: i128,
    pub description: String,
    pub submitted_at: u64,
    pub status: ClaimStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Policy(BytesN<32>),
    Claim(BytesN<32>),
    PolicyClaims(BytesN<32>),
}

pub fn create_policy(env: Env, asset_id: BytesN<32>, policy_data: InsurancePolicy) {
    let store = env.storage().persistent();
    
    // Authorization: admin or insurer
    let admin: Address = store.get(&GlobalDataKey::Admin).expect("Not initialized");
    if policy_data.insurer != admin {
        policy_data.insurer.require_auth();
    } else {
        admin.require_auth();
    }

    let key = DataKey::Policy(policy_data.policy_id.clone());
    if store.has(&key) {
        panic!("Policy already exists");
    }

    store.set(&key, &policy_data);

    env.events().publish(
        (symbol_short!("pol_cre"), policy_data.policy_id.clone()),
        (asset_id, policy_data.insurer, policy_data.holder),
    );
}

pub fn get_policy(env: Env, policy_id: BytesN<32>) -> InsurancePolicy {
    env.storage().persistent().get(&DataKey::Policy(policy_id)).expect("Policy not found")
}

pub fn cancel_policy(env: Env, policy_id: BytesN<32>, caller: Address) {
    caller.require_auth();
    let store = env.storage().persistent();
    let key = DataKey::Policy(policy_id.clone());
    let mut policy: InsurancePolicy = store.get(&key).expect("Policy not found");

    if caller != policy.holder && caller != policy.insurer {
        panic!("Unauthorized");
    }

    policy.status = PolicyStatus::Cancelled;
    store.set(&key, &policy);

    env.events().publish(
        (symbol_short!("pol_can"), policy_id),
        (caller, env.ledger().timestamp()),
    );
}

pub fn is_policy_active(env: Env, policy_id: BytesN<32>) -> bool {
    let store = env.storage().persistent();
    let policy: InsurancePolicy = store.get(&DataKey::Policy(policy_id)).expect("Policy not found");
    
    let current_time = env.ledger().timestamp();
    policy.status == PolicyStatus::Active && current_time >= policy.start_date && current_time <= policy.end_date
}

pub fn submit_claim(env: Env, policy_id: BytesN<32>, amount: i128, description: String, claimant: Address) {
    claimant.require_auth();
    
    if !is_policy_active(env.clone(), policy_id.clone()) {
        panic!("Policy is not active");
    }

    let policy: InsurancePolicy = get_policy(env.clone(), policy_id.clone());
    if claimant != policy.holder {
        panic!("Only policy holder can submit claim");
    }

    let claim_id_bytes = env.crypto().sha256(&policy_id.clone().into());
    let claim_id: BytesN<32> = claim_id_bytes.into();
    let claim = InsuranceClaim {
        claim_id: claim_id.clone(),
        policy_id: policy_id.clone(),
        claimant: claimant.clone(),
        amount,
        description,
        submitted_at: env.ledger().timestamp(),
        status: ClaimStatus::Submitted,
    };

    let store = env.storage().persistent();
    let claim_key = DataKey::Claim(claim.claim_id.clone());
    if store.has(&claim_key) {
        panic!("Claim already exists");
    }

    store.set(&claim_key, &claim);

    // Update policy claims list
    let list_key = DataKey::PolicyClaims(policy_id);
    let mut claims: Vec<BytesN<32>> = store.get(&list_key).unwrap_or_else(|| Vec::new(&env));
    claims.push_back(claim.claim_id.clone());
    store.set(&list_key, &claims);

    env.events().publish(
        (symbol_short!("clm_sub"), claim.claim_id.clone()),
        (claim.policy_id, claimant, amount),
    );
}

pub fn update_claim_status(env: Env, claim_id: BytesN<32>, new_status: ClaimStatus, insurer: Address) {
    insurer.require_auth();
    let store = env.storage().persistent();
    let claim_key = DataKey::Claim(claim_id.clone());
    let mut claim: InsuranceClaim = store.get(&claim_key).expect("Claim not found");

    let policy = get_policy(env.clone(), claim.policy_id.clone());
    if insurer != policy.insurer {
        panic!("Unauthorized: Only insurer can update claim status");
    }

    claim.status = new_status;
    store.set(&claim_key, &claim);

    env.events().publish(
        (symbol_short!("clm_upd"), claim_id),
        (claim.status, env.ledger().timestamp()),
    );
}

pub fn get_claim(env: Env, claim_id: BytesN<32>) -> InsuranceClaim {
    env.storage().persistent().get(&DataKey::Claim(claim_id)).expect("Claim not found")
}

pub fn get_claims_for_policy(env: Env, policy_id: BytesN<32>) -> Vec<BytesN<32>> {
    env.storage().persistent().get(&DataKey::PolicyClaims(policy_id)).unwrap_or_else(|| Vec::new(&env))
}
