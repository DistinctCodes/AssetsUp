mod audit;
mod pause;
mod metadata;
mod types;

mod insurance;
mod lease;

#[cfg(test)]
mod tests;

use crate::types::AssetStatus;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Asset {
    pub id: BytesN<32>,
    pub name: String,
    pub description: String,
    pub category: String,
    pub owner: Address,
    pub registration_timestamp: u64,
    pub last_transfer_timestamp: u64,
    pub status: AssetStatus,
    pub metadata_uri: String,
    pub purchase_value: i128,
}

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
    AuthorizedRegistrar(Address),
    AuditLogCount,
    AuditLogs(BytesN<32>),
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
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(admin.clone()), &true);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Not initialized")
    }

    pub fn add_authorized_registrar(env: Env, caller: Address, registrar: Address) {
        caller.require_auth();
        let admin = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar), &true);
    }

    pub fn remove_authorized_registrar(env: Env, caller: Address, registrar: Address) {
        caller.require_auth();
        let admin = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar), &false);
    }

    pub fn is_authorized_registrar(env: Env, address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::AuthorizedRegistrar(address))
            .unwrap_or(false)
    }

    pub fn add_registrar(env: Env, caller: Address, registrar: Address) {
        Self::add_authorized_registrar(env, caller, registrar);
    }

    pub fn remove_registrar(env: Env, caller: Address, registrar: Address) {
        Self::remove_authorized_registrar(env, caller, registrar);
    }

    pub fn get_total_count(env: Env) -> u64 {
        env.storage().persistent().get(&DataKey::TotalCount).unwrap_or(0)
    }

    pub fn get_total_asset_count(env: Env) -> u64 {
        Self::get_total_count(env)
    }

    /// Asset Registry Functions
    pub fn register_asset(env: Env, registrar: Address, asset: Asset) {
        Self::check_not_paused(&env);
        registrar.require_auth();

        if !env
            .storage()
            .persistent()
            .get(&DataKey::AuthorizedRegistrar(registrar.clone()))
            .unwrap_or(false)
        {
            panic!("Unauthorized registrar");
        }

        let store = env.storage().persistent();
        let key = DataKey::Asset(asset.id.clone());

        if store.has(&key) {
            panic!("Asset already exists");
        }

        store.set(&key, &asset);
        Self::add_to_owner_registry(&env, &asset.owner, &asset.id);

        let mut count: u64 = store.get(&DataKey::TotalCount).unwrap_or(0);
        count += 1;
        store.set(&DataKey::TotalCount, &count);

        audit::append_audit_log(
            &env,
            asset.id.clone(),
            String::from_str(&env, "register"),
            registrar.clone(),
            String::from_str(&env, "Asset registered"),
        );

        env.events().publish(
            (symbol_short!("asset_reg"), asset.id.clone()),
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
        Self::remove_from_owner_registry(&env, &old_owner, &asset_id);

        asset.owner = new_owner.clone();
        asset.status = AssetStatus::Transferred;
        asset.last_transfer_timestamp = env.ledger().timestamp();
        store.set(&key, &asset);

        Self::add_to_owner_registry(&env, &new_owner, &asset_id);

        audit::append_audit_log(
            &env,
            asset_id.clone(),
            String::from_str(&env, "transfer"),
            caller.clone(),
            String::from_str(&env, "Asset transferred"),
        );

        env.events().publish(
            (symbol_short!("asset_tra"), asset_id.clone()),
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

        audit::append_audit_log(
            &env,
            asset_id.clone(),
            String::from_str(&env, "retire"),
            caller.clone(),
            String::from_str(&env, "Asset retired"),
        );

        env.events().publish(
            (symbol_short!("asset_ret"), asset_id),
            (caller, env.ledger().timestamp()),
        );
    }

    pub fn get_asset(env: Env, asset_id: BytesN<32>) -> Option<Asset> {
        env.storage().persistent().get(&DataKey::Asset(asset_id))
    }

    pub fn get_asset_info(env: Env, asset_id: BytesN<32>) -> Asset {
        env.storage()
            .persistent()
            .get(&DataKey::Asset(asset_id))
            .expect("Asset not found")
    }

    pub fn get_assets_by_owner(env: Env, owner: Address) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerAssets(owner))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_audit_logs(env: Env, asset_id: BytesN<32>) -> Vec<audit::AuditLog> {
        audit::get_audit_logs(&env, asset_id)
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

    fn add_to_owner_registry(env: &Env, owner: &Address, asset_id: &BytesN<32>) {
        let store = env.storage().persistent();
        let owner_key = DataKey::OwnerAssets(owner.clone());
        let mut owner_assets: Vec<BytesN<32>> = store.get(&owner_key).unwrap_or_else(|| Vec::new(env));
        if owner_assets.iter().position(|x| x == *asset_id).is_none() {
            owner_assets.push_back(asset_id.clone());
        }
        store.set(&owner_key, &owner_assets);
    }

    fn remove_from_owner_registry(env: &Env, owner: &Address, asset_id: &BytesN<32>) {
        let store = env.storage().persistent();
        let owner_key = DataKey::OwnerAssets(owner.clone());
        let mut owner_assets: Vec<BytesN<32>> = store.get(&owner_key).unwrap_or_else(|| Vec::new(env));
        if let Some(idx) = owner_assets.iter().position(|x| x == *asset_id) {
            owner_assets.remove(idx as u32);
        }
        store.set(&owner_key, &owner_assets);
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
