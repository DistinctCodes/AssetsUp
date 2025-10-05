#![no_std]

use crate::error::{Error, handle_error};
use soroban_sdk::{Address, BytesN, Env, String, Vec, contract, contractimpl, contracttype};

pub(crate) mod asset;
pub(crate) mod audit_log;
pub(crate) mod branch;
pub(crate) mod error;
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
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            handle_error(&env, Error::AlreadyInitialized)
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
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

    // Asset functions
    pub fn register_asset(env: Env, asset: asset::Asset) -> Result<(), Error> {
        // Access control
        asset.owner.require_auth();

        if asset.name.is_empty() {
            panic!("Name cannot be empty");
        }

        let key = asset::DataKey::Asset(asset.id.clone());
        let store = env.storage().persistent();
        if store.has(&key) {
            return Err(Error::AssetAlreadyExists);
        }
        store.set(&key, &asset);

        // Log the procurement action
        Self::log_audit_action_as_owner(
            env.clone(),
            asset.id,
            String::from_str(&env, "PROCURED"),
            String::from_str(&env, "Asset registered"),
        )?;
        Ok(())
    }

    pub fn update_asset_status(
        env: Env,
        asset_id: BytesN<32>,
        new_status: AssetStatus,
    ) -> Result<(), Error> {
        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        let mut asset = match store.get::<_, asset::Asset>(&key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Only asset owner can update status
        asset.owner.require_auth();

        // Update status
        asset.status = new_status.clone();
        store.set(&key, &asset);

        // Log appropriate audit action based on status
        let (action, details) = match new_status {
            AssetStatus::InMaintenance => (
                String::from_str(&env, "IN_MAINTENANCE"),
                String::from_str(&env, "Asset in maintenance"),
            ),
            AssetStatus::Disposed => (
                String::from_str(&env, "DISPOSED"),
                String::from_str(&env, "Asset disposed"),
            ),
            _ => return Ok(()), // Don't log other status changes
        };

        Self::log_audit_action_as_owner(env, asset_id, action, details)?;

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

    // Branch functions
    pub fn create_branch(
        env: Env,
        id: BytesN<32>,
        name: String,
        location: String,
        admin: Address,
    ) -> Result<(), Error> {
        // Enforce admin-only access for branch creation
        let contract_admin = Self::get_admin(env.clone())?;
        contract_admin.require_auth();

        if name.is_empty() {
            panic!("Branch name cannot be empty");
        }

        let key = branch::DataKey::Branch(id.clone());
        let store = env.storage().persistent();
        if store.has(&key) {
            return Err(Error::BranchAlreadyExists);
        }

        let branch = branch::Branch {
            id: id.clone(),
            name,
            location,
            admin,
        };

        store.set(&key, &branch);

        // Initialize empty asset list for this branch
        let asset_list_key = branch::DataKey::AssetList(id);
        let empty_asset_list: Vec<BytesN<32>> = Vec::new(&env);
        store.set(&asset_list_key, &empty_asset_list);

        Ok(())
    }

    pub fn add_asset_to_branch(
        env: Env,
        branch_id: BytesN<32>,
        asset_id: BytesN<32>,
    ) -> Result<(), Error> {
        // Verify branch exists
        let branch_key = branch::DataKey::Branch(branch_id.clone());
        let store = env.storage().persistent();
        if !store.has(&branch_key) {
            return Err(Error::BranchNotFound);
        }

        // Verify asset exists
        let asset_key = asset::DataKey::Asset(asset_id.clone());
        if !store.has(&asset_key) {
            return Err(Error::AssetNotFound);
        }

        // Get current asset list
        let asset_list_key = branch::DataKey::AssetList(branch_id);
        let mut asset_list: Vec<BytesN<32>> =
            store.get(&asset_list_key).unwrap_or_else(|| Vec::new(&env));

        // Check if asset is already in the list
        for existing_asset_id in asset_list.iter() {
            if existing_asset_id == asset_id {
                return Ok(()); // Asset already linked, no error
            }
        }

        // Add asset to the list
        asset_list.push_back(asset_id);
        store.set(&asset_list_key, &asset_list);

        Ok(())
    }

    pub fn get_branch_assets(env: Env, branch_id: BytesN<32>) -> Result<Vec<BytesN<32>>, Error> {
        // Verify branch exists
        let branch_key = branch::DataKey::Branch(branch_id.clone());
        let store = env.storage().persistent();
        if !store.has(&branch_key) {
            return Err(Error::BranchNotFound);
        }

        // Get asset list
        let asset_list_key = branch::DataKey::AssetList(branch_id);
        match store.get(&asset_list_key) {
            Some(asset_list) => Ok(asset_list),
            None => Ok(Vec::new(&env)), // Return empty list if no assets
        }
    }

    pub fn get_branch(env: Env, branch_id: BytesN<32>) -> Result<branch::Branch, Error> {
        let key = branch::DataKey::Branch(branch_id);
        let store = env.storage().persistent();
        match store.get::<_, branch::Branch>(&key) {
            Some(branch) => Ok(branch),
            None => Err(Error::BranchNotFound),
        }
    }

    /// Tokenize an existing asset by attaching a Stellar token ID.
    ///
    /// Access: Only the contract admin (set during `initialize`) can call this.
    ///
    /// Behavior:
    /// - Loads the asset by `asset_id`.
    /// - Updates `stellar_token_id` with `token_id`.
    /// - Persists the updated asset.
    pub fn tokenize_asset(
        env: Env,
        asset_id: BytesN<32>,
        token_id: BytesN<32>,
    ) -> Result<(), Error> {
        // Enforce admin-only access
        let admin_key = DataKey::Admin;
        if !env.storage().persistent().has(&admin_key) {
            handle_error(&env, Error::AdminNotFound)
        }
        let admin: Address = env.storage().persistent().get(&admin_key).unwrap();
        admin.require_auth();

        // Fetch asset
        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();
        let mut a: asset::Asset = match store.get(&key) {
            Some(v) => v,
            None => return Err(Error::AssetNotFound),
        };

        // Update token id
        a.stellar_token_id = token_id;
        store.set(&key, &a);
        Ok(())
    }

    /// Log an audit action for an asset (called by asset owner).
    ///
    /// Access: Only the asset owner can call this.
    pub fn log_audit_action_as_owner(
        env: Env,
        asset_id: BytesN<32>,
        action: String,
        details: String,
    ) -> Result<(), Error> {
        // Verify asset exists
        let asset_key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();
        let asset: asset::Asset = match store.get(&asset_key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Access control: Only asset owner can log actions
        asset.owner.require_auth();

        // Generate unique log ID using asset_id, timestamp, and action length
        let timestamp = env.ledger().timestamp();
        let action_len = action.len() as u64;
        let mut id_data: soroban_sdk::Bytes = asset_id.clone().into();
        id_data.extend_from_slice(&timestamp.to_le_bytes());
        id_data.extend_from_slice(&action_len.to_le_bytes());
        let log_id: BytesN<32> = env.crypto().sha256(&id_data).into();

        // Create audit log entry
        let audit_log = audit_log::AuditLog {
            id: log_id.clone(),
            asset_id: asset_id.clone(),
            action,
            timestamp: env.ledger().timestamp(),
            actor: asset.owner.clone(),
            details,
        };

        // Store the audit log
        let log_key = audit_log::DataKey::AuditLog(log_id.clone());
        store.set(&log_key, &audit_log);

        // Add to asset's audit log list
        let asset_logs_key = audit_log::DataKey::AuditLogsByAsset(asset_id);
        let mut logs: Vec<BytesN<32>> =
            store.get(&asset_logs_key).unwrap_or_else(|| Vec::new(&env));
        logs.push_back(log_id);
        store.set(&asset_logs_key, &logs);

        Ok(())
    }

    /// Log an audit action for an asset (called by global admin).
    ///
    /// Access: Only the global admin can call this.
    pub fn log_audit_action_as_admin(
        env: Env,
        asset_id: BytesN<32>,
        action: String,
        details: String,
    ) -> Result<(), Error> {
        // Verify asset exists
        let asset_key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();
        let _asset: asset::Asset = match store.get(&asset_key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        // Access control: Only global admin can log actions
        let global_admin = Self::get_admin(env.clone())?;
        global_admin.require_auth();

        // Generate unique log ID using asset_id, timestamp, and action length
        let timestamp = env.ledger().timestamp();
        let action_len = action.len() as u64;
        let mut id_data: soroban_sdk::Bytes = asset_id.clone().into();
        id_data.extend_from_slice(&timestamp.to_le_bytes());
        id_data.extend_from_slice(&action_len.to_le_bytes());
        let log_id: BytesN<32> = env.crypto().sha256(&id_data).into();

        // Create audit log entry
        let audit_log = audit_log::AuditLog {
            id: log_id.clone(),
            asset_id: asset_id.clone(),
            action,
            timestamp: env.ledger().timestamp(),
            actor: global_admin.clone(),
            details,
        };

        // Store the audit log
        let log_key = audit_log::DataKey::AuditLog(log_id.clone());
        store.set(&log_key, &audit_log);

        // Add to asset's audit log list
        let asset_logs_key = audit_log::DataKey::AuditLogsByAsset(asset_id);
        let mut logs: Vec<BytesN<32>> =
            store.get(&asset_logs_key).unwrap_or_else(|| Vec::new(&env));
        logs.push_back(log_id);
        store.set(&asset_logs_key, &logs);

        Ok(())
    }

    /// Get audit logs for a specific asset.
    ///
    /// Access: Anyone can read audit logs (they are public records).
    pub fn get_asset_audit_logs(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<Vec<audit_log::AuditLog>, Error> {
        let asset_logs_key = audit_log::DataKey::AuditLogsByAsset(asset_id);
        let store = env.storage().persistent();

        let log_ids: Vec<BytesN<32>> = match store.get(&asset_logs_key) {
            Some(ids) => ids,
            None => return Ok(Vec::new(&env)),
        };

        let mut logs = Vec::new(&env);
        for log_id in log_ids.iter() {
            let log_key = audit_log::DataKey::AuditLog(log_id.clone());
            if let Some(log) = store.get(&log_key) {
                logs.push_back(log);
            }
        }

        Ok(logs)
    }
}

mod tests;
