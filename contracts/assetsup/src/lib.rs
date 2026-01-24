#![no_std]

use crate::error::{Error, handle_error};
use soroban_sdk::{Address, BytesN, Env, String, Vec, contract, contractimpl, contracttype, symbol_short};

pub(crate) mod asset;
pub(crate) mod audit;
pub(crate) mod branch;
pub(crate) mod error;
pub(crate) mod types;

pub use types::*;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    ScheduledTransfer(BytesN<32>),
    PendingApproval(BytesN<32>),
}

#[contract]
pub struct AssetUpContract;

#[contractimpl]
impl AssetUpContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            handle_error(&env, Error::AlreadyInitialized)
        }
        
        // Set admin
        env.storage().persistent().set(&DataKey::Admin, &admin);
        
        // Initialize contract state
        env.storage().persistent().set(&DataKey::Paused, &false);
        env.storage().persistent().set(&DataKey::TotalAssetCount, &0u64);
        
        // Set contract metadata
        let metadata = ContractMetadata {
            version: String::from_str(&env, "1.0.0"),
            name: String::from_str(&env, "AssetUp Registry"),
            description: String::from_str(&env, "Professional asset registry smart contract"),
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::ContractMetadata, &metadata);
        
        // Add admin as first authorized registrar
        env.storage().persistent().set(&DataKey::AuthorizedRegistrar(admin.clone()), &true);
        
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        let key = DataKey::Admin;
        if !env.storage().persistent().has(&key) {
            handle_error(&env, Error::AdminNotFound)
        }

        let admin = env.storage().persistent().get(&key).unwrap();
        Ok(admin)
    }

    pub fn is_paused(env: Env) -> Result<bool, Error> {
        Ok(env.storage().persistent().get(&DataKey::Paused).unwrap_or(false))
    }

    pub fn get_total_asset_count(env: Env) -> Result<u64, Error> {
        Ok(env.storage().persistent().get(&DataKey::TotalAssetCount).unwrap_or(0u64))
    }

    pub fn get_contract_metadata(env: Env) -> Result<ContractMetadata, Error> {
        let metadata = env.storage().persistent().get(&DataKey::ContractMetadata);
        match metadata {
            Some(m) => Ok(m),
            None => handle_error(&env, Error::ContractNotInitialized),
        }
    }

    pub fn is_authorized_registrar(env: Env, address: Address) -> Result<bool, Error> {
        Ok(env.storage().persistent().get(&DataKey::AuthorizedRegistrar(address)).unwrap_or(false))
    }

    // Asset functions
    pub fn register_asset(env: Env, asset: asset::Asset, caller: Address) -> Result<(), Error> {
        // Check if contract is paused
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        // Check if caller is authorized registrar
        if !Self::is_authorized_registrar(env.clone(), caller.clone())? {
            return Err(Error::Unauthorized);
        }

        // Validate asset data
        Self::validate_asset(&env, &asset)?;

        let key = asset::DataKey::Asset(asset.id.clone());
        let store = env.storage().persistent();
        
        // Check if asset already exists
        if store.has(&key) {
            return Err(Error::AssetAlreadyExists);
        }

        // Store asset
        store.set(&key, &asset);

        // Update owner registry
        let owner_key = asset::DataKey::OwnerRegistry(asset.owner.clone());
        let mut owner_assets: Vec<BytesN<32>> = store.get(&owner_key).unwrap_or_else(|| Vec::new(&env));
        owner_assets.push_back(asset.id.clone());
        store.set(&owner_key, &owner_assets);

        // Update total asset count
        let mut total_count = Self::get_total_asset_count(env.clone())?;
        total_count += 1;
        env.storage().persistent().set(&DataKey::TotalAssetCount, &total_count);

        // Emit event
        env.events().publish(
            (symbol_short!("asset_reg"),),
            (asset.owner, asset.id, env.ledger().timestamp()),
        );

        Ok(())
    }

    fn validate_asset(env: &Env, asset: &asset::Asset) -> Result<(), Error> {
        // Validate asset name length (3-100 characters)
        if asset.name.len() < 3 || asset.name.len() > 100 {
            return Err(Error::InvalidAssetName);
        }

        // Validate purchase value is non-negative
        if asset.purchase_value < 0 {
            return Err(Error::InvalidPurchaseValue);
        }

        // Validate metadata URI format (basic check for IPFS hash format)
        if !asset.metadata_uri.is_empty() && !Self::is_valid_metadata_uri(&asset.metadata_uri) {
            return Err(Error::InvalidMetadataUri);
        }

        // Validate owner address is not zero address
        let zero_address = Address::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
        if asset.owner == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        Ok(())
    }

    fn is_valid_metadata_uri(uri: &String) -> bool {
        // For Soroban String, we'll use a simple length check and basic pattern matching
        // In a real implementation, you might want to convert to bytes for more detailed validation
        let uri_len = uri.len();
        // Basic validation: check for reasonable length and common prefixes
        uri_len > 10 && (uri_len < 500)
    }

    pub fn update_asset_metadata(
        env: Env,
        asset_id: BytesN<32>,
        new_description: Option<String>,
        new_metadata_uri: Option<String>,
        new_custom_attributes: Option<Vec<types::CustomAttribute>>,
        caller: Address,
    ) -> Result<(), Error> {
        // Check if contract is paused
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        let mut asset = match store.get::<_, asset::Asset>(&key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Only asset owner or admin can update metadata
        let admin = Self::get_admin(env.clone())?;
        if caller != asset.owner && caller != admin {
            return Err(Error::Unauthorized);
        }

        // Update metadata if provided
        if let Some(description) = new_description {
            asset.description = description;
        }

        if let Some(metadata_uri) = new_metadata_uri {
            if !metadata_uri.is_empty() && !Self::is_valid_metadata_uri(&metadata_uri) {
                return Err(Error::InvalidMetadataUri);
            }
            asset.metadata_uri = metadata_uri;
        }

        if let Some(custom_attributes) = new_custom_attributes {
            asset.custom_attributes = custom_attributes;
        }

        store.set(&key, &asset);

        // Emit event
        env.events().publish(
            (symbol_short!("asset_upd"),),
            (asset_id, caller, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn transfer_asset_ownership(
        env: Env,
        asset_id: BytesN<32>,
        new_owner: Address,
        caller: Address,
    ) -> Result<(), Error> {
        // Check if contract is paused
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        // Validate new owner is not zero address
        let zero_address = Address::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
        if new_owner == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        let mut asset = match store.get::<_, asset::Asset>(&key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Only current asset owner can transfer ownership
        if caller != asset.owner {
            return Err(Error::Unauthorized);
        }

        let old_owner = asset.owner.clone();

        // Remove asset from old owner's registry
        let old_owner_key = asset::DataKey::OwnerRegistry(old_owner.clone());
        let mut old_owner_assets: Vec<BytesN<32>> = store.get(&old_owner_key).unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = old_owner_assets.iter().position(|x| x == asset_id) {
            old_owner_assets.remove(index as u32);
        }
        store.set(&old_owner_key, &old_owner_assets);

        // Add asset to new owner's registry
        let new_owner_key = asset::DataKey::OwnerRegistry(new_owner.clone());
        let mut new_owner_assets: Vec<BytesN<32>> = store.get(&new_owner_key).unwrap_or_else(|| Vec::new(&env));
        new_owner_assets.push_back(asset_id.clone());
        store.set(&new_owner_key, &new_owner_assets);

        // Update asset
        asset.owner = new_owner.clone();
        asset.last_transfer_timestamp = env.ledger().timestamp();
        asset.status = AssetStatus::Transferred;
        store.set(&key, &asset);

        // Emit event
        env.events().publish(
            (symbol_short!("asset_tx"),),
            (asset_id, old_owner, new_owner, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn retire_asset(env: Env, asset_id: BytesN<32>, caller: Address) -> Result<(), Error> {
        // Check if contract is paused
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        let mut asset = match store.get::<_, asset::Asset>(&key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Only asset owner or admin can retire asset
        let admin = Self::get_admin(env.clone())?;
        if caller != asset.owner && caller != admin {
            return Err(Error::Unauthorized);
        }

        asset.status = AssetStatus::Retired;
        store.set(&key, &asset);

        // Emit event
        env.events().publish(
            (symbol_short!("asset_ret"),),
            (asset_id, caller, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn get_asset(env: Env, asset_id: BytesN<32>) -> Result<asset::Asset, Error> {
        let key = asset::DataKey::Asset(asset_id);
        let store = env.storage().persistent();
        match store.get::<_, asset::Asset>(&key) {
            Some(a) => Ok(a),
            None => Err(Error::AssetNotFound),
        }
    }

    pub fn get_assets_by_owner(env: Env, owner: Address) -> Result<Vec<BytesN<32>>, Error> {
        let key = asset::DataKey::OwnerRegistry(owner);
        let store = env.storage().persistent();
        match store.get(&key) {
            Some(assets) => Ok(assets),
            None => Ok(Vec::new(&env)),
        }
    }

    pub fn check_asset_exists(env: Env, asset_id: BytesN<32>) -> Result<bool, Error> {
        let key = asset::DataKey::Asset(asset_id);
        let store = env.storage().persistent();
        Ok(store.has(&key))
    }

    pub fn get_asset_info(env: Env, asset_id: BytesN<32>) -> Result<asset::AssetInfo, Error> {
        let asset = Self::get_asset(env.clone(), asset_id.clone())?;
        Ok(asset::AssetInfo {
            id: asset.id,
            name: asset.name,
            category: asset.category,
            owner: asset.owner,
            status: asset.status,
        })
    }

    pub fn batch_get_asset_info(env: Env, asset_ids: Vec<BytesN<32>>) -> Result<Vec<asset::AssetInfo>, Error> {
        let mut results = Vec::new(&env);
        for asset_id in asset_ids.iter() {
            match Self::get_asset_info(env.clone(), asset_id.clone()) {
                Ok(info) => results.push_back(info),
                Err(_) => continue, // Skip assets that don't exist
            }
        }
        Ok(results)
    }

    // Admin functions
    pub fn update_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let current_admin = Self::get_admin(env.clone())?;
        current_admin.require_auth();

        // Validate new admin is not zero address
        let zero_address = Address::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
        if new_admin == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        let old_admin = current_admin.clone();
        env.storage().persistent().set(&DataKey::Admin, &new_admin);

        // Remove old admin from authorized registrars and add new admin
        env.storage().persistent().set(&DataKey::AuthorizedRegistrar(old_admin.clone()), &false);
        env.storage().persistent().set(&DataKey::AuthorizedRegistrar(new_admin.clone()), &true);

        // Emit event
        env.events().publish(
            (symbol_short!("admin_chg"),),
            (old_admin, new_admin, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn add_authorized_registrar(env: Env, registrar: Address) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::AuthorizedRegistrar(registrar), &true);
        Ok(())
    }

    pub fn remove_authorized_registrar(env: Env, registrar: Address) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        // Cannot remove admin from authorized registrars
        if registrar == admin {
            return Err(Error::Unauthorized);
        }

        env.storage().persistent().set(&DataKey::AuthorizedRegistrar(registrar), &false);
        Ok(())
    }

    pub fn pause_contract(env: Env) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Paused, &true);

        // Emit event
        env.events().publish(
            (symbol_short!("c_pause"),),
            (admin, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn unpause_contract(env: Env) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Paused, &false);

        // Emit event
        env.events().publish(
            (symbol_short!("c_unpause"),),
            (admin, env.ledger().timestamp()),
        );

        Ok(())
    }
}
