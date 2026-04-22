#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Symbol, Vec};

#[cfg(test)]
mod tests;

/// Represents the current operational status of an asset.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}

/// Represents a registered asset in the system.
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
}

#[contract]
pub struct ContribContract;

#[contractimpl]
impl ContribContract {
    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("contract already initialized");
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(admin.clone()), &true);
        env.storage().persistent().set(&DataKey::TotalCount, &0u64);
    }

    pub fn register_asset(env: Env, registrar: Address, asset_data: Asset) {
        registrar.require_auth();

        let is_authorized: bool = env
            .storage()
            .persistent()
            .get(&DataKey::AuthorizedRegistrar(registrar))
            .unwrap_or_default();
        if !is_authorized {
            panic!("registrar is not authorized");
        }

        let asset_key = DataKey::Asset(asset_data.id.clone());
        let store = env.storage().persistent();

        if store.has(&asset_key) {
            panic!("asset already exists");
        }

        store.set(&asset_key, &asset_data);

        let owner_key = DataKey::OwnerAssets(asset_data.owner.clone());
        let mut owner_assets: Vec<BytesN<32>> = store
            .get(&owner_key)
            .unwrap_or_else(|| Vec::new(&env));
        owner_assets.push_back(asset_data.id.clone());
        store.set(&owner_key, &owner_assets);

        let total_count: u64 = store.get(&DataKey::TotalCount).unwrap_or_default();
        store.set(&DataKey::TotalCount, &(total_count + 1));

        env.events().publish(
            (Symbol::new(&env, "asset"), Symbol::new(&env, "registered")),
            (asset_data.id.clone(), asset_data.owner.clone()),
        );
    }

    pub fn add_authorized_registrar(env: Env, registrar: Address) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("admin not set");
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar), &true);
    }

    pub fn is_authorized_registrar(env: Env, address: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::AuthorizedRegistrar(address))
            .unwrap_or_default()
    }

    pub fn get_total_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalCount)
            .unwrap_or_default()
    }

    pub fn transfer_asset(env: Env, asset_id: BytesN<32>, new_owner: Address) {
        let store = env.storage().persistent();

        let asset_key = DataKey::Asset(asset_id.clone());
        let mut asset: Asset = store
            .get(&asset_key)
            .expect("asset not found");

        if asset.status == AssetStatus::Retired {
            panic!("cannot transfer a retired asset");
        }

        let old_owner = asset.owner.clone();
        old_owner.require_auth();

        let old_owner_key = DataKey::OwnerAssets(old_owner.clone());
        let old_owner_assets: Vec<BytesN<32>> = store
            .get(&old_owner_key)
            .unwrap_or_else(|| Vec::new(&env));
        let mut removed = false;
        let mut updated_list = Vec::new(&env);
        for i in 0..old_owner_assets.len() {
            let id = old_owner_assets.get(i).unwrap();
            if id == asset_id && !removed {
                removed = true;
            } else {
                updated_list.push_back(id);
            }
        }
        if updated_list.is_empty() {
            store.remove(&old_owner_key);
        } else {
            store.set(&old_owner_key, &updated_list);
        }

        let new_owner_key = DataKey::OwnerAssets(new_owner.clone());
        let mut new_owner_assets: Vec<BytesN<32>> = store
            .get(&new_owner_key)
            .unwrap_or_else(|| Vec::new(&env));
        new_owner_assets.push_back(asset_id.clone());
        store.set(&new_owner_key, &new_owner_assets);

        asset.owner = new_owner.clone();
        asset.last_transfer_timestamp = env.ledger().timestamp();
        store.set(&asset_key, &asset);

        env.events().publish(
            (Symbol::new(&env, "asset"), Symbol::new(&env, "transferred")),
            (asset_id, old_owner, new_owner),
        );
    }

    pub fn get_asset(env: Env, id: BytesN<32>) -> Option<Asset> {
        env.storage().persistent().get(&DataKey::Asset(id))
    }
}
