#![no_std]

use crate::error::{Error, handle_error};
use crate::subscription::SubscriptionService;
use soroban_sdk::{Address, BytesN, Env, String, Vec, contract, contractimpl, contracttype};

pub(crate) mod asset;
pub(crate) mod audit;
pub(crate) mod branch;
pub(crate) mod error;
pub(crate) mod subscription;
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
        audit::log_action(
            &env,
            &asset.id,
            asset.owner,
            ActionType::Procured,
            String::from_str(&env, "Asset registered"),
        );
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
        let (details, action_type) = match new_status {
            AssetStatus::InMaintenance => (
                String::from_str(&env, "Asset in maintenance"),
                ActionType::Maintained,
            ),
            AssetStatus::Disposed => (
                String::from_str(&env, "Asset disposed"),
                ActionType::Disposed,
            ),
            _ => return Ok(()), // Don't log other status changes
        };

        audit::log_action(&env, &asset_id, asset.owner, action_type, details);

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
        let store = env.storage().persistent();
        let branch_key = branch::DataKey::Branch(branch_id.clone());
        if !store.has(&branch_key) {
            return Err(Error::BranchNotFound);
        }

        let asset_key = asset::DataKey::Asset(asset_id.clone());
        if !store.has(&asset_key) {
            return Err(Error::AssetNotFound);
        }

        let asset_list_key = branch::DataKey::AssetList(branch_id);
        let mut asset_list: Vec<BytesN<32>> =
            store.get(&asset_list_key).unwrap_or_else(|| Vec::new(&env));

        for existing_asset_id in asset_list.iter() {
            if existing_asset_id == asset_id {
                return Ok(());
            }
        }

        asset_list.push_back(asset_id);
        store.set(&asset_list_key, &asset_list);

        Ok(())
    }

    pub fn get_branch_assets(env: Env, branch_id: BytesN<32>) -> Result<Vec<BytesN<32>>, Error> {
        let store = env.storage().persistent();
        let branch_key = branch::DataKey::Branch(branch_id.clone());
        if !store.has(&branch_key) {
            return Err(Error::BranchNotFound);
        }

        let asset_list_key = branch::DataKey::AssetList(branch_id);
        match store.get(&asset_list_key) {
            Some(asset_list) => Ok(asset_list),
            None => Ok(Vec::new(&env)),
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

    pub fn tokenize_asset(
        env: Env,
        asset_id: BytesN<32>,
        token_id: BytesN<32>,
    ) -> Result<(), Error> {
        let admin_key = DataKey::Admin;
        if !env.storage().persistent().has(&admin_key) {
            handle_error(&env, Error::AdminNotFound)
        }
        let admin: Address = env.storage().persistent().get(&admin_key).unwrap();
        admin.require_auth();

        let key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();
        let mut a: asset::Asset = match store.get(&key) {
            Some(v) => v,
            None => return Err(Error::AssetNotFound),
        };

        a.stellar_token_id = token_id;
        store.set(&key, &a);
        Ok(())
    }

    pub fn transfer_asset(
        env: Env,
        actor: Address,
        asset_id: BytesN<32>,
        new_branch_id: BytesN<32>,
    ) -> Result<(), Error> {
        actor.require_auth();

        let store = env.storage().persistent();
        let asset_key = asset::DataKey::Asset(asset_id.clone());

        let mut asset: asset::Asset = match store.get(&asset_key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        let contract_admin = Self::get_admin(env.clone())?;
        if actor != contract_admin && actor != asset.owner {
            return Err(Error::Unauthorized);
        }

        let old_branch_id = asset.branch_id.clone();

        if old_branch_id == new_branch_id {
            return Ok(());
        }

        let new_branch_key = branch::DataKey::Branch(new_branch_id.clone());
        if !store.has(&new_branch_key) {
            return Err(Error::BranchNotFound);
        }

        let old_asset_list_key = branch::DataKey::AssetList(old_branch_id);
        let mut old_asset_list: Vec<BytesN<32>> = store.get(&old_asset_list_key).unwrap();
        if let Some(index) = old_asset_list.iter().position(|x| x == asset_id) {
            old_asset_list.remove(index as u32);
        }
        store.set(&old_asset_list_key, &old_asset_list);

        let new_asset_list_key = branch::DataKey::AssetList(new_branch_id.clone());
        let mut new_asset_list: Vec<BytesN<32>> = store
            .get(&new_asset_list_key)
            .unwrap_or_else(|| Vec::new(&env));
        new_asset_list.push_back(asset_id.clone());
        store.set(&new_asset_list_key, &new_asset_list);

        asset.branch_id = new_branch_id;
        store.set(&asset_key, &asset);

        let note = String::from_str(&env, "Asset transferred");
        audit::log_action(&env, &asset_id, actor, ActionType::Transferred, note);

        Ok(())
    }

    pub fn log_action(
        env: Env,
        actor: Address,
        asset_id: BytesN<32>,
        action: ActionType,
        note: String,
    ) -> Result<(), Error> {
        actor.require_auth();

        let store = env.storage().persistent();
        let asset_key = asset::DataKey::Asset(asset_id.clone());

        let asset: asset::Asset = match store.get(&asset_key) {
            Some(a) => a,
            None => return Err(Error::AssetNotFound),
        };

        let contract_admin = Self::get_admin(env.clone())?;
        if actor != contract_admin && actor != asset.owner {
            return Err(Error::Unauthorized);
        }

        audit::log_action(&env, &asset_id, actor, action, note);

        Ok(())
    }

    pub fn get_asset_audit_logs(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<Vec<audit::AuditEntry>, Error> {
        Ok(audit::get_asset_log(&env, &asset_id))
    }
    //creates a new subscription
    pub fn create_subscription(
        env: Env,
        id: BytesN<32>,
        user: Address,
        plan: crate::types::PlanType,
        payment_token: Address,
        duration_days: u32,
    ) -> Result<Subscription, Error> {
        SubscriptionService::create_subscription(env, id, user, plan, payment_token, duration_days)
    }
    /// Cancels an active subscription.
    pub fn cancel_subscription(
        env: Env,
        id: soroban_sdk::BytesN<32>,
    ) -> Result<crate::types::Subscription, Error> {
        SubscriptionService::cancel_subscription(env, id)
    }
    /// Retrieves subscription details.
    pub fn get_subscription(
        env: Env,
        id: soroban_sdk::BytesN<32>,
    ) -> Result<crate::types::Subscription, Error> {
        SubscriptionService::get_subscription(env, id)
    }
}

mod tests;
