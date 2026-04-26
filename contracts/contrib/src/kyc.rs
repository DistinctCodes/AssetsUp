#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KycStatus {
    Pending,
    Approved,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct KycRecord {
    pub address: Address,
    pub status: KycStatus,
    pub tier: u32,
    pub verified_at: u64,
    pub expires_at: u64,
}

#[contracttype]
pub enum DataKey {
    Record(Address),
    Admin,
}

#[contract]
pub struct KycContract;

#[contractimpl]
impl KycContract {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
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

        env.storage().persistent().set(&DataKey::Record(address.clone()), &record);
        env.events().publish((Symbol::new(&env, "kyc_submitted"), address), ());
    }

    pub fn approve_kyc(env: Env, address: Address, tier: u32, expires_at: u64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Record(address.clone());
        let mut record: KycRecord = env.storage().persistent().get(&key).unwrap_or(KycRecord {
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
        env.events().publish((Symbol::new(&env, "kyc_approved"), address), (tier, expires_at));
    }

    pub fn revoke_kyc(env: Env, address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Record(address.clone());
        let mut record: KycRecord = env.storage().persistent().get(&key).unwrap();
        
        record.status = KycStatus::Revoked;
        
        env.storage().persistent().set(&key, &record);
        env.events().publish((Symbol::new(&env, "kyc_revoked"), address), ());
    }

    pub fn is_kyc_approved(env: Env, address: Address) -> bool {
        let key = DataKey::Record(address);
        if let Some(record) = env.storage().persistent().get::<_, KycRecord>(&key) {
            if record.status == KycStatus::Approved {
                let current_time = env.ledger().timestamp();
                if current_time <= record.expires_at {
                    return true;
                }
            }
        }
        false
    }

    pub fn get_kyc_record(env: Env, address: Address) -> KycRecord {
        env.storage().persistent().get(&DataKey::Record(address)).unwrap()
    }
}

#[cfg(test)]
mod kyc_test;
