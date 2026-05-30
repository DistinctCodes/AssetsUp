#![no_std]
#![allow(clippy::too_many_arguments)]

pub mod error;
pub mod kyc_verification;
pub mod provider_rating;

pub use error::ContractError;
pub use kyc_verification::{KycDataKey, KycRecord, KycStatus, KycStatusInfo};
pub use provider_rating::{
    DataKey, MaintenanceRecord, ProviderProfile, ProviderRating, Review,
};

use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct OpsceContract;

#[contractimpl]
impl OpsceContract {
    // ---- Lifecycle ----

    pub fn init(env: Env, admin: Address) -> Result<(), ContractError> {
        provider_rating::init(&env, admin)
    }

    // ---- Provider rating ----

    pub fn register_provider(env: Env, provider: Address) -> Result<(), ContractError> {
        provider_rating::register_provider(&env, provider)
    }

    pub fn record_completed_maintenance(
        env: Env,
        record_id: u64,
        asset_id: u64,
        owner: Address,
        provider: Address,
    ) -> Result<(), ContractError> {
        provider_rating::record_completed_maintenance(&env, record_id, asset_id, owner, provider)
    }

    pub fn rate_provider(
        env: Env,
        record_id: u64,
        rating: u32,
        comment: String,
    ) -> Result<(), ContractError> {
        provider_rating::rate_provider(&env, record_id, rating, comment)
    }

    pub fn get_provider_rating(env: Env, provider_address: Address) -> ProviderRating {
        provider_rating::get_provider_rating(&env, provider_address)
    }

    pub fn get_review(env: Env, record_id: u64) -> Option<Review> {
        provider_rating::get_review(&env, record_id)
    }

    // ---- KYC verification ----

    pub fn add_kyc_oracle(env: Env, oracle: Address) -> Result<(), ContractError> {
        kyc_verification::add_kyc_oracle(&env, oracle)
    }

    pub fn remove_kyc_oracle(env: Env, oracle: Address) -> Result<(), ContractError> {
        kyc_verification::remove_kyc_oracle(&env, oracle)
    }

    pub fn is_kyc_oracle(env: Env, oracle: Address) -> bool {
        kyc_verification::is_kyc_oracle(&env, oracle)
    }

    pub fn submit_kyc_result(
        env: Env,
        oracle: Address,
        address: Address,
        status: KycStatus,
        expiry: u64,
    ) -> Result<(), ContractError> {
        kyc_verification::submit_kyc_result(&env, oracle, address, status, expiry)
    }

    pub fn require_kyc(env: Env, address: Address) -> Result<(), ContractError> {
        kyc_verification::require_kyc(&env, address)
    }

    pub fn get_kyc_status(env: Env, address: Address) -> KycStatusInfo {
        kyc_verification::get_kyc_status(&env, address)
    }
}

#[cfg(test)]
mod tests_provider_rating;

#[cfg(test)]
mod tests_kyc;
