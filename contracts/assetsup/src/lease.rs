use soroban_sdk::{contracttype, Address, BytesN, Env, Vec};

use crate::error::Error;

// ─── Types ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LeaseStatus {
    Active,
    Returned,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Lease {
    pub lease_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub lessor: Address,
    pub lessee: Address,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub rent_per_period: i128,
    pub deposit: i128,
    pub status: LeaseStatus,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Lease(BytesN<32>),
    AssetActiveLease(BytesN<32>),
    LesseeLeases(Address),
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

fn load_lease(env: &Env, lease_id: &BytesN<32>) -> Result<Lease, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Lease(lease_id.clone()))
        .ok_or(Error::LeaseNotFound)
}

fn save_lease(env: &Env, lease: &Lease) {
    env.storage()
        .persistent()
        .set(&DataKey::Lease(lease.lease_id.clone()), lease);
}

fn set_asset_active_lease(env: &Env, asset_id: &BytesN<32>, lease_id: &BytesN<32>) {
    env.storage()
        .persistent()
        .set(&DataKey::AssetActiveLease(asset_id.clone()), lease_id);
}

fn clear_asset_active_lease(env: &Env, asset_id: &BytesN<32>) {
    env.storage()
        .persistent()
        .remove(&DataKey::AssetActiveLease(asset_id.clone()));
}

fn get_active_lease_id(env: &Env, asset_id: &BytesN<32>) -> Option<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::AssetActiveLease(asset_id.clone()))
}

fn append_lessee_lease(env: &Env, lessee: &Address, lease_id: &BytesN<32>) {
    let key = DataKey::LesseeLeases(lessee.clone());
    let mut ids: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    ids.push_back(lease_id.clone());
    env.storage().persistent().set(&key, &ids);
}

// ─── Public functions (called from lib.rs) ────────────────────────────────────

pub fn create_lease(
    env: &Env,
    asset_id: BytesN<32>,
    lease_id: BytesN<32>,
    lessor: Address,
    lessee: Address,
    start: u64,
    end: u64,
    rent: i128,
    deposit: i128,
) -> Result<(), Error> {
    if end <= start {
        return Err(Error::InvalidTimestamps);
    }

    if env
        .storage()
        .persistent()
        .has(&DataKey::Lease(lease_id.clone()))
    {
        return Err(Error::LeaseAlreadyExists);
    }

    // Asset must not already have an Active lease
    if let Some(existing_id) = get_active_lease_id(env, &asset_id) {
        let existing = load_lease(env, &existing_id)?;
        if existing.status == LeaseStatus::Active {
            return Err(Error::AssetAlreadyLeased);
        }
    }

    let lease = Lease {
        lease_id: lease_id.clone(),
        asset_id: asset_id.clone(),
        lessor: lessor.clone(),
        lessee: lessee.clone(),
        start_timestamp: start,
        end_timestamp: end,
        rent_per_period: rent,
        deposit,
        status: LeaseStatus::Active,
    };

    save_lease(env, &lease);
    set_asset_active_lease(env, &asset_id, &lease_id);
    append_lessee_lease(env, &lessee, &lease_id);

    env.events().publish(
        (soroban_sdk::symbol_short!("lease_new"),),
        (lease_id, asset_id, lessor, lessee, env.ledger().timestamp()),
    );

    Ok(())
}

pub fn return_leased_asset(env: &Env, lease_id: BytesN<32>, caller: Address) -> Result<(), Error> {
    let mut lease = load_lease(env, &lease_id)?;

    if caller != lease.lessor && caller != lease.lessee {
        return Err(Error::Unauthorized);
    }

    if lease.status != LeaseStatus::Active {
        return Err(Error::InvalidLeaseStatus);
    }

    lease.status = LeaseStatus::Returned;
    save_lease(env, &lease);
    clear_asset_active_lease(env, &lease.asset_id);

    env.events().publish(
        (soroban_sdk::symbol_short!("lease_ret"),),
        (lease_id, caller, env.ledger().timestamp()),
    );

    Ok(())
}

pub fn cancel_lease(env: &Env, lease_id: BytesN<32>, caller: Address) -> Result<(), Error> {
    let mut lease = load_lease(env, &lease_id)?;

    if caller != lease.lessor {
        return Err(Error::Unauthorized);
    }

    if lease.status != LeaseStatus::Active {
        return Err(Error::InvalidLeaseStatus);
    }

    if env.ledger().timestamp() >= lease.start_timestamp {
        return Err(Error::LeaseAlreadyStarted);
    }

    lease.status = LeaseStatus::Cancelled;
    save_lease(env, &lease);
    clear_asset_active_lease(env, &lease.asset_id);

    env.events().publish(
        (soroban_sdk::symbol_short!("lease_can"),),
        (lease_id, caller, env.ledger().timestamp()),
    );

    Ok(())
}

pub fn expire_lease(env: &Env, lease_id: BytesN<32>) -> Result<(), Error> {
    let mut lease = load_lease(env, &lease_id)?;

    if lease.status != LeaseStatus::Active {
        return Err(Error::InvalidLeaseStatus);
    }

    if env.ledger().timestamp() <= lease.end_timestamp {
        return Err(Error::LeaseNotExpired);
    }

    lease.status = LeaseStatus::Expired;
    save_lease(env, &lease);
    clear_asset_active_lease(env, &lease.asset_id);

    env.events().publish(
        (soroban_sdk::symbol_short!("lease_exp"),),
        (lease_id, env.ledger().timestamp()),
    );

    Ok(())
}

pub fn get_lease(env: &Env, lease_id: BytesN<32>) -> Result<Lease, Error> {
    load_lease(env, &lease_id)
}

pub fn get_asset_active_lease(env: &Env, asset_id: BytesN<32>) -> Option<Lease> {
    get_active_lease_id(env, &asset_id).and_then(|id| load_lease(env, &id).ok())
}

pub fn get_lessee_leases(env: &Env, lessee: Address) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::LesseeLeases(lessee))
        .unwrap_or_else(|| Vec::new(env))
}
