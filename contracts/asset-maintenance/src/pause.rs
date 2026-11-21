use soroban_sdk::{Address, Env};

use crate::events;
use crate::DataKey;
use crate::Error;

fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| crate::handle_error(env, Error::NotInitialized));
    if caller != &admin {
        crate::handle_error(env, Error::Unauthorized);
    }
}

pub fn pause(env: &Env, caller: &Address) {
    require_admin(env, caller);
    env.storage().persistent().set(&DataKey::Paused, &true);
    crate::ttl::extend_persistent(env, &DataKey::Paused);
    events::contract_paused(env, caller);
}

pub fn unpause(env: &Env, caller: &Address) {
    require_admin(env, caller);
    env.storage().persistent().set(&DataKey::Paused, &false);
    crate::ttl::extend_persistent(env, &DataKey::Paused);
    events::contract_unpaused(env, caller);
}

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn require_not_paused(env: &Env) {
    if is_paused(env) {
        crate::handle_error(env, Error::ContractPaused);
    }
}
