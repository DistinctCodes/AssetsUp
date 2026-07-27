#![allow(dead_code)]

use crate::DataKey;
use soroban_sdk::{Address, Env};

pub fn pause(env: &Env, caller: Address) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .expect("Not initialized");
    if caller != admin {
        panic!("Only admin can call this function");
    }
    env.storage().persistent().set(&DataKey::Paused, &true);
    crate::events::contract_paused(env, &caller);
}

pub fn unpause(env: &Env, caller: Address) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .expect("Not initialized");
    if caller != admin {
        panic!("Only admin can call this function");
    }
    env.storage().persistent().set(&DataKey::Paused, &false);
    crate::events::contract_unpaused(env, &caller);
}

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn require_not_paused(env: &Env) {
    if is_paused(env) {
        panic!("Contract is paused");
    }
}
