#![no_std]
use soroban_sdk::{Address, BytesN, Env, contract, contractimpl, contracttype};

pub(crate) mod asset;
pub(crate) mod errors;
pub(crate) mod types;

pub use types::*;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
}

#[contract]
pub struct AssetUpContract;

#[contractimpl]
impl AssetUpContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Contract is already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().persistent().get(&DataKey::Admin).unwrap()
    }

    // Asset functions
    pub fn register_asset(env: Env, asset: asset::Asset) -> Result<(), errors::ContractError> {
        // Access control
        asset.owner.require_auth();

        if asset.name.is_empty() {
            panic!("Name cannot be empty");
        }

        let key = asset::DataKey::Asset(asset.id.clone());
        let store = env.storage().persistent();
        if store.has(&key) {
            return Err(errors::ContractError::AssetAlreadyExists);
        }
        store.set(&key, &asset);
        Ok(())
    }

    pub fn get_asset(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<asset::Asset, errors::ContractError> {
        let key = asset::DataKey::Asset(asset_id);
        let store = env.storage().persistent();
        match store.get::<_, asset::Asset>(&key) {
            Some(a) => Ok(a),
            None => Err(errors::ContractError::AssetNotFound),
        }
    }

    /// Tokenize an existing asset by setting its Stellar token ID.
    ///
    /// Access: Only the contract admin (set during `initialize`) can call this.
    ///
    /// - Updates `stellar_token_id` field on the `Asset`.
    /// - Returns `AssetNotFound` if the asset ID does not exist.
    /// - Returns `Unauthorized` if caller is not the admin.
    pub fn tokenize_asset(
        env: Env,
        caller: Address,
        asset_id: BytesN<32>,
        token_id: BytesN<32>,
    ) -> Result<(), errors::ContractError> {
        // Admin-only: caller must equal stored admin and must authorize
        let admin = Self::get_admin(env.clone());
        if caller != admin {
            return Err(errors::ContractError::Unauthorized);
        }
        caller.require_auth();

        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        // Load asset or return not found
        let mut a = match store.get::<_, asset::Asset>(&key) {
            Some(a) => a,
            None => return Err(errors::ContractError::AssetNotFound),
        };

        // Update token id and persist
        a.stellar_token_id = token_id;
        store.set(&key, &a);
        Ok(())
    }
}

mod tests;
