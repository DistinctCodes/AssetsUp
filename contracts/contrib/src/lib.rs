#![no_std]
#![allow(clippy::too_many_arguments)]
//! # contrib
//!
//! A second AssetsUp asset registry carrying the capabilities `assetsup` does
//! not have: escrow, KYC, staking, a price oracle, and a first-class emergency
//! pause.
//!
//! ## Relationship to `assetsup`
//!
//! `contrib` and `assetsup` are **independent contracts with separate
//! storage**. Neither reads or calls the other. Several module names appear in
//! both (`audit`, `detokenization`, `insurance`, `lease`, `tokenization`) but
//! the implementations have diverged and are not interchangeable. See
//! `contracts/README.md` for the ownership split.
//!
//! ## Invariants
//!
//! - An asset has exactly one owner at any time.
//! - A retired asset cannot be transferred.
//! - While paused, mutating registry entrypoints reject; reads still work.
//! - Escrowed funds are either released to the beneficiary or returned to the
//!   depositor — never both.
//!
//! Unlike `assetsup`, every acting address here is authenticated with
//! `require_auth()`; this crate is the reference for authorization in the
//! workspace.
//!
//! See [`README.md`](https://github.com/DistinctCodes/AssetsUp/blob/main/contracts/contrib/README.md)
//! for the full entrypoint, storage, event, and error tables.

mod audit;
pub mod events;
mod pause;
mod types;

mod insurance;
mod lease;

mod escrow;
mod kyc;
mod oracle;
mod staking;

#[cfg(test)]
mod tests;

use crate::types::AssetStatus;
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

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
        // Without this, whoever calls initialize first becomes admin of a
        // freshly deployed contract, regardless of who deployed it.
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Paused, &false);
        env.storage().persistent().set(&DataKey::TotalCount, &0u64);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(admin.clone()), &true);

        events::contract_initialized(&env, &admin);
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
            .set(&DataKey::AuthorizedRegistrar(registrar.clone()), &true);

        events::registrar_added(&env, &registrar, &caller);
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
            .set(&DataKey::AuthorizedRegistrar(registrar.clone()), &false);

        events::registrar_removed(&env, &registrar, &caller);
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
        env.storage()
            .persistent()
            .get(&DataKey::TotalCount)
            .unwrap_or(0)
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

        events::asset_registered(&env, &asset.id, &asset.owner);
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

        events::asset_transferred(&env, &asset_id, &old_owner, &new_owner);
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

        events::asset_retired(&env, &asset_id, &caller);
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
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage().persistent().set(&DataKey::Paused, &true);
    }

    pub fn unpause_contract(env: Env, caller: Address) {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if caller != admin {
            panic!("Unauthorized");
        }
        env.storage().persistent().set(&DataKey::Paused, &false);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    fn add_to_owner_registry(env: &Env, owner: &Address, asset_id: &BytesN<32>) {
        let store = env.storage().persistent();
        let owner_key = DataKey::OwnerAssets(owner.clone());
        let mut owner_assets: Vec<BytesN<32>> =
            store.get(&owner_key).unwrap_or_else(|| Vec::new(env));
        if owner_assets.iter().position(|x| x == *asset_id).is_none() {
            owner_assets.push_back(asset_id.clone());
        }
        store.set(&owner_key, &owner_assets);
    }

    fn remove_from_owner_registry(env: &Env, owner: &Address, asset_id: &BytesN<32>) {
        let store = env.storage().persistent();
        let owner_key = DataKey::OwnerAssets(owner.clone());
        let mut owner_assets: Vec<BytesN<32>> =
            store.get(&owner_key).unwrap_or_else(|| Vec::new(env));
        if let Some(idx) = owner_assets.iter().position(|x| x == *asset_id) {
            owner_assets.remove(idx as u32);
        }
        store.set(&owner_key, &owner_assets);
    }

    fn check_not_paused(env: &Env) {
        if env
            .storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false)
        {
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

    pub fn submit_claim(
        env: Env,
        policy_id: BytesN<32>,
        amount: i128,
        description: String,
        claimant: Address,
    ) {
        insurance::submit_claim(env, policy_id, amount, description, claimant);
    }

    pub fn update_claim_status(
        env: Env,
        claim_id: BytesN<32>,
        new_status: insurance::ClaimStatus,
        insurer: Address,
    ) {
        insurance::update_claim_status(env, claim_id, new_status, insurer);
    }

    pub fn get_claim(env: Env, claim_id: BytesN<32>) -> insurance::InsuranceClaim {
        insurance::get_claim(env, claim_id)
    }

    pub fn get_claims_for_policy(env: Env, policy_id: BytesN<32>) -> Vec<BytesN<32>> {
        insurance::get_claims_for_policy(env, policy_id)
    }

    // --- Lease Functions ---

    #[allow(clippy::too_many_arguments)]
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

    // --- KYC Functions ---

    pub fn submit_kyc(env: Env, address: Address) {
        kyc::submit_kyc(env, address);
    }

    pub fn approve_kyc(env: Env, caller: Address, address: Address, tier: u32, expires_at: u64) {
        kyc::approve_kyc(env, caller, address, tier, expires_at);
    }

    pub fn revoke_kyc(env: Env, caller: Address, address: Address) {
        kyc::revoke_kyc(env, caller, address);
    }

    pub fn is_kyc_approved(env: Env, address: Address) -> bool {
        kyc::is_kyc_approved(env, address)
    }

    pub fn get_kyc_record(env: Env, address: Address) -> kyc::KycRecord {
        kyc::get_kyc_record(env, address)
    }

    // --- Oracle Functions ---

    pub fn add_oracle(env: Env, caller: Address, oracle: Address) {
        oracle::add_oracle(env, caller, oracle);
    }

    pub fn remove_oracle(env: Env, caller: Address, oracle: Address) {
        oracle::remove_oracle(env, caller, oracle);
    }

    pub fn update_valuation(
        env: Env,
        source: Address,
        asset_id: u64,
        value: i128,
        currency: String,
    ) {
        oracle::update_valuation(env, source, asset_id, value, currency);
    }

    pub fn get_latest_valuation(env: Env, asset_id: u64) -> oracle::ValuationEntry {
        oracle::get_latest_valuation(env, asset_id)
    }

    pub fn get_valuation_history(env: Env, asset_id: u64) -> Vec<oracle::ValuationEntry> {
        oracle::get_valuation_history(env, asset_id)
    }

    // --- Staking Functions ---

    pub fn stake_tokens(env: Env, asset_id: u64, staker: Address, amount: i128, lock_period: u64) {
        staking::stake_tokens(env, asset_id, staker, amount, lock_period);
    }

    pub fn unstake_tokens(env: Env, asset_id: u64, staker: Address) {
        staking::unstake_tokens(env, asset_id, staker);
    }

    pub fn get_staking_power(env: Env, asset_id: u64, staker: Address) -> i128 {
        staking::get_staking_power(env, asset_id, staker)
    }

    pub fn accrue_staking_rewards(env: Env, caller: Address, asset_id: u64) {
        staking::accrue_staking_rewards(env, caller, asset_id);
    }

    // --- Escrow Functions ---

    #[allow(clippy::too_many_arguments)]
    pub fn create_escrow(
        env: Env,
        asset_id: u64,
        seller: Address,
        buyer: Address,
        amount: i128,
        token_address: Address,
        deadline: u64,
    ) -> u64 {
        escrow::create_escrow(
            env,
            asset_id,
            seller,
            buyer,
            amount,
            token_address,
            deadline,
        )
    }

    pub fn confirm_release(env: Env, escrow_id: u64, caller: Address) {
        escrow::confirm_release(env, escrow_id, caller);
    }

    pub fn cancel_escrow(env: Env, escrow_id: u64, caller: Address) {
        escrow::cancel_escrow(env, escrow_id, caller);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> escrow::Escrow {
        escrow::get_escrow(env, escrow_id)
    }
}
