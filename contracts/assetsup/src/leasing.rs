#![allow(clippy::too_many_arguments)]

use soroban_sdk::{Address, BytesN, Env, Vec, contracttype, symbol_short};

use crate::error::Error;

// ── Types ──────────────────────────────────────────────────────────────────

/// Lifecycle states of a lease.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LeaseStatus {
    /// Lease is currently in force.
    Active,
    /// Lease ran past its end_timestamp without being returned.
    Expired,
    /// Lessee (or lessor) returned the asset before expiry.
    Returned,
    /// Lessor cancelled before the lease start date.
    Cancelled,
}

/// On-chain record of an asset lease agreement.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lease {
    /// Unique identifier for this lease.
    pub lease_id: BytesN<32>,
    /// The asset being leased (references asset registry).
    pub asset_id: BytesN<32>,
    /// Owner of the asset who is renting it out.
    pub lessor: Address,
    /// Party renting the asset.
    pub lessee: Address,
    /// Ledger timestamp when the lease begins.
    pub start_timestamp: u64,
    /// Ledger timestamp when the lease ends.
    pub end_timestamp: u64,
    /// Rent owed per agreed period (in stroops / smallest unit).
    pub rent_per_period: i128,
    /// Refundable security deposit (in stroops).
    pub deposit: i128,
    /// Current lifecycle state.
    pub status: LeaseStatus,
    /// Ledger timestamp when this record was created.
    pub created_at: u64,
    /// Ledger timestamp when the asset was returned (0 if not yet returned).
    pub returned_at: u64,
}

/// Storage keys used by the leasing module.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Full lease record by lease_id.
    Lease(BytesN<32>),
    /// Points to the active lease_id for an asset (absent when no active lease).
    AssetActiveLease(BytesN<32>),
    /// List of all lease_ids held by a given lessee.
    LesseeLeases(Address),
}

// ── Write operations ────────────────────────────────────────────────────────

/// Create a new lease for an asset.
///
/// Auth (`lessor.require_auth()`) is handled by the public contract wrapper in
/// `lib.rs`; this function only enforces business rules.
pub fn create_lease(
    env: &Env,
    asset_id: BytesN<32>,
    lease_id: BytesN<32>,
    lessor: Address,
    lessee: Address,
    start_timestamp: u64,
    end_timestamp: u64,
    rent_per_period: i128,
    deposit: i128,
) -> Result<Lease, Error> {
    if end_timestamp <= start_timestamp {
        return Err(Error::InvalidLeasePeriod);
    }
    if rent_per_period <= 0 {
        return Err(Error::InvalidRentAmount);
    }

    let store = env.storage().persistent();

    if store.has(&DataKey::Lease(lease_id.clone())) {
        return Err(Error::LeaseAlreadyExists);
    }
    if store.has(&DataKey::AssetActiveLease(asset_id.clone())) {
        return Err(Error::AssetAlreadyLeased);
    }

    let lease = Lease {
        lease_id: lease_id.clone(),
        asset_id: asset_id.clone(),
        lessor,
        lessee: lessee.clone(),
        start_timestamp,
        end_timestamp,
        rent_per_period,
        deposit,
        status: LeaseStatus::Active,
        created_at: env.ledger().timestamp(),
        returned_at: 0,
    };

    store.set(&DataKey::Lease(lease_id.clone()), &lease);
    store.set(&DataKey::AssetActiveLease(asset_id.clone()), &lease_id);

    // Append to lessee's history list.
    let lessee_key = DataKey::LesseeLeases(lessee.clone());
    let mut lessee_leases: Vec<BytesN<32>> = store
        .get(&lessee_key)
        .unwrap_or_else(|| Vec::new(env));
    lessee_leases.push_back(lease_id.clone());
    store.set(&lessee_key, &lessee_leases);

    env.events().publish(
        (symbol_short!("lease_cr"),),
        (lease_id, asset_id, lessee, env.ledger().timestamp()),
    );

    Ok(lease)
}

/// Mark a lease as returned early.
/// `caller` must be either the lessor or the lessee.
/// Auth is enforced by the lib.rs wrapper.
pub fn return_asset(
    env: &Env,
    lease_id: BytesN<32>,
    caller: Address,
) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Lease(lease_id.clone());

    let mut lease: Lease = store.get(&key).ok_or(Error::LeaseNotFound)?;

    if lease.status != LeaseStatus::Active {
        return Err(Error::LeaseNotActive);
    }
    if caller != lease.lessor && caller != lease.lessee {
        return Err(Error::Unauthorized);
    }

    lease.status = LeaseStatus::Returned;
    lease.returned_at = env.ledger().timestamp();
    store.set(&key, &lease);
    store.remove(&DataKey::AssetActiveLease(lease.asset_id.clone()));

    env.events().publish(
        (symbol_short!("lease_rt"),),
        (lease_id, caller, env.ledger().timestamp()),
    );

    Ok(())
}

/// Cancel a lease that has not yet started.
/// Only the lessor may cancel; auth is enforced by the lib.rs wrapper.
pub fn cancel_lease(
    env: &Env,
    lease_id: BytesN<32>,
    caller: Address,
) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Lease(lease_id.clone());

    let mut lease: Lease = store.get(&key).ok_or(Error::LeaseNotFound)?;

    if lease.status != LeaseStatus::Active {
        return Err(Error::LeaseNotActive);
    }
    if caller != lease.lessor {
        return Err(Error::Unauthorized);
    }
    if env.ledger().timestamp() >= lease.start_timestamp {
        return Err(Error::LeaseAlreadyStarted);
    }

    lease.status = LeaseStatus::Cancelled;
    store.set(&key, &lease);
    store.remove(&DataKey::AssetActiveLease(lease.asset_id.clone()));

    env.events().publish(
        (symbol_short!("lease_cx"),),
        (lease_id, caller, env.ledger().timestamp()),
    );

    Ok(())
}

/// Settle a lease as expired once its `end_timestamp` has passed.
/// Anyone may call this (no auth required).
pub fn expire_lease(env: &Env, lease_id: BytesN<32>) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = DataKey::Lease(lease_id.clone());

    let mut lease: Lease = store.get(&key).ok_or(Error::LeaseNotFound)?;

    if lease.status != LeaseStatus::Active {
        return Err(Error::LeaseNotActive);
    }
    if env.ledger().timestamp() < lease.end_timestamp {
        return Err(Error::LeaseNotExpired);
    }

    lease.status = LeaseStatus::Expired;
    store.set(&key, &lease);
    store.remove(&DataKey::AssetActiveLease(lease.asset_id.clone()));

    env.events().publish(
        (symbol_short!("lease_ex"),),
        (lease_id, env.ledger().timestamp()),
    );

    Ok(())
}

// ── Read operations ─────────────────────────────────────────────────────────

/// Fetch a lease record by its ID.
pub fn get_lease(env: &Env, lease_id: BytesN<32>) -> Result<Lease, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Lease(lease_id))
        .ok_or(Error::LeaseNotFound)
}

/// Return the active lease ID for an asset, or `None` if it is not leased.
pub fn get_asset_active_lease(env: &Env, asset_id: BytesN<32>) -> Option<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::AssetActiveLease(asset_id))
}

/// Return all lease IDs associated with a lessee.
pub fn get_lessee_leases(env: &Env, lessee: Address) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::LesseeLeases(lessee))
        .unwrap_or_else(|| Vec::new(env))
}
