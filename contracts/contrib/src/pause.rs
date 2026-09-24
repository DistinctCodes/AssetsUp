//! Granular pause control (issue #1531).
//!
//! Global pause remains available for emergencies. Individual subsystems
//! (Escrow, Staking, Kyc) can be paused independently so a problem in one
//! flow does not freeze the others.

#![allow(dead_code)]

use crate::DataKey;
use soroban_sdk::{contracttype, Address, Env};

/// Subsystems that can be paused independently of the global flag.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Subsystem {
    Escrow = 1,
    Staking = 2,
    Kyc = 3,
}

fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let admin: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .expect("Not initialized");
    if caller != &admin {
        panic!("Only admin can call this function");
    }
}

/// Emergency: pause the entire contract (all subsystems blocked via require_not_paused).
pub fn pause(env: &Env, caller: Address) {
    require_admin(env, &caller);
    env.storage().persistent().set(&DataKey::Paused, &true);
    crate::events::contract_paused(env, &caller);
}

pub fn unpause(env: &Env, caller: Address) {
    require_admin(env, &caller);
    env.storage().persistent().set(&DataKey::Paused, &false);
    crate::events::contract_unpaused(env, &caller);
}

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

/// Pause a single subsystem (issue #1531).
pub fn pause_subsystem(env: &Env, caller: Address, subsystem: Subsystem) {
    require_admin(env, &caller);
    env.storage()
        .persistent()
        .set(&DataKey::SubsystemPaused(subsystem.clone()), &true);
    crate::events::subsystem_paused(env, &caller, &subsystem);
}

pub fn unpause_subsystem(env: &Env, caller: Address, subsystem: Subsystem) {
    require_admin(env, &caller);
    env.storage()
        .persistent()
        .set(&DataKey::SubsystemPaused(subsystem.clone()), &false);
    crate::events::subsystem_unpaused(env, &caller, &subsystem);
}

pub fn is_subsystem_paused(env: &Env, subsystem: Subsystem) -> bool {
    if is_paused(env) {
        return true;
    }
    env.storage()
        .persistent()
        .get(&DataKey::SubsystemPaused(subsystem))
        .unwrap_or(false)
}

/// Global guard used by registry / insurance / lease entrypoints.
pub fn require_not_paused(env: &Env) {
    if is_paused(env) {
        panic!("Contract is paused");
    }
}

/// Subsystem-scoped guard (issue #1531).
pub fn require_subsystem_not_paused(env: &Env, subsystem: Subsystem) {
    if is_subsystem_paused(env, subsystem) {
        panic!("Subsystem is paused");
    }
}
