mod pause;
mod metadata;

mod insurance;
mod lease;

#[cfg(test)]
mod tests;

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String, Vec};

pub struct Contract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetInfo {
    pub id: BytesN<32>,
    pub name: String,
    pub category: String,
    pub owner: Address,
    pub status: AssetStatus,
}

/// Storage keys for type-safe contract state access.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Asset(BytesN<32>),
    OwnerAssets(Address),
    TotalCount,
    Admin,
    Paused,
}

#[contract]
pub struct ContribContract;

#[contractimpl]
impl ContribContract {
    /// Initialize the contract with an admin.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Paused, &false);
        env.storage().persistent().set(&DataKey::TotalCount, &0u64);
    }

    // --- Asset Registry Functions ---

    pub fn register_asset(env: Env, asset: Asset) {
        Self::check_not_paused(&env);
        
        let store = env.storage().persistent();
        let key = DataKey::Asset(asset.id.clone());
        
        if store.has(&key) {
            panic!("Asset already exists");
        }

        store.set(&key, &asset);

        // Update owner's asset list
        let owner_key = DataKey::OwnerAssets(asset.owner.clone());
        let mut owner_assets: Vec<BytesN<32>> = store.get(&owner_key).unwrap_or_else(|| Vec::new(&env));
        owner_assets.push_back(asset.id.clone());
        store.set(&owner_key, &owner_assets);

        // Update total count
        let mut count: u64 = store.get(&DataKey::TotalCount).unwrap_or(0);
        count += 1;
        store.set(&DataKey::TotalCount, &count);

        env.events().publish(
            (symbol_short!("asset_reg"), asset.id),
            (asset.owner, env.ledger().timestamp()),
        );
    }

    pub fn transfer_asset(env: Env, asset_id: BytesN<32>, new_owner: Address, caller: Address) {
        Self::check_not_paused(&env);
        caller.require_auth();

        let store = env.storage().persistent();
        let key = DataKey::Asset(asset_id.clone());
        
        let mut asset: Asset = store.get(&key).expect("Asset not found");
        
        if asset.owner != caller {
            panic!("Unauthorized");
        }

        if asset.status == AssetStatus::Retired {
            panic!("Asset is retired");
        }

        let old_owner = asset.owner.clone();
        
        // Update old owner's list
        let old_owner_key = DataKey::OwnerAssets(old_owner.clone());
        let mut old_assets: Vec<BytesN<32>> = store.get(&old_owner_key).unwrap_or_else(|| Vec::new(&env));
        if let Some(idx) = old_assets.iter().position(|x| x == asset_id) {
            old_assets.remove(idx as u32);
        }
        store.set(&old_owner_key, &old_assets);

        // Update asset
        asset.owner = new_owner.clone();
        asset.status = AssetStatus::Transferred;
        asset.last_transfer_timestamp = env.ledger().timestamp();
        store.set(&key, &asset);

        // Update new owner's list
        let new_owner_key = DataKey::OwnerAssets(new_owner.clone());
        let mut new_assets: Vec<BytesN<32>> = store.get(&new_owner_key).unwrap_or_else(|| Vec::new(&env));
        new_assets.push_back(asset_id.clone());
        store.set(&new_owner_key, &new_assets);

        env.events().publish(
            (symbol_short!("asset_tra"), asset_id),
            (old_owner, new_owner, env.ledger().timestamp()),
        );
    }

    pub fn retire_asset(env: Env, asset_id: BytesN<32>, caller: Address) {
        Self::check_not_paused(&env);
        caller.require_auth();

        let store = env.storage().persistent();
        let key = DataKey::Asset(asset_id.clone());
        
        let mut asset: Asset = store.get(&key).expect("Asset not found");
        
        if asset.owner != caller {
            panic!("Unauthorized");
        }

        if asset.status == AssetStatus::Retired {
            panic!("Already retired");
        }

        asset.status = AssetStatus::Retired;
        store.set(&key, &asset);

        env.events().publish(
            (symbol_short!("asset_ret"), asset_id),
            (caller, env.ledger().timestamp()),
        );
    }

    pub fn get_asset_info(env: Env, asset_id: BytesN<32>) -> AssetInfo {
        let store = env.storage().persistent();
        let asset: Asset = store.get(&DataKey::Asset(asset_id)).expect("Asset not found");
        
        AssetInfo {
            id: asset.id,
            name: asset.name,
            category: asset.category,
            owner: asset.owner,
            status: asset.status,
        }
    }

    pub fn pause_contract(env: Env, caller: Address) {
        caller.require_auth();
        let admin: Address = env.storage().persistent().get(&DataKey::Admin).expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage().persistent().set(&DataKey::Paused, &true);
    }

    pub fn unpause_contract(env: Env, caller: Address) {
        caller.require_auth();
        let admin: Address = env.storage().persistent().get(&DataKey::Admin).expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage().persistent().set(&DataKey::Paused, &false);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().persistent().get(&DataKey::Paused).unwrap_or(false)
    }

    fn check_not_paused(env: &Env) {
        if env.storage().persistent().get(&DataKey::Paused).unwrap_or(false) {
            panic!("Contract is paused");
        }
    }

    // --- Insurance Functions ---

    pub fn create_policy(env: Env, asset_id: BytesN<32>, policy_data: insurance::InsurancePolicy) {
        insurance::create_policy(env, asset_id, policy_data);
    }

    pub fn get_policy(env: Env, policy_id: BytesN<32>) -> insurance::InsurancePolicy {
        insurance::get_policy(env, policy_id)
    }

    pub fn cancel_policy(env: Env, policy_id: BytesN<32>, caller: Address) {
        insurance::cancel_policy(env, policy_id, caller);
    }

    pub fn is_policy_active(env: Env, policy_id: BytesN<32>) -> bool {
        insurance::is_policy_active(env, policy_id)
    }

    pub fn submit_claim(env: Env, policy_id: BytesN<32>, amount: i128, description: String, claimant: Address) {
        insurance::submit_claim(env, policy_id, amount, description, claimant);
    }

    pub fn update_claim_status(env: Env, claim_id: BytesN<32>, new_status: insurance::ClaimStatus, insurer: Address) {
        insurance::update_claim_status(env, claim_id, new_status, insurer);
    }

    pub fn get_claim(env: Env, claim_id: BytesN<32>) -> insurance::InsuranceClaim {
        insurance::get_claim(env, claim_id)
    }

    pub fn get_claims_for_policy(env: Env, policy_id: BytesN<32>) -> Vec<BytesN<32>> {
        insurance::get_claims_for_policy(env, policy_id)
    }

    // --- Lease Functions ---

    pub fn create_lease(
        env: Env,
        asset_id: BytesN<32>,
        lessee: Address,
        start: u64,
        end: u64,
        rent: i128,
        deposit: i128,
        lessor: Address,
    ) -> BytesN<32> {
        lease::create_lease(env, asset_id, lessee, start, end, rent, deposit, lessor)
    }

    pub fn check_in_lease(env: Env, lease_id: BytesN<32>, caller: Address) {
        lease::check_in_lease(env, lease_id, caller);
    }

    pub fn cancel_lease(env: Env, lease_id: BytesN<32>, caller: Address) {
        lease::cancel_lease(env, lease_id, caller);
    }

    pub fn get_active_leases(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
        lease::get_active_leases(env, asset_id)
    }
}

