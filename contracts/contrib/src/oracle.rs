//! A minimal price/valuation oracle, gated on an admin-managed allowlist.
//!
//! The admin authorizes reporter addresses with `add_oracle`; any authorized
//! address can then push a `ValuationEntry` for an asset. Only the last 10
//! entries per asset are retained.

use crate::DataKey as GlobalDataKey;
use soroban_sdk::{contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValuationEntry {
    pub asset_id: u64,
    pub value: i128,
    pub currency: String,
    pub source: Address,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Oracle(Address),
    History(u64),
}

const MAX_HISTORY: u32 = 10;

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

pub fn add_oracle(env: Env, caller: Address, oracle: Address) {
    require_admin(&env, &caller);

    env.storage()
        .persistent()
        .set(&DataKey::Oracle(oracle.clone()), &true);

    crate::events::oracle_added(&env, &oracle, &caller);
}

pub fn remove_oracle(env: Env, caller: Address, oracle: Address) {
    require_admin(&env, &caller);

    env.storage()
        .persistent()
        .remove(&DataKey::Oracle(oracle.clone()));

    crate::events::oracle_removed(&env, &oracle, &caller);
}

pub fn update_valuation(env: Env, source: Address, asset_id: u64, value: i128, currency: String) {
    source.require_auth();

    if !env
        .storage()
        .persistent()
        .get(&DataKey::Oracle(source.clone()))
        .unwrap_or(false)
    {
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
    let mut history: Vec<ValuationEntry> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(&env));

    history.push_back(entry);
    if history.len() > MAX_HISTORY {
        history.pop_front();
    }

    env.storage().persistent().set(&key, &history);

    crate::events::valuation_updated(&env, asset_id, value, &currency, &source);
}

pub fn get_latest_valuation(env: Env, asset_id: u64) -> ValuationEntry {
    let history: Vec<ValuationEntry> = env
        .storage()
        .persistent()
        .get(&DataKey::History(asset_id))
        .unwrap_or_else(|| Vec::new(&env));
    if history.is_empty() {
        panic!("No valuation exists");
    }
    history.last().unwrap()
}

pub fn get_valuation_history(env: Env, asset_id: u64) -> Vec<ValuationEntry> {
    env.storage()
        .persistent()
        .get(&DataKey::History(asset_id))
        .unwrap_or_else(|| Vec::new(&env))
}
