//! Address-level KYC records, gated on the contract admin.
//!
//! An address submits itself for review with `submit_kyc`; the admin then
//! `approve_kyc`s it at a tier with an expiry, or `revoke_kyc`s an existing
//! approval. `is_kyc_approved` also checks the expiry, so an approval that has
//! aged out reads as not-approved without needing an explicit revoke.

use crate::DataKey as GlobalDataKey;
use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KycStatus {
    Pending,
    Approved,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycRecord {
    pub address: Address,
    pub status: KycStatus,
    pub tier: u32,
    pub verified_at: u64,
    pub expires_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Record(Address),
}

fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&GlobalDataKey::Admin)
        .expect("Not initialized");
    if *caller != admin {
        panic!("Unauthorized");
    }
}

pub fn submit_kyc(env: Env, address: Address) {
    address.require_auth();

    let record = KycRecord {
        address: address.clone(),
        status: KycStatus::Pending,
        tier: 0,
        verified_at: 0,
        expires_at: 0,
    };
    env.storage()
        .persistent()
        .set(&DataKey::Record(address.clone()), &record);

    crate::events::kyc_submitted(&env, &address);
}

pub fn approve_kyc(env: Env, caller: Address, address: Address, tier: u32, expires_at: u64) {
    require_admin(&env, &caller);

    let key = DataKey::Record(address.clone());
    let mut record: KycRecord = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| KycRecord {
            address: address.clone(),
            status: KycStatus::Pending,
            tier: 0,
            verified_at: 0,
            expires_at: 0,
        });

    record.status = KycStatus::Approved;
    record.tier = tier;
    record.verified_at = env.ledger().timestamp();
    record.expires_at = expires_at;
    env.storage().persistent().set(&key, &record);

    crate::events::kyc_approved(&env, &address, tier, expires_at);
}

pub fn revoke_kyc(env: Env, caller: Address, address: Address) {
    require_admin(&env, &caller);

    let key = DataKey::Record(address.clone());
    let mut record: KycRecord = env
        .storage()
        .persistent()
        .get(&key)
        .expect("KYC record not found");
    record.status = KycStatus::Revoked;
    env.storage().persistent().set(&key, &record);

    crate::events::kyc_revoked(&env, &address, &caller);
}

pub fn is_kyc_approved(env: Env, address: Address) -> bool {
    let key = DataKey::Record(address);
    match env.storage().persistent().get::<_, KycRecord>(&key) {
        Some(record) => {
            record.status == KycStatus::Approved && env.ledger().timestamp() <= record.expires_at
        }
        None => false,
    }
}

pub fn get_kyc_record(env: Env, address: Address) -> KycRecord {
    env.storage()
        .persistent()
        .get(&DataKey::Record(address))
        .expect("KYC record not found")
}
