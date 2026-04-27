#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug)]
pub struct ValuationEntry {
    pub asset_id: u64,
    pub value: i128,
    pub currency: String,
    pub source: Address,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Oracle(Address),
    History(u64), // asset_id -> Vec<ValuationEntry>
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn add_oracle(env: Env, oracle: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Oracle(oracle.clone()), &true);
        env.events().publish((Symbol::new(&env, "oracle_added"), oracle), ());
    }

    pub fn remove_oracle(env: Env, oracle: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().persistent().remove(&DataKey::Oracle(oracle.clone()));
        env.events().publish((Symbol::new(&env, "oracle_removed"), oracle), ());
    }

    pub fn update_valuation(env: Env, source: Address, asset_id: u64, value: i128, currency: String) {
        source.require_auth();

        // Check if authorized oracle
        if !env.storage().persistent().has(&DataKey::Oracle(source.clone())) {
            panic!("Unauthorized oracle");
        }

        let entry = ValuationEntry {
            asset_id,
            value,
            currency: currency.clone(),
            source: source.clone(),
            timestamp: env.ledger().timestamp(),
        };

        let key = DataKey::History(asset_id);
        let mut history: Vec<ValuationEntry> = env.storage().persistent().get(&key).unwrap_or(Vec::new(&env));
        
        history.push_back(entry.clone());

        // Keep only last 10 entries
        if history.len() > 10 {
            history.pop_front();
        }

        env.storage().persistent().set(&key, &history);

        env.events().publish(
            (Symbol::new(&env, "valuation_updated"), asset_id),
            (value, currency, source),
        );
    }

    pub fn get_latest_valuation(env: Env, asset_id: u64) -> ValuationEntry {
        let history: Vec<ValuationEntry> = env.storage().persistent().get(&DataKey::History(asset_id)).unwrap();
        if history.is_empty() {
            panic!("No valuation exists");
        }
        history.last().unwrap()
    }

    pub fn get_valuation_history(env: Env, asset_id: u64) -> Vec<ValuationEntry> {
        env.storage().persistent().get(&DataKey::History(asset_id)).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod oracle_test;
