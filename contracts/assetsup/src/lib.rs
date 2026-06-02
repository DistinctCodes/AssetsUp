#![no_std]
#![allow(clippy::too_many_arguments)]

use crate::error::{handle_error, Error};
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String, Vec,
};

pub(crate) mod asset;
pub(crate) mod audit;
pub(crate) mod branch;
pub(crate) mod detokenization;
pub(crate) mod dividends;
pub(crate) mod error;
pub(crate) mod insurance;
pub(crate) mod lease;
pub(crate) mod tokenization;
pub(crate) mod transfer_restrictions;
pub(crate) mod types;
pub(crate) mod voting;

#[cfg(test)]
mod tests;

pub use types::*;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Paused,
    TotalAssetCount,
    ContractMetadata,
    AuthorizedRegistrar(Address),
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
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false))
    }

    pub fn get_total_asset_count(env: Env) -> Result<u64, Error> {
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::TotalAssetCount)
            .unwrap_or(0u64))
    }

    pub fn get_contract_metadata(env: Env) -> Result<ContractMetadata, Error> {
        let metadata = env.storage().persistent().get(&DataKey::ContractMetadata);
        match metadata {
            Some(m) => Ok(m),
            None => handle_error(&env, Error::ContractNotInitialized),
        }
    }

    pub fn is_authorized_registrar(env: Env, address: Address) -> Result<bool, Error> {
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::AuthorizedRegistrar(address))
            .unwrap_or(false))
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
        let mut owner_assets: Vec<BytesN<32>> =
            store.get(&owner_key).unwrap_or_else(|| Vec::new(&env));
        owner_assets.push_back(asset.id.clone());
        store.set(&owner_key, &owner_assets);

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

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "METADATA_UPDATED"),
            caller.clone(),
            String::from_str(&env, "Asset metadata updated"),
        );

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

        let old_owner = asset.owner.clone();

        // Remove asset from old owner's registry
        let old_owner_key = asset::DataKey::OwnerRegistry(old_owner.clone());
        let mut old_owner_assets: Vec<BytesN<32>> =
            store.get(&old_owner_key).unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = old_owner_assets.iter().position(|x| x == asset_id) {
            old_owner_assets.remove(index as u32);
        }
        store.set(&old_owner_key, &old_owner_assets);

        // Add asset to new owner's registry
        let new_owner_key = asset::DataKey::OwnerRegistry(new_owner.clone());
        let mut new_owner_assets: Vec<BytesN<32>> =
            store.get(&new_owner_key).unwrap_or_else(|| Vec::new(&env));
        new_owner_assets.push_back(asset_id.clone());
        store.set(&new_owner_key, &new_owner_assets);

        // Update asset
        asset.owner = new_owner.clone();
        asset.last_transfer_timestamp = env.ledger().timestamp();
        asset.status = AssetStatus::Transferred;
        store.set(&key, &asset);

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "OWNERSHIP_TRANSFERRED"),
            caller.clone(),
            String::from_str(&env, "Asset ownership transferred to new owner"),
        );

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

        // Append audit log
        audit::append_audit_log(
            &env,
            &asset_id,
            String::from_str(&env, "ASSET_RETIRED"),
            caller.clone(),
            String::from_str(&env, "Asset retired from active use"),
        );

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

    pub fn batch_get_asset_info(
        env: Env,
        asset_ids: Vec<BytesN<32>>,
    ) -> Result<Vec<asset::AssetInfo>, Error> {
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
        let zero_address = Address::from_str(
            &env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        );
        if new_admin == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        let old_admin = current_admin.clone();
        env.storage().persistent().set(&DataKey::Admin, &new_admin);

        // Remove old admin from authorized registrars and add new admin
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(old_admin.clone()), &false);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(new_admin.clone()), &true);

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

        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar), &true);
        Ok(())
    }

    pub fn remove_authorized_registrar(env: Env, registrar: Address) -> Result<(), Error> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        // Cannot remove admin from authorized registrars
        if registrar == admin {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(registrar), &false);
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

    pub fn get_asset_audit_logs(
        env: Env,
        asset_id: BytesN<32>,
    ) -> Result<Vec<audit::AuditEntry>, Error> {
        Ok(audit::get_asset_log(&env, &asset_id))
    }

    // =====================
    // Tokenization Functions
    // =====================

    /// Tokenize an asset with full supply to tokenizer
    pub fn tokenize_asset(
        env: Env,
        asset_id: u64,
        symbol: String,
        total_supply: i128,
        decimals: u32,
        min_voting_threshold: i128,
        tokenizer: Address,
        name: String,
        description: String,
        asset_type: AssetType,
    ) -> Result<TokenizedAsset, Error> {
        tokenizer.require_auth();

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

        tokenization::tokenize_asset(
            &env,
            asset_id,
            symbol,
            total_supply,
            decimals,
            min_voting_threshold,
            tokenizer,
            metadata,
        )
    }

    /// Mint additional tokens (only tokenizer can call)
    pub fn mint_tokens(
        env: Env,
        asset_id: u64,
        amount: i128,
        minter: Address,
    ) -> Result<TokenizedAsset, Error> {
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
        tokenization::get_token_holders(&env, asset_id)
    }

    /// Lock tokens until timestamp (only the asset tokenizer can call this)
    pub fn lock_tokens(
        env: Env,
        asset_id: u64,
        holder: Address,
        until_timestamp: u64,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        tokenization::lock_tokens(&env, asset_id, holder, until_timestamp, caller)
    }

    /// Unlock tokens
    pub fn unlock_tokens(env: Env, asset_id: u64, holder: Address) -> Result<(), Error> {
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
        tokenization::update_valuation(&env, asset_id, new_valuation)
    }

    // =====================
    // Dividend Functions
    // =====================

    /// Distribute dividends proportionally to all holders
    pub fn distribute_dividends(env: Env, asset_id: u64, total_amount: i128) -> Result<(), Error> {
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
    pub fn enable_revenue_sharing(env: Env, asset_id: u64) -> Result<(), Error> {
        dividends::enable_revenue_sharing(&env, asset_id)
    }

    /// Disable revenue sharing for an asset
    pub fn disable_revenue_sharing(env: Env, asset_id: u64) -> Result<(), Error> {
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

    /// Set transfer restrictions
    pub fn set_transfer_restriction(
        env: Env,
        asset_id: u64,
        require_accredited: bool,
    ) -> Result<(), Error> {
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
        transfer_restrictions::add_to_whitelist(&env, asset_id, address)
    }

    /// Remove address from whitelist
    pub fn remove_from_whitelist(env: Env, asset_id: u64, address: Address) -> Result<(), Error> {
        transfer_restrictions::remove_from_whitelist(&env, asset_id, address)
    }

    /// Check if address is whitelisted
    pub fn is_whitelisted(env: Env, asset_id: u64, address: Address) -> Result<bool, Error> {
        transfer_restrictions::is_whitelisted(&env, asset_id, address)
    }

    /// Get whitelist
    pub fn get_whitelist(env: Env, asset_id: u64) -> Result<Vec<Address>, Error> {
        transfer_restrictions::get_whitelist(&env, asset_id)
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
        proposer.require_auth();
        detokenization::propose_detokenization(&env, asset_id, proposer)
    }

    /// Execute detokenization (if vote passed)
    pub fn execute_detokenization(env: Env, asset_id: u64, proposal_id: u64) -> Result<(), Error> {
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
        policy.insurer.require_auth();
        insurance::create_policy(env, policy)
    }

    /// Cancel a policy (holder or insurer)
    pub fn cancel_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        insurance::cancel_policy(env, policy_id, caller)
    }

    /// Suspend a policy (insurer only)
    pub fn suspend_insurance_policy(
        env: Env,
        policy_id: BytesN<32>,
        insurer: Address,
    ) -> Result<(), Error> {
        insurer.require_auth();
        insurance::suspend_policy(env, policy_id, insurer)
    }

    /// Expire a policy (permissionless)
    pub fn expire_insurance_policy(env: Env, policy_id: BytesN<32>) -> Result<(), Error> {
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
        insurance::get_asset_policies(env, asset_id)
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
        caller.require_auth();
        lease::return_leased_asset(&env, lease_id, caller)
    }

    /// Cancel a lease before it starts. Lessor only.
    pub fn cancel_lease(env: Env, lease_id: BytesN<32>, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        lease::cancel_lease(&env, lease_id, caller)
    }

    /// Expire a lease permissionlessly once end_timestamp has passed.
    pub fn expire_lease(env: Env, lease_id: BytesN<32>) -> Result<(), Error> {
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
        lease::get_lessee_leases(&env, lessee)
    }
}
