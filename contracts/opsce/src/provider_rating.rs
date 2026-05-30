//! Provider rating module
//!
//! Implements a 1-5 star rating system that lets an asset owner rate a
//! maintenance provider after a maintenance record is marked complete.
//!
//! Acceptance criteria covered:
//! - `rate_provider(env, record_id, rating, comment)` — caller must be the
//!   asset owner; rating must be 1..=5
//! - Maintains a running average rating stored on the `ProviderProfile`
//!   (scaled by 100, e.g. 4.50 stars => 450)
//! - A given record may be rated only once. Re-rating returns
//!   `Err(ContractError::AlreadyRated)`.
//! - `get_provider_rating(env, provider_address)` returns
//!   `{ average_rating, total_reviews }`
//! - Emits a `provider_rated` event carrying the rating value and record id

use soroban_sdk::{contracttype, Address, Env, String, Symbol};

pub use crate::error::ContractError;

/// Provider profile with cumulative rating fields.
///
/// `average_rating` is stored scaled by 100 so a rating of 4.5 stars is
/// represented as 450. This avoids floating point in the WASM contract while
/// preserving two decimal places of precision.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderProfile {
    pub address: Address,
    pub total_reviews: u32,
    pub rating_sum: u32,
    pub average_rating: u32,
}

/// Lightweight maintenance record needed for the rating workflow.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecord {
    pub record_id: u64,
    pub asset_id: u64,
    pub provider: Address,
    pub owner: Address,
    pub completed: bool,
}

/// Public read model returned by `get_provider_rating`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderRating {
    /// Average rating scaled by 100 (e.g. 450 = 4.50 stars). Zero when no
    /// reviews have been submitted yet.
    pub average_rating: u32,
    pub total_reviews: u32,
}

/// Persisted rating entry for a single maintenance record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Review {
    pub record_id: u64,
    pub provider: Address,
    pub rater: Address,
    pub rating: u32,
    pub comment: String,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Provider(Address),
    Record(u64),
    /// Marker key written when a record has been rated.
    RatedRecord(u64),
    /// The persisted review for a record id.
    Review(u64),
}

/// Read the admin address registered through [`init`].
pub fn read_admin(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .persistent()
        .get(&DataKey::Admin)
        .ok_or(ContractError::NotInitialized)
}

/// One-time initialization. Stores the admin used to register providers and
/// seed maintenance records.
pub fn init(env: &Env, admin: Address) -> Result<(), ContractError> {
    if env.storage().persistent().has(&DataKey::Admin) {
        return Err(ContractError::AlreadyInitialized);
    }
    env.storage().persistent().set(&DataKey::Admin, &admin);
    Ok(())
}

/// Register a new provider with a zeroed rating profile. Admin only.
pub fn register_provider(env: &Env, provider: Address) -> Result<(), ContractError> {
    let admin = read_admin(env)?;
    admin.require_auth();

    let profile = ProviderProfile {
        address: provider.clone(),
        total_reviews: 0,
        rating_sum: 0,
        average_rating: 0,
    };
    env.storage()
        .persistent()
        .set(&DataKey::Provider(provider), &profile);
    Ok(())
}

/// Persist a maintenance record (already completed). Admin only.
///
/// In production this would be invoked by the asset-maintenance contract when
/// a record is marked complete; here it acts as the entry point that makes a
/// record eligible for rating.
pub fn record_completed_maintenance(
    env: &Env,
    record_id: u64,
    asset_id: u64,
    owner: Address,
    provider: Address,
) -> Result<(), ContractError> {
    let admin = read_admin(env)?;
    admin.require_auth();

    if !env
        .storage()
        .persistent()
        .has(&DataKey::Provider(provider.clone()))
    {
        return Err(ContractError::ProviderNotFound);
    }

    let record = MaintenanceRecord {
        record_id,
        asset_id,
        provider,
        owner,
        completed: true,
    };
    env.storage()
        .persistent()
        .set(&DataKey::Record(record_id), &record);
    Ok(())
}

/// Rate a provider on a completed maintenance record.
///
/// Authorization: the asset owner stored on the record must authorize the
/// call (`require_auth`). Rating must be in the inclusive range 1..=5 and each
/// record can be rated only once.
pub fn rate_provider(
    env: &Env,
    record_id: u64,
    rating: u32,
    comment: String,
) -> Result<(), ContractError> {
    // Validate rating bounds first so 0 and 6+ are rejected before any
    // storage access.
    if rating < 1 || rating > 5 {
        return Err(ContractError::InvalidRating);
    }

    let record: MaintenanceRecord = env
        .storage()
        .persistent()
        .get(&DataKey::Record(record_id))
        .ok_or(ContractError::RecordNotFound)?;

    if !record.completed {
        return Err(ContractError::RecordNotComplete);
    }

    // Caller must be the asset owner stored on the record.
    record.owner.require_auth();

    if env
        .storage()
        .persistent()
        .has(&DataKey::RatedRecord(record_id))
    {
        return Err(ContractError::AlreadyRated);
    }

    let mut profile: ProviderProfile = env
        .storage()
        .persistent()
        .get(&DataKey::Provider(record.provider.clone()))
        .ok_or(ContractError::ProviderNotFound)?;

    // Update the running totals and average (scaled by 100).
    profile.rating_sum = profile.rating_sum.saturating_add(rating);
    profile.total_reviews = profile.total_reviews.saturating_add(1);
    profile.average_rating = (profile.rating_sum.saturating_mul(100)) / profile.total_reviews;

    env.storage()
        .persistent()
        .set(&DataKey::Provider(record.provider.clone()), &profile);

    // Mark this record as rated and persist the review entry.
    env.storage()
        .persistent()
        .set(&DataKey::RatedRecord(record_id), &true);

    let review = Review {
        record_id,
        provider: record.provider.clone(),
        rater: record.owner.clone(),
        rating,
        comment,
        timestamp: env.ledger().timestamp(),
    };
    env.storage()
        .persistent()
        .set(&DataKey::Review(record_id), &review);

    // Emit the `provider_rated` event with the rating value and record id.
    let topic = Symbol::new(env, "provider_rated");
    env.events()
        .publish((topic, record.provider), (rating, record_id));

    Ok(())
}

/// Returns the current `{ average_rating, total_reviews }` for a provider.
/// Unknown providers return zero values rather than an error so callers can
/// use this as a cheap query.
pub fn get_provider_rating(env: &Env, provider_address: Address) -> ProviderRating {
    match env
        .storage()
        .persistent()
        .get::<_, ProviderProfile>(&DataKey::Provider(provider_address))
    {
        Some(p) => ProviderRating {
            average_rating: p.average_rating,
            total_reviews: p.total_reviews,
        },
        None => ProviderRating {
            average_rating: 0,
            total_reviews: 0,
        },
    }
}

/// Fetch the persisted review for a record, if any.
pub fn get_review(env: &Env, record_id: u64) -> Option<Review> {
    env.storage().persistent().get(&DataKey::Review(record_id))
}
