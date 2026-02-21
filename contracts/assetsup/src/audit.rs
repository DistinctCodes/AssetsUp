use soroban_sdk::{contracttype, Address, BytesN, Env, String, Vec};

use crate::types::ActionType;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    AuditLog(BytesN<32>), // Key for asset-specific audit log
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEntry {
    pub actor: Address,
    pub action: ActionType,
    pub timestamp: u64,
    pub note: String,
}

#[allow(dead_code)]
pub fn log_action(
    env: &Env,
    asset_id: &BytesN<32>,
    actor: Address,
    action: ActionType,
    note: String,
) {
    let key = DataKey::AuditLog(asset_id.clone());
    let mut log: Vec<AuditEntry> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    let entry = AuditEntry {
        actor,
        action,
        timestamp: env.ledger().timestamp(),
        note,
    };

    log.push_back(entry);
    env.storage().persistent().set(&key, &log);
}

pub fn get_asset_log(env: &Env, asset_id: &BytesN<32>) -> Vec<AuditEntry> {
    let key = DataKey::AuditLog(asset_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env))
}
