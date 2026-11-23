#![no_std]
#![allow(clippy::too_many_arguments)]
//! # assetsup
//!
//! The primary AssetsUp asset registry.
//!
//! Assets are registered by authorized registrars, owned by an `Address`, and
//! can be transferred, retired, tokenized into fractional shares, leased,
//! insured, voted on, and detokenized.
//!
//! ## Invariants
//!
//! - An asset has exactly one owner at any time.
//! - An asset id is unique; re-registering fails with `Error::AssetAlreadyExists`.
//! - A retired asset cannot be transferred or updated.
//! - For a tokenized asset, holder balances sum to the total token supply.
//!
//! ## Two asset id spaces
//!
//! The registry keys assets by `BytesN<32>`, while tokenization, dividends,
//! voting, and detokenization key them by `u64`. The contract does not link the
//! two namespaces — callers maintain the mapping.
//!
//! ## Relationship to `contrib`
//!
//! `assetsup` and `contrib` are independent contracts with separate storage
//! that share several module names. See `contracts/README.md` for which crate
//! owns which concern.
//!
//! See [`README.md`](https://github.com/DistinctCodes/AssetsUp/blob/main/contracts/assetsup/README.md)
//! for the full entrypoint, storage, event, and error tables.

#[cfg(test)]
extern crate std;

use crate::error::{handle_error, Error};
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

// `Asset` is part of the contract's public ABI (it is a `register_asset`
// argument), so the module is public for cross-contract integration tests.
pub mod asset;
pub(crate) mod audit;
pub(crate) mod branch;
pub(crate) mod detokenization;
pub(crate) mod dividends;
pub(crate) mod error;
pub(crate) mod events;
pub(crate) mod insurance;
pub(crate) mod lease;
pub(crate) mod math;
pub(crate) mod tokenization;
pub(crate) mod transfer_restrictions;
pub(crate) mod ttl;
pub(crate) mod types;
pub mod upgrade;
pub(crate) mod voting;

#[cfg(test)]
mod tests;

pub use types::*;

/// Largest page any list getter returns, and the cap applied by the
/// un-paged getters kept for compatibility.
///
/// The backing vectors (an owner's assets, token holders, a whitelist, audit
/// entries, policies, leases) only ever grow, so an unbounded read eventually
/// exceeds Soroban's per-invocation read-byte and CPU limits and can no longer
/// be called. Page with the `*_page` entrypoints.
pub const MAX_PAGE_SIZE: u32 = 100;

/// Most ids accepted by [`AssetUpContract::batch_get_asset_info`].
pub const MAX_BATCH_SIZE: u32 = 50;

/// The `[start, start + limit)` window of `list`, with `limit` capped at
/// [`MAX_PAGE_SIZE`]. A `start` past the end yields an empty page.
fn page_of<T>(list: &Vec<T>, start: u32, limit: u32) -> Vec<T>
where
    T: soroban_sdk::IntoVal<Env, soroban_sdk::Val>
        + soroban_sdk::TryFromVal<Env, soroban_sdk::Val>
        + Clone,
{
    let len = list.len();
    let from = start.min(len);
    let to = from.saturating_add(limit.min(MAX_PAGE_SIZE)).min(len);
    list.slice(from..to)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Paused,
    TotalAssetCount,
    ContractMetadata,
    AuthorizedRegistrar(Address),
    /// Layout version the stored data conforms to. See `upgrade`.
    StorageVersion,
    /// WASM hashes that `upgrade` is permitted to install.
    AllowedWasmHashes,
    /// Address that has been proposed as the next admin but has not yet
    /// accepted. Absent when no transfer is in flight.
    PendingAdmin,
    ScheduledTransfer(BytesN<32>),
    PendingApproval(BytesN<32>),
}

#[contract]
pub struct AssetUpContract;

#[contractimpl]
#[warn(missing_docs)]
impl AssetUpContract {
    /// Initializes the registry with `admin`, who is also its first authorized registrar.
    ///
    /// Auth: `admin` must authorize. Errors: `AlreadyInitialized`. Emits `contract_initialized`.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        ttl::extend_instance(&env);

        if env.storage().persistent().has(&DataKey::Admin) {
            handle_error(&env, Error::AlreadyInitialized)
        }

        // Set admin
        env.storage().persistent().set(&DataKey::Admin, &admin);

        // Initialize contract state
        env.storage().persistent().set(&DataKey::Paused, &false);
        env.storage()
            .persistent()
            .set(&DataKey::TotalAssetCount, &0u64);

        // Set contract metadata
        let metadata = ContractMetadata {
            version: String::from_str(&env, "1.0.0"),
            name: String::from_str(&env, "AssetUp Registry"),
            description: String::from_str(&env, "Professional asset registry smart contract"),
            created_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::ContractMetadata, &metadata);

        // Add admin as first authorized registrar
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(admin.clone()), &true);

        // Stamp the layout version so a later upgrade knows what it is
        // migrating from.
        upgrade::set_version(&env, upgrade::CURRENT_VERSION);
        env.storage()
            .persistent()
            .set(&DataKey::AllowedWasmHashes, &Vec::<BytesN<32>>::new(&env));

        // Extend on write, not only on read. A freshly written entry gets the
        // network's minimum lifetime, which is short; without this the whole
        // contract configuration can be archived before anyone reads it, and a
        // read cannot rescue an entry that is already gone.
        ttl::extend_persistent(&env, &DataKey::Admin);
        ttl::extend_persistent(&env, &DataKey::Paused);
        ttl::extend_persistent(&env, &DataKey::TotalAssetCount);
        ttl::extend_persistent(&env, &DataKey::ContractMetadata);
        ttl::extend_persistent(&env, &DataKey::StorageVersion);
        ttl::extend_persistent(&env, &DataKey::AllowedWasmHashes);
        ttl::extend_persistent(&env, &DataKey::AuthorizedRegistrar(admin.clone()));

        events::contract_initialized(&env, &admin);

        Ok(())
    }

    /// The current admin. Errors: `AdminNotFound` if the contract was never initialized.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        ttl::extend_instance(&env);

        let key = DataKey::Admin;
        if !env.storage().persistent().has(&key) {
            handle_error(&env, Error::AdminNotFound)
        }

        // Contract-level configuration lives in persistent storage, so it
        // needs extending like any other persistent entry — the instance bump
        // alone does not cover it.
        ttl::extend_persistent(&env, &key);

        let admin = env.storage().persistent().get(&key).unwrap();
        Ok(admin)
    }

    /// Whether the contract is paused. Read-only.
    pub fn is_paused(env: Env) -> Result<bool, Error> {
        ttl::extend_persistent(&env, &DataKey::Paused);
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false))
    }

    /// The number of assets registered so far. Read-only.
    pub fn get_total_asset_count(env: Env) -> Result<u64, Error> {
        ttl::extend_persistent(&env, &DataKey::TotalAssetCount);
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::TotalAssetCount)
            .unwrap_or(0u64))
    }

    /// The contract's name, version and creation time. Errors: `ContractNotInitialized`.
    pub fn get_contract_metadata(env: Env) -> Result<ContractMetadata, Error> {
        ttl::extend_persistent(&env, &DataKey::ContractMetadata);
        let metadata = env.storage().persistent().get(&DataKey::ContractMetadata);
        match metadata {
            Some(m) => Ok(m),
            None => handle_error(&env, Error::ContractNotInitialized),
        }
    }

    /// Whether `address` may register assets (the admin always can). Read-only.
    pub fn is_authorized_registrar(env: Env, address: Address) -> Result<bool, Error> {
        let key = DataKey::AuthorizedRegistrar(address);
        ttl::extend_persistent(&env, &key);
        Ok(env.storage().persistent().get(&key).unwrap_or(false))
    }

    // Asset functions
    /// Registers `asset` in the registry.
    ///
    /// Auth: `caller` must authorize and be the admin or an authorized registrar. Errors: `ContractPaused`, `Unauthorized`, `AssetAlreadyExists`, and the asset validation errors (`InvalidAssetName`, `InvalidPurchaseValue`, `InvalidMetadataUri`, `InvalidOwnerAddress`). Appends an audit entry and emits `asset_registered`.
    pub fn register_asset(env: Env, asset: asset::Asset, caller: Address) -> Result<(), Error> {
        ttl::extend_instance(&env);

        // Authenticate the caller before trusting `caller` for anything else.
        // The registrar check below compares against a caller-supplied address,
        // so without this any account could name an authorized registrar and
        // pass it.
        caller.require_auth();

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
        ttl::extend_persistent(&env, &key);

        // Update owner registry
        let owner_key = asset::DataKey::OwnerRegistry(asset.owner.clone());
        let mut owner_assets: Vec<BytesN<32>> =
            store.get(&owner_key).unwrap_or_else(|| Vec::new(&env));
        owner_assets.push_back(asset.id.clone());
        store.set(&owner_key, &owner_assets);
        // A fresh write starts at the network's short minimum lifetime; without
        // this an owner whose registry is never read could have it archived
        // while their assets still exist.
        ttl::extend_persistent(&env, &owner_key);

        // Update total asset count
        let mut total_count = Self::get_total_asset_count(env.clone())?;
        total_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::TotalAssetCount, &total_count);

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset.id,
            String::from_str(&env, "ASSET_REGISTERED"),
            caller.clone(),
            String::from_str(&env, "Asset registered by authorized registrar"),
        );

        // Emit event
        events::asset_registered(&env, &asset.id, &asset.owner);

        Ok(())
    }

    /// Rejects the call if the contract is paused.
    ///
    /// Every mutating entrypoint calls this except the deliberate exemptions
    /// documented in `contracts/PAUSE.md`: the pause controls themselves, the
    /// admin transfer flow, and `claim_dividends`.
    fn require_not_paused(env: &Env) -> Result<(), Error> {
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }

    /// Authenticate `caller`, then require it to be the token's tokenizer or the
    /// contract admin.
    ///
    /// The role comparison alone would be meaningless: `caller` is supplied by
    /// whoever builds the invocation, so an attacker could name the tokenizer
    /// and pass it. Authenticating here (rather than in the module functions)
    /// keeps the module layer directly testable while making the boundary
    /// explicit for every privileged wrapper.
    fn require_asset_admin_or_tokenizer(
        env: &Env,
        asset_id: u64,
        caller: &Address,
    ) -> Result<TokenizedAsset, Error> {
        caller.require_auth();

        let asset: TokenizedAsset = env
            .storage()
            .persistent()
            .get(&TokenDataKey::TokenizedAsset(asset_id))
            .ok_or(Error::AssetNotTokenized)?;
        let admin = Self::get_admin(env.clone())?;

        if *caller != asset.tokenizer && *caller != admin {
            return Err(Error::Unauthorized);
        }

        Ok(asset)
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
        let zero_address = Address::from_str(
            env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        );
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

    /// Updates an asset's description, metadata URI and/or custom attributes (each only when provided).
    ///
    /// Auth: `caller` must authorize and be the asset owner or the admin. Errors: `ContractPaused`, `AssetNotFound`, `Unauthorized`, `InvalidMetadataUri`. Emits `asset_updated`.
    pub fn update_asset_metadata(
        env: Env,
        asset_id: BytesN<32>,
        new_description: Option<String>,
        new_metadata_uri: Option<String>,
        new_custom_attributes: Option<Vec<types::CustomAttribute>>,
        caller: Address,
    ) -> Result<(), Error> {
        ttl::extend_instance(&env);

        // Authenticate before the owner/admin comparison below, which would
        // otherwise be satisfied by simply naming the owner's address.
        caller.require_auth();

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
        ttl::extend_persistent(&env, &key);

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "METADATA_UPDATED"),
            caller.clone(),
            String::from_str(&env, "Asset metadata updated"),
        );

        // Emit event
        events::asset_updated(&env, &asset_id, &caller);

        Ok(())
    }

    /// Moves an asset to `new_owner`.
    ///
    /// Auth: `caller` must authorize and be the current owner. Errors: `ContractPaused`, `InvalidOwnerAddress` (zero address), `AssetNotFound`, `Unauthorized`. Updates both owners' registries and the transfer history, and emits `asset_transferred`.
    pub fn transfer_asset_ownership(
        env: Env,
        asset_id: BytesN<32>,
        new_owner: Address,
        caller: Address,
    ) -> Result<(), Error> {
        ttl::extend_instance(&env);

        // Authenticate before the ownership comparison below. Without this,
        // anyone could pass the current owner's address and take the asset —
        // a direct asset-theft path.
        caller.require_auth();

        // Check if contract is paused
        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        // Validate new owner is not zero address
        let zero_address = Address::from_str(
            &env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        );
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

        // A tokenized asset's ownership is represented by its tokens.
        if tokenization::is_registry_asset_tokenized(&env, &asset_id) {
            return Err(Error::AssetIsTokenized);
        }

        let old_owner = asset.owner.clone();

        // Remove asset from old owner's registry
        let old_owner_key = asset::DataKey::OwnerRegistry(old_owner.clone());
        let mut old_owner_assets: Vec<BytesN<32>> =
            store.get(&old_owner_key).unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = old_owner_assets.iter().position(|x| x == asset_id) {
            old_owner_assets.remove(index as u32);
        }
        store.set(&old_owner_key, &old_owner_assets);
        ttl::extend_persistent(&env, &old_owner_key);

        // Add asset to new owner's registry
        let new_owner_key = asset::DataKey::OwnerRegistry(new_owner.clone());
        let mut new_owner_assets: Vec<BytesN<32>> =
            store.get(&new_owner_key).unwrap_or_else(|| Vec::new(&env));
        new_owner_assets.push_back(asset_id.clone());
        store.set(&new_owner_key, &new_owner_assets);
        ttl::extend_persistent(&env, &new_owner_key);

        // Update asset
        asset.owner = new_owner.clone();
        let transferred_at = env.ledger().timestamp();
        asset.last_transfer_timestamp = transferred_at;
        asset.status = AssetStatus::Transferred;
        store.set(&key, &asset);
        ttl::extend_persistent(&env, &key);

        // Append to the asset's transfer history so the whole chain of custody
        // stays queryable on-chain, not just the current owner.
        let history_key = asset::DataKey::TransferHistory(asset_id.clone());
        let mut history: Vec<asset::TransferRecord> =
            store.get(&history_key).unwrap_or_else(|| Vec::new(&env));
        history.push_back(asset::TransferRecord {
            from: old_owner.clone(),
            to: new_owner.clone(),
            timestamp: transferred_at,
        });
        store.set(&history_key, &history);
        ttl::extend_persistent(&env, &history_key);

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "OWNERSHIP_TRANSFERRED"),
            caller.clone(),
            String::from_str(&env, "Asset ownership transferred to new owner"),
        );

        // Emit event
        events::asset_transferred(&env, &asset_id, &old_owner, &new_owner);

        Ok(())
    }

    /// Retires an asset so it can no longer be transferred or updated.
    ///
    /// Auth: `caller` must authorize and be the asset owner or the admin. Errors: `ContractPaused`, `AssetNotFound`, `Unauthorized`. Appends an audit entry and emits `asset_retired`.
    pub fn retire_asset(env: Env, asset_id: BytesN<32>, caller: Address) -> Result<(), Error> {
        ttl::extend_instance(&env);

        // Authenticate before the owner/admin comparison below.
        caller.require_auth();

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

        // Retiring would leave tokens pointing at a dead asset; detokenize first.
        if tokenization::is_registry_asset_tokenized(&env, &asset_id) {
            return Err(Error::AssetIsTokenized);
        }

        asset.status = AssetStatus::Retired;
        store.set(&key, &asset);
        ttl::extend_persistent(&env, &key);
        ttl::extend_persistent(&env, &asset::DataKey::OwnerRegistry(asset.owner.clone()));

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "ASSET_RETIRED"),
            caller.clone(),
            String::from_str(&env, "Asset retired from active use"),
        );

        // Emit event
        events::asset_retired(&env, &asset_id, &caller);

        Ok(())
    }

    /// The full record for `asset_id`. Errors: `AssetNotFound`. Read-only.
    pub fn get_asset(env: Env, asset_id: BytesN<32>) -> Result<asset::Asset, Error> {
        ttl::extend_instance(&env);

        let key = asset::DataKey::Asset(asset_id);
        let store = env.storage().persistent();
        match store.get::<_, asset::Asset>(&key) {
            Some(a) => {
                // Extend on read too. An asset that is only ever queried and
                // never modified would otherwise be archived despite being in
                // active use.
                ttl::extend_persistent(&env, &key);
                Ok(a)
            }
            None => Err(Error::AssetNotFound),
        }
    }

    /// The first [`MAX_PAGE_SIZE`] ids of the assets owned by `owner`.
    ///
    /// Capped; use [`Self::get_assets_by_owner_page`] to read an owner who holds
    /// more. Extends the owner registry's TTL. Read-only.
    pub fn get_assets_by_owner(env: Env, owner: Address) -> Result<Vec<BytesN<32>>, Error> {
        Self::get_assets_by_owner_page(env, owner, 0, MAX_PAGE_SIZE)
    }

    /// A page of the ids of the assets owned by `owner`: the entries at
    /// `[start, start + limit)`, `limit` capped at [`MAX_PAGE_SIZE`], an empty
    /// page past the end. Extends the owner registry's TTL on every read so an
    /// owner who is only ever queried does not lose their registry to
    /// archival. Read-only.
    pub fn get_assets_by_owner_page(
        env: Env,
        owner: Address,
        start: u32,
        limit: u32,
    ) -> Result<Vec<BytesN<32>>, Error> {
        let key = asset::DataKey::OwnerRegistry(owner);
        ttl::extend_persistent(&env, &key);
        let assets: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env));
        Ok(page_of(&assets, start, limit))
    }

    /// The asset's full transfer history, oldest first.
    ///
    /// Each entry records the previous and new owner and the ledger time of the
    /// transfer. Returns `AssetNotFound` for an unknown asset so a typo'd id
    /// does not look like an asset that was never transferred.
    pub fn get_asset_transfer_history(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<Vec<asset::TransferRecord>, Error> {
        ttl::extend_instance(&env);

        let asset_key = asset::DataKey::Asset(asset_id.clone());
        if !env.storage().persistent().has(&asset_key) {
            return Err(Error::AssetNotFound);
        }

        let key = asset::DataKey::TransferHistory(asset_id);
        let store = env.storage().persistent();
        Ok(store.get(&key).unwrap_or_else(|| Vec::new(&env)))
    }

    /// Registers a branch. Admin-gated, and the id must be unused.
    pub fn register_branch(env: Env, branch: branch::Branch) -> Result<(), Error> {
        ttl::extend_instance(&env);

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        let key = branch::DataKey::Branch(branch.id.clone());
        let store = env.storage().persistent();
        if store.has(&key) {
            return Err(Error::BranchAlreadyExists);
        }
        store.set(&key, &branch);
        ttl::extend_persistent(&env, &key);

        events::branch_registered(&env, &branch.id, &branch.admin);

        Ok(())
    }

    /// Assigns an asset to a branch.
    ///
    /// Both the branch and the asset must exist: without the branch check an
    /// asset could be pointed at a stale or misspelled branch id and silently
    /// disappear from that branch's inventory. Authorized by the contract admin
    /// or the branch's own admin.
    pub fn assign_asset_to_branch(
        env: Env,
        branch_id: BytesN<32>,
        asset_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), Error> {
        ttl::extend_instance(&env);

        caller.require_auth();

        if Self::is_paused(env.clone())? {
            return Err(Error::ContractPaused);
        }

        let branch_key = branch::DataKey::Branch(branch_id.clone());
        let asset_key = asset::DataKey::Asset(asset_id.clone());
        let store = env.storage().persistent();

        let branch: branch::Branch = store.get(&branch_key).ok_or(Error::BranchNotFound)?;
        if !store.has(&asset_key) {
            return Err(Error::AssetNotFound);
        }

        let admin = Self::get_admin(env.clone())?;
        if caller != admin && caller != branch.admin {
            return Err(Error::Unauthorized);
        }

        let list_key = branch::DataKey::AssetList(branch_id.clone());
        let mut assets: Vec<BytesN<32>> = store.get(&list_key).unwrap_or_else(|| Vec::new(&env));
        if !assets.iter().any(|x| x == asset_id) {
            assets.push_back(asset_id.clone());
            store.set(&list_key, &assets);
            ttl::extend_persistent(&env, &list_key);
        }

        events::asset_assigned_to_branch(&env, &branch_id, &asset_id, &caller);

        Ok(())
    }

    /// A branch by id, or `BranchNotFound`.
    pub fn get_branch(env: Env, branch_id: BytesN<32>) -> Result<branch::Branch, Error> {
        let key = branch::DataKey::Branch(branch_id);
        let store = env.storage().persistent();
        match store.get(&key) {
            Some(b) => {
                ttl::extend_persistent(&env, &key);
                Ok(b)
            }
            None => Err(Error::BranchNotFound),
        }
    }

    /// The assets assigned to a branch, oldest first.
    pub fn get_branch_assets(env: Env, branch_id: BytesN<32>) -> Result<Vec<BytesN<32>>, Error> {
        let _ = Self::get_branch(env.clone(), branch_id.clone())?;
        let key = branch::DataKey::AssetList(branch_id);
        let store = env.storage().persistent();
        Ok(store.get(&key).unwrap_or_else(|| Vec::new(&env)))
    }

    /// Whether an asset with this id is registered. Read-only.
    pub fn check_asset_exists(env: Env, asset_id: BytesN<32>) -> Result<bool, Error> {
        ttl::extend_instance(&env);

        let key = asset::DataKey::Asset(asset_id);
        let store = env.storage().persistent();
        Ok(store.has(&key))
    }

    /// The summary (id, name, category, owner, status) for `asset_id`. Errors: `AssetNotFound`. Read-only.
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

    /// Summaries for several assets, positionally: element `i` is the summary
    /// for `asset_ids[i]`, or `None` if that id is not registered, so a missing
    /// asset is distinguishable from one that was omitted and results can be
    /// matched back to the input.
    ///
    /// Errors: `BatchTooLarge` for more than [`MAX_BATCH_SIZE`] ids. Read-only.
    pub fn batch_get_asset_info(
        env: Env,
        asset_ids: Vec<BytesN<32>>,
    ) -> Result<Vec<Option<asset::AssetInfo>>, Error> {
        if asset_ids.len() > MAX_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }
        let mut results = Vec::new(&env);
        for asset_id in asset_ids.iter() {
            results.push_back(Self::get_asset_info(env.clone(), asset_id.clone()).ok());
        }
        Ok(results)
    }

    // Admin functions
    /// Step one of a two-step admin transfer: nominate `new_admin`.
    ///
    /// This does **not** change the admin. The proposal only takes effect when
    /// the proposed address calls [`Self::accept_admin`], which proves it is
    /// reachable and controlled. A single-step transfer means one typo
    /// permanently bricks administration of a contract governing real asset
    /// ownership, with no on-chain undo.
    ///
    /// Calling this again replaces any proposal already in flight.
    pub fn propose_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let current_admin = Self::get_admin(env.clone())?;
        current_admin.require_auth();

        // Validate new admin is not zero address
        let zero_address = Address::from_str(
            &env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        );
        if new_admin == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        // Transferring to yourself is a no-op that would leave a confusing
        // pending proposal behind.
        if new_admin == current_admin {
            return Err(Error::InvalidOwnerAddress);
        }

        env.storage()
            .persistent()
            .set(&DataKey::PendingAdmin, &new_admin);

        events::admin_proposed(&env, &current_admin, &new_admin);

        Ok(())
    }

    /// Step two: the proposed admin accepts, and only then does the role move.
    ///
    /// Authorized by the *incoming* address, which is the whole point — an
    /// address that never accepts leaves the original admin in place forever.
    ///
    /// Deliberately reachable while paused. An incident may be *caused* by a
    /// compromised admin key, so rotating it must not require unpausing first.
    /// See `PAUSE_EXEMPT` in `src/tests/pause.rs`.
    pub fn accept_admin(env: Env) -> Result<(), Error> {
        let pending: Address = env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdmin)
            .ok_or(Error::AdminNotFound)?;

        pending.require_auth();

        let old_admin = Self::get_admin(env.clone())?;

        env.storage().persistent().set(&DataKey::Admin, &pending);
        env.storage().persistent().remove(&DataKey::PendingAdmin);

        // Move registrar rights along with the role.
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(old_admin.clone()), &false);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(pending.clone()), &true);

        events::admin_changed(&env, &old_admin, &pending);

        Ok(())
    }

    /// Withdraws a pending proposal. Only the current admin may cancel.
    ///
    /// Reachable while paused, as part of the admin-rotation exemption.
    pub fn cancel_admin_proposal(env: Env) -> Result<(), Error> {
        let current_admin = Self::get_admin(env.clone())?;
        current_admin.require_auth();

        let pending: Address = env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdmin)
            .ok_or(Error::AdminNotFound)?;

        env.storage().persistent().remove(&DataKey::PendingAdmin);

        events::admin_proposal_cancelled(&env, &current_admin, &pending);

        Ok(())
    }

    /// The address currently nominated to become admin, if any.
    pub fn get_pending_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::PendingAdmin)
    }

    /// Replaces this contract's WASM in place, keeping the contract id and all
    /// storage.
    ///
    /// Admin-gated and limited to hashes on the allowlist; emits an event.
    /// Deliberately **not** blocked by the pause: an upgrade is how you fix the
    /// incident that caused the pause.
    ///
    /// This does not migrate storage. If the new build changes a stored
    /// layout, call [`Self::migrate`] immediately afterwards — see
    /// `contracts/UPGRADE.md`.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        upgrade::require_hash_allowed(&env, &new_wasm_hash);

        env.deployer()
            .update_current_contract_wasm(new_wasm_hash.clone());

        upgrade::emit_upgraded(&env, &admin, &new_wasm_hash, upgrade::CURRENT_VERSION);
        Ok(())
    }

    /// Adds `wasm_hash` to the upgrade allowlist. Admin-gated.
    pub fn allow_wasm_hash(env: Env, wasm_hash: BytesN<32>) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        let mut hashes: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllowedWasmHashes)
            .unwrap_or_else(|| Vec::new(&env));
        upgrade::require_hash_unlisted(&env, &wasm_hash);
        hashes.push_back(wasm_hash.clone());
        env.storage()
            .persistent()
            .set(&DataKey::AllowedWasmHashes, &hashes);
        ttl::extend_persistent(&env, &DataKey::AllowedWasmHashes);

        events::wasm_hash_allowed(&env, &admin, &wasm_hash);
        Ok(())
    }

    /// Removes `wasm_hash` from the upgrade allowlist. Admin-gated.
    pub fn remove_wasm_hash(env: Env, wasm_hash: BytesN<32>) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        let mut hashes: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AllowedWasmHashes)
            .unwrap_or_else(|| Vec::new(&env));
        upgrade::require_hash_listed(&env, &wasm_hash);
        let index = hashes
            .iter()
            .position(|allowed| allowed == wasm_hash)
            .unwrap_or_else(|| {
                soroban_sdk::panic_with_error!(
                    env,
                    crate::upgrade::UpgradeError::WasmHashNotAllowed
                )
            });
        hashes.remove(index as u32);
        env.storage()
            .persistent()
            .set(&DataKey::AllowedWasmHashes, &hashes);
        ttl::extend_persistent(&env, &DataKey::AllowedWasmHashes);

        events::wasm_hash_removed(&env, &admin, &wasm_hash);
        Ok(())
    }

    /// Whether `wasm_hash` may be installed by `upgrade`.
    pub fn is_wasm_hash_allowed(env: Env, wasm_hash: BytesN<32>) -> bool {
        upgrade::is_hash_allowed(&env, &wasm_hash)
    }

    /// The WASM hashes currently permitted by `upgrade`.
    pub fn get_allowed_wasm_hashes(env: Env) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::AllowedWasmHashes)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Brings stored data up to the layout this build expects.
    ///
    /// Idempotent: running it when already current is a no-op, so a retried or
    /// duplicated migration transaction cannot corrupt state.
    pub fn migrate(env: Env) -> Result<u32, Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        let from = upgrade::stored_version(&env);
        let to = upgrade::migrate_from(&env, from)?;

        if from != to {
            upgrade::emit_migrated(&env, from, to);
        }

        Ok(to)
    }

    /// The storage layout version the stored data currently conforms to.
    pub fn storage_version(env: Env) -> u32 {
        upgrade::stored_version(&env)
    }

    /// Grants registrar rights to `registrar`.
    ///
    /// Auth: the admin. Errors: `ContractPaused`. Emits `registrar_added`.
    pub fn add_authorized_registrar(env: Env, registrar: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar.clone()), &true);

        events::registrar_added(&env, &registrar);
        Ok(())
    }

    /// Revokes registrar rights from `registrar`.
    ///
    /// Auth: the admin. Errors: `ContractPaused`, `Unauthorized` (the admin's own registrar right cannot be removed). Emits `registrar_removed`.
    pub fn remove_authorized_registrar(env: Env, registrar: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        // Cannot remove admin from authorized registrars
        if registrar == admin {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar.clone()), &false);

        events::registrar_removed(&env, &registrar);
        Ok(())
    }

    /// Pauses the contract; most mutating entrypoints then fail with `ContractPaused`.
    ///
    /// Auth: the admin. Emits `contract_paused`.
    pub fn pause_contract(env: Env) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Paused, &true);

        // Bump the flag's TTL. An emergency pause that is never touched again
        // is exactly the entry nobody renews, and a lapsed `Paused` key reads
        // back as absent -- which silently resumes a contract that an operator
        // believes is frozen. `initialize` and `is_paused` both extend this key
        // for the same reason.
        ttl::extend_persistent(&env, &DataKey::Paused);

        // Emit event
        events::contract_paused(&env, &admin);

        Ok(())
    }

    /// Unfreezes the contract.
    ///
    /// Deliberately reachable while paused -- that is the only way out of an
    /// emergency pause -- and like `upgrade`, admin-gated on its own.
    pub fn unpause_contract(env: Env) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Paused, &false);
        ttl::extend_persistent(&env, &DataKey::Paused);

        // Emit event
        events::contract_unpaused(&env, &admin);

        Ok(())
    }

    /// The on-chain audit entries recorded for `asset_id`, oldest first. Read-only.
    pub fn get_asset_audit_logs(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<Vec<audit::AuditEntry>, Error> {
        Self::get_asset_audit_logs_page(env, asset_id, 0, MAX_PAGE_SIZE)
    }

    /// A page of the asset's audit entries, oldest first (`[start, start +
    /// limit)`, `limit` capped at [`MAX_PAGE_SIZE`]). The un-paged
    /// [`Self::get_asset_audit_logs`] returns only the first page.
    pub fn get_asset_audit_logs_page(
        env: Env,
        asset_id: BytesN<32>,
        start: u32,
        limit: u32,
    ) -> Result<Vec<audit::AuditEntry>, Error> {
        Ok(page_of(
            &audit::get_asset_log(&env, &asset_id),
            start,
            limit,
        ))
    }

    // =====================
    // Tokenization Functions
    // =====================

    /// Tokenize a registered asset with full supply to its owner.
    ///
    /// `asset_id` is the token id (the `u64` every other tokenization
    /// entrypoint uses); `registry_asset_id` is the asset in the registry that
    /// the token represents. The call fails unless that asset exists
    /// (`AssetNotFound`), is not retired (`AssetRetired`), is owned by
    /// `tokenizer` (`Unauthorized`) and is not already tokenized
    /// (`AssetAlreadyTokenized`), so a token can only ever be claimed by the
    /// real owner of a real, active asset and cannot be front-run by a third
    /// party that picks the same `u64`.
    ///
    /// While tokenized, the registry asset cannot be transferred or retired
    /// directly (`AssetIsTokenized`); detokenization releases it.
    #[allow(clippy::too_many_arguments)]
    pub fn tokenize_asset(
        env: Env,
        asset_id: u64,
        registry_asset_id: BytesN<32>,
        symbol: String,
        total_supply: i128,
        decimals: u32,
        min_voting_threshold: i128,
        tokenizer: Address,
        name: String,
        description: String,
        asset_type: AssetType,
    ) -> Result<TokenizedAsset, Error> {
        Self::require_not_paused(&env)?;

        tokenizer.require_auth();

        // The token must stand for a real, active asset owned by the tokenizer.
        let registered: asset::Asset = env
            .storage()
            .persistent()
            .get(&asset::DataKey::Asset(registry_asset_id.clone()))
            .ok_or(Error::AssetNotFound)?;
        if registered.status == AssetStatus::Retired {
            return Err(Error::AssetRetired);
        }
        if registered.owner != tokenizer {
            return Err(Error::Unauthorized);
        }
        if tokenization::is_registry_asset_tokenized(&env, &registry_asset_id) {
            return Err(Error::AssetAlreadyTokenized);
        }

        let metadata = TokenMetadata {
            name,
            description,
            asset_type,
            ipfs_uri: None,
            legal_docs_hash: None,
            valuation_report_hash: None,
            accredited_investor_required: false,
            geographic_restrictions: Vec::new(&env),
        };

        let tokenized = tokenization::tokenize_asset(
            &env,
            asset_id,
            symbol,
            total_supply,
            decimals,
            min_voting_threshold,
            tokenizer,
            metadata,
        )?;

        // Tie the token to its registry asset so transfers and retirement can
        // respect it.
        tokenization::link_registry_asset(&env, asset_id, &registry_asset_id)?;

        Ok(tokenized)
    }

    /// The registry asset a token id represents, if any.
    pub fn get_registry_asset_of_token(env: Env, asset_id: u64) -> Option<BytesN<32>> {
        tokenization::registry_asset_of(&env, asset_id)
    }

    /// Mint additional tokens (only tokenizer can call)
    pub fn mint_tokens(
        env: Env,
        asset_id: u64,
        amount: i128,
        minter: Address,
    ) -> Result<TokenizedAsset, Error> {
        Self::require_not_paused(&env)?;

        minter.require_auth();
        tokenization::mint_tokens(&env, asset_id, amount, minter)
    }

    /// Burn tokens (only tokenizer can call)
    pub fn burn_tokens(
        env: Env,
        asset_id: u64,
        amount: i128,
        burner: Address,
    ) -> Result<TokenizedAsset, Error> {
        Self::require_not_paused(&env)?;

        burner.require_auth();
        tokenization::burn_tokens(&env, asset_id, amount, burner)
    }

    /// Transfer tokens from one address to another
    pub fn transfer_tokens(
        env: Env,
        asset_id: u64,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        from.require_auth();

        // Validate transfer restrictions
        transfer_restrictions::validate_transfer(&env, asset_id, from.clone(), to.clone())?;

        tokenization::transfer_tokens(&env, asset_id, from, to, amount)
    }

    /// Get token balance for an address
    pub fn get_token_balance(env: Env, asset_id: u64, holder: Address) -> Result<i128, Error> {
        tokenization::get_token_balance(&env, asset_id, holder)
    }

    /// Get all token holders for an asset
    pub fn get_token_holders(env: Env, asset_id: u64) -> Result<Vec<Address>, Error> {
        Self::get_token_holders_page(env, asset_id, 0, MAX_PAGE_SIZE)
    }

    /// A page of the asset's token holders (`[start, start + limit)`, `limit`
    /// capped at [`MAX_PAGE_SIZE`]). Errors: `AssetNotTokenized`. The un-paged
    /// [`Self::get_token_holders`] returns only the first page.
    pub fn get_token_holders_page(
        env: Env,
        asset_id: u64,
        start: u32,
        limit: u32,
    ) -> Result<Vec<Address>, Error> {
        Ok(page_of(
            &tokenization::get_token_holders(&env, asset_id)?,
            start,
            limit,
        ))
    }

    /// Lock tokens until timestamp.
    ///
    /// Only the asset's tokenizer can call this, the lock may last at most
    /// [`Self::get_max_lock_duration`] seconds (`LockDurationTooLong`), and the
    /// holder must authorize it as well (unless the tokenizer is the holder):
    /// a tokenizer cannot freeze somebody else's balance without their consent.
    pub fn lock_tokens(
        env: Env,
        asset_id: u64,
        holder: Address,
        until_timestamp: u64,
        caller: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        caller.require_auth();
        if holder != caller {
            holder.require_auth();
        }
        tokenization::lock_tokens(&env, asset_id, holder, until_timestamp, caller)
    }

    /// Sets the maximum token lock duration in seconds. Admin only. Zero is
    /// rejected (`InvalidInput`).
    pub fn set_max_lock_duration(env: Env, seconds: u64) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();
        tokenization::set_max_lock_duration(&env, seconds)
    }

    /// The maximum token lock duration in seconds (one year unless configured).
    pub fn get_max_lock_duration(env: Env) -> u64 {
        tokenization::get_max_lock_duration(&env)
    }

    /// Unlock tokens
    pub fn unlock_tokens(env: Env, asset_id: u64, holder: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        tokenization::unlock_tokens(&env, asset_id, holder)
    }

    /// Check if a holder's tokens are currently locked
    pub fn is_tokens_locked(env: Env, asset_id: u64, holder: Address) -> bool {
        tokenization::is_tokens_locked(&env, asset_id, holder)
    }

    /// Get ownership percentage for a holder (in basis points)
    pub fn get_ownership_percentage(
        env: Env,
        asset_id: u64,
        holder: Address,
    ) -> Result<i128, Error> {
        tokenization::calculate_ownership_percentage(&env, asset_id, holder)
    }

    /// Get tokenized asset details
    pub fn get_tokenized_asset(env: Env, asset_id: u64) -> Result<TokenizedAsset, Error> {
        tokenization::get_tokenized_asset(&env, asset_id)
    }

    /// Update asset valuation
    pub fn update_valuation(env: Env, asset_id: u64, new_valuation: i128) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        tokenization::update_valuation(&env, asset_id, new_valuation)
    }

    /// Extend the storage TTL of a tokenized asset's persistent entries
    /// (permissionless keeper path; idempotent)
    pub fn bump_asset_ttl(env: Env, asset_id: u64) -> Result<(), Error> {
        ttl::extend_instance(&env);
        tokenization::bump_asset_ttl(&env, asset_id)
    }

    // =====================
    // Dividend Functions
    // =====================

    /// Distribute dividends proportionally to all holders
    pub fn distribute_dividends(env: Env, asset_id: u64, total_amount: i128) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        dividends::distribute_dividends(&env, asset_id, total_amount)
    }

    /// Claim unclaimed dividends
    pub fn claim_dividends(env: Env, asset_id: u64, holder: Address) -> Result<i128, Error> {
        holder.require_auth();
        dividends::claim_dividends(&env, asset_id, holder)
    }

    /// Get unclaimed dividends for a holder
    pub fn get_unclaimed_dividends(
        env: Env,
        asset_id: u64,
        holder: Address,
    ) -> Result<i128, Error> {
        dividends::get_unclaimed_dividends(&env, asset_id, holder)
    }

    /// Enable revenue sharing for an asset
    ///
    /// Auth: `caller` must authorize and be the asset's tokenizer or the admin.
    pub fn enable_revenue_sharing(env: Env, asset_id: u64, caller: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_asset_admin_or_tokenizer(&env, asset_id, &caller)?;

        dividends::enable_revenue_sharing(&env, asset_id)
    }

    /// Disable revenue sharing for an asset
    ///
    /// Auth: `caller` must authorize and be the asset's tokenizer or the admin.
    pub fn disable_revenue_sharing(env: Env, asset_id: u64, caller: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_asset_admin_or_tokenizer(&env, asset_id, &caller)?;

        dividends::disable_revenue_sharing(&env, asset_id)
    }

    // =====================
    // Voting Functions
    // =====================

    /// Cast a vote on a proposal
    pub fn cast_vote(
        env: Env,
        asset_id: u64,
        proposal_id: u64,
        voter: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        voter.require_auth();
        voting::cast_vote(&env, asset_id, proposal_id, voter)
    }

    /// Get vote tally for a proposal
    pub fn get_vote_tally(env: Env, asset_id: u64, proposal_id: u64) -> Result<i128, Error> {
        voting::get_vote_tally(&env, asset_id, proposal_id)
    }

    /// Check if an address has voted
    pub fn has_voted(
        env: Env,
        asset_id: u64,
        proposal_id: u64,
        voter: Address,
    ) -> Result<bool, Error> {
        voting::has_voted(&env, asset_id, proposal_id, voter)
    }

    /// Check if proposal passed
    pub fn proposal_passed(env: Env, asset_id: u64, proposal_id: u64) -> Result<bool, Error> {
        voting::proposal_passed(&env, asset_id, proposal_id)
    }

    // =====================
    // Transfer Restrictions
    // =====================

    /// Set the accredited-investor requirement for a token's transfers.
    ///
    /// Auth: `caller` must authorize and be the asset's tokenizer or the admin.
    /// The geographic allow-list is left untouched; use
    /// `set_geographic_restriction` to change it.
    pub fn set_transfer_restriction(
        env: Env,
        asset_id: u64,
        require_accredited: bool,
        caller: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_asset_admin_or_tokenizer(&env, asset_id, &caller)?;

        transfer_restrictions::set_transfer_restriction(
            &env,
            asset_id,
            TransferRestriction {
                require_accredited,
                geographic_allowed: Vec::new(&env),
            },
        )
    }

    /// Add address to whitelist
    pub fn add_to_whitelist(env: Env, asset_id: u64, address: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        transfer_restrictions::add_to_whitelist(&env, asset_id, address)
    }

    /// Remove address from whitelist
    pub fn remove_from_whitelist(env: Env, asset_id: u64, address: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        transfer_restrictions::remove_from_whitelist(&env, asset_id, address)
    }

    /// Check if address is whitelisted
    pub fn is_whitelisted(env: Env, asset_id: u64, address: Address) -> Result<bool, Error> {
        transfer_restrictions::is_whitelisted(&env, asset_id, address)
    }

    /// Get whitelist
    pub fn get_whitelist(env: Env, asset_id: u64) -> Result<Vec<Address>, Error> {
        Self::get_whitelist_page(env, asset_id, 0, MAX_PAGE_SIZE)
    }

    /// A page of the asset's transfer whitelist (`[start, start + limit)`,
    /// `limit` capped at [`MAX_PAGE_SIZE`]). The un-paged
    /// [`Self::get_whitelist`] returns only the first page.
    pub fn get_whitelist_page(
        env: Env,
        asset_id: u64,
        start: u32,
        limit: u32,
    ) -> Result<Vec<Address>, Error> {
        Ok(page_of(
            &transfer_restrictions::get_whitelist(&env, asset_id)?,
            start,
            limit,
        ))
    }

    /// Set the jurisdiction allow-list for an asset's transfers
    pub fn set_geographic_restriction(
        env: Env,
        asset_id: u64,
        allowed_jurisdictions: Vec<String>,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        transfer_restrictions::set_geographic_restriction(&env, asset_id, allowed_jurisdictions)
    }

    /// Record the jurisdiction (ISO country code) of an address.
    ///
    /// Auth: `caller` must authorize and be the contract admin or a designated
    /// KYC/compliance attester. The subject (`address`) deliberately does **not**
    /// authorize this call: a holder cannot self-attest a jurisdiction in order
    /// to satisfy an asset's geographic allow-list.
    pub fn set_address_jurisdiction(
        env: Env,
        address: Address,
        jurisdiction: String,
        caller: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        caller.require_auth();
        let admin = Self::get_admin(env.clone())?;
        if caller != admin && !transfer_restrictions::is_jurisdiction_attester(&env, caller.clone())
        {
            return Err(Error::Unauthorized);
        }

        transfer_restrictions::set_address_jurisdiction(&env, address, jurisdiction)
    }

    /// Get the recorded jurisdiction of an address
    pub fn get_address_jurisdiction(env: Env, address: Address) -> Option<String> {
        transfer_restrictions::get_address_jurisdiction(&env, address)
    }

    /// Add `attester` to the admin-managed KYC/compliance attester set.
    ///
    /// Auth: the contract admin.
    pub fn add_jurisdiction_attester(env: Env, attester: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();
        transfer_restrictions::add_jurisdiction_attester(&env, attester)
    }

    /// Remove `attester` from the jurisdiction attester set.
    ///
    /// Auth: the contract admin.
    pub fn remove_jurisdiction_attester(env: Env, attester: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();
        transfer_restrictions::remove_jurisdiction_attester(&env, attester)
    }

    /// Whether `attester` may record jurisdictions. Read-only.
    pub fn is_jurisdiction_attester(env: Env, attester: Address) -> bool {
        transfer_restrictions::is_jurisdiction_attester(&env, attester)
    }

    /// The addresses that may record jurisdictions. Read-only.
    pub fn get_jurisdiction_attesters(env: Env) -> Vec<Address> {
        transfer_restrictions::get_jurisdiction_attesters(&env)
    }

    // =====================
    // Detokenization
    // =====================

    /// Propose detokenization
    pub fn propose_detokenization(
        env: Env,
        asset_id: u64,
        proposer: Address,
    ) -> Result<u64, Error> {
        Self::require_not_paused(&env)?;

        proposer.require_auth();
        detokenization::propose_detokenization(&env, asset_id, proposer)
    }

    /// Execute detokenization (if vote passed)
    pub fn execute_detokenization(env: Env, asset_id: u64, proposal_id: u64) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        detokenization::execute_detokenization(&env, asset_id, proposal_id)
    }

    /// Get detokenization proposal status
    pub fn get_detokenization_proposal(
        env: Env,
        asset_id: u64,
    ) -> Result<DetokenizationProposal, Error> {
        detokenization::get_detokenization_proposal(&env, asset_id)
    }

    /// Check if detokenization is active
    pub fn is_detokenization_active(env: Env, asset_id: u64) -> Result<bool, Error> {
        detokenization::is_detokenization_active(&env, asset_id)
    }

    // =====================
    // Insurance Policy Management
    // =====================

    /// Create a new insurance policy
    pub fn create_insurance_policy(
        env: Env,
        policy: insurance::InsurancePolicy,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        policy.insurer.require_auth();
        insurance::create_policy(env, policy)
    }

    /// Cancel a policy (holder or insurer)
    pub fn cancel_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        caller.require_auth();
        insurance::cancel_policy(env, policy_id, caller)
    }

    /// Suspend a policy (insurer only)
    pub fn suspend_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
        insurer: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        insurer.require_auth();
        insurance::suspend_policy(env, policy_id, insurer)
    }

    /// Expire a policy (permissionless)
    pub fn expire_insurance_policy(env: Env, policy_id: BytesN<32>) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        insurance::expire_policy(env, policy_id)
    }

    /// Renew a policy (insurer only)
    pub fn renew_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
        new_end_date: u64,
        new_premium: i128,
        insurer: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        insurer.require_auth();
        insurance::renew_policy(env, policy_id, new_end_date, new_premium, insurer)
    }

    /// Get a specific policy
    pub fn get_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
    ) -> Option<insurance::InsurancePolicy> {
        insurance::get_policy(env, policy_id)
    }

    /// Get all policies for an asset
    pub fn get_asset_insurance_policies(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
        Self::get_asset_insurance_policy_page(env, asset_id, 0, MAX_PAGE_SIZE)
    }

    /// A page of the asset's insurance policy ids (`[start, start + limit)`,
    /// `limit` capped at [`MAX_PAGE_SIZE`]). The un-paged
    /// [`Self::get_asset_insurance_policies`] returns only the first page.
    pub fn get_asset_insurance_policy_page(
        env: Env,
        asset_id: BytesN<32>,
        start: u32,
        limit: u32,
    ) -> Vec<BytesN<32>> {
        page_of(&insurance::get_asset_policies(env, asset_id), start, limit)
    }

    /// Emit an on-chain expiry reminder for a policy nearing its end date
    /// (permissionless; only fires inside the reminder window)
    pub fn emit_insurance_expiry_reminder(env: Env, policy_id: BytesN<32>) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        insurance::emit_expiry_reminder(env, policy_id)
    }

    /// Whether a policy is inside its pre-expiry reminder window
    pub fn is_insurance_expiry_reminder_due(env: Env, policy_id: BytesN<32>) -> bool {
        insurance::is_expiry_reminder_due(&env, &policy_id)
    }

    /// Create a new lease. Lessor authenticates; asset must not already be actively leased.
    pub fn create_lease(
        env: Env,
        asset_id: BytesN<32>,
        lease_id: BytesN<32>,
        lessor: Address,
        lessee: Address,
        start: u64,
        end: u64,
        rent: i128,
        deposit: i128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        lessor.require_auth();
        lease::create_lease(
            &env, asset_id, lease_id, lessor, lessee, start, end, rent, deposit,
        )
    }

    /// Return a leased asset. Callable by lessor or lessee.
    pub fn return_leased_asset(
        env: Env,
        lease_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        caller.require_auth();
        lease::return_leased_asset(&env, lease_id, caller)
    }

    /// Cancel a lease before it starts. Lessor only.
    pub fn cancel_lease(env: Env, lease_id: BytesN<32>, caller: Address) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        caller.require_auth();
        lease::cancel_lease(&env, lease_id, caller)
    }

    /// Expire a lease permissionlessly once end_timestamp has passed.
    pub fn expire_lease(env: Env, lease_id: BytesN<32>) -> Result<(), Error> {
        Self::require_not_paused(&env)?;

        lease::expire_lease(&env, lease_id)
    }

    /// Fetch a lease by ID.
    pub fn get_lease(env: Env, lease_id: BytesN<32>) -> Result<lease::Lease, Error> {
        lease::get_lease(&env, lease_id)
    }

    /// Return the active lease for an asset, or None.
    pub fn get_asset_active_lease(env: Env, asset_id: BytesN<32>) -> Option<lease::Lease> {
        lease::get_asset_active_lease(&env, asset_id)
    }

    /// Return all lease IDs for a given lessee.
    pub fn get_lessee_leases(env: Env, lessee: Address) -> Vec<BytesN<32>> {
        Self::get_lessee_leases_page(env, lessee, 0, MAX_PAGE_SIZE)
    }

    /// A page of the lease ids held by `lessee` (`[start, start + limit)`,
    /// `limit` capped at [`MAX_PAGE_SIZE`]). The un-paged
    /// [`Self::get_lessee_leases`] returns only the first page.
    pub fn get_lessee_leases_page(
        env: Env,
        lessee: Address,
        start: u32,
        limit: u32,
    ) -> Vec<BytesN<32>> {
        page_of(&lease::get_lessee_leases(&env, lessee), start, limit)
    }
}
