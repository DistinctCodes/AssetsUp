use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct InsuranceClaim {
    pub claim_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub policy_id: BytesN<32>,
    pub claimant: Address,
    pub amount: i128,
    pub description: String,
    pub status: ClaimStatus,
    pub payout_amount: i128,
    pub filed_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Claim(BytesN<32>),
    AssetClaims(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    ClaimNotFound = 1,
    Unauthorized = 2,
    InvalidClaimAmount = 3,
    ClaimAlreadyExists = 4,
    InvalidClaimStatus = 5,
}

#[contract]
pub struct InsuranceClaimContract;

#[contractimpl]
impl InsuranceClaimContract {
    pub fn init(env: Env, admin: Address) {
        let store = env.storage().persistent();
        if store.has(&DataKey::Admin) {
            panic!("contract already initialized");
        }
        admin.require_auth();
        store.set(&DataKey::Admin, &admin);
    }

    pub fn file_insurance_claim(
        env: Env,
        asset_id: BytesN<32>,
        policy_id: BytesN<32>,
        claim_amount: i128,
        description: String,
    ) -> Result<BytesN<32>, ContractError> {
        let claimant = env.invoker();
        claimant.require_auth();

        if claim_amount <= 0 {
            return Err(ContractError::InvalidClaimAmount);
        }

        let store = env.storage().persistent();
        let mut claim_id_bytes = env.crypto().sha256(&policy_id.clone().into());
        let mut claim_id: BytesN<32> = claim_id_bytes.into();
        let mut attempt = 0u32;
        while store.has(&DataKey::Claim(claim_id.clone())) {
            attempt = attempt.checked_add(1).unwrap();
            if attempt > 16 {
                panic!("unable to generate unique claim id");
            }
            claim_id_bytes = env.crypto().sha256(&claim_id.clone().into());
            claim_id = claim_id_bytes.into();
        }

        let claim = InsuranceClaim {
            claim_id: claim_id.clone(),
            asset_id: asset_id.clone(),
            policy_id: policy_id.clone(),
            claimant: claimant.clone(),
            amount: claim_amount,
            description: description.clone(),
            status: ClaimStatus::Pending,
            payout_amount: 0,
            filed_at: env.ledger().timestamp(),
        };

        store.set(&DataKey::Claim(claim_id.clone()), &claim);

        let mut asset_claims: Vec<BytesN<32>> = store
            .get(&DataKey::AssetClaims(asset_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        asset_claims.push_back(claim_id.clone());
        store.set(&DataKey::AssetClaims(asset_id.clone()), &asset_claims);

        env.events().publish(
            (symbol_short!("claim_filed"), claim_id.clone()),
            (
                claim.asset_id.clone(),
                claim.policy_id.clone(),
                claim.claimant.clone(),
                claim.amount,
                claim.description.clone(),
            ),
        );

        Ok(claim_id)
    }

    pub fn settle_claim(
        env: Env,
        claim_id: BytesN<32>,
        approved: bool,
        payout_amount: i128,
    ) -> Result<(), ContractError> {
        if payout_amount < 0 {
            return Err(ContractError::InvalidClaimAmount);
        }

        let store = env.storage().persistent();
        let admin: Address = store
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        admin.require_auth();

        let claim_key = DataKey::Claim(claim_id.clone());
        let mut claim: InsuranceClaim = store
            .get(&claim_key)
            .ok_or(ContractError::ClaimNotFound)?;

        if claim.status != ClaimStatus::Pending {
            return Err(ContractError::InvalidClaimStatus);
        }

        if approved {
            claim.payout_amount = payout_amount;
            claim.status = if payout_amount > 0 {
                ClaimStatus::Paid
            } else {
                ClaimStatus::Approved
            };
        } else {
            if payout_amount != 0 {
                return Err(ContractError::InvalidClaimAmount);
            }
            claim.status = ClaimStatus::Rejected;
        }

        store.set(&claim_key, &claim);

        env.events().publish(
            (symbol_short!("claim_settled"), claim_id.clone()),
            (approved, claim.payout_amount, claim.status.clone()),
        );

        Ok(())
    }

    pub fn get_insurance_claim(
        env: Env,
        claim_id: BytesN<32>,
    ) -> Result<InsuranceClaim, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Claim(claim_id))
            .ok_or(ContractError::ClaimNotFound)
    }

    pub fn get_asset_claims(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::AssetClaims(asset_id))
            .unwrap_or_else(|| Vec::new(&env))
    }
}
