use crate::DataKey;
use soroban_sdk::{contracttype, Address, BytesN, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditLog {
    pub log_id: u64,
    pub asset_id: BytesN<32>,
    pub action: String,
    pub actor: Address,
    pub timestamp: u64,
    pub details: String,
}

pub fn append_audit_log(
    env: &Env,
    asset_id: BytesN<32>,
    action: String,
    actor: Address,
    details: String,
) {
    let store = env.storage().persistent();
    let mut log_id: u64 = store.get(&DataKey::AuditLogCount).unwrap_or(0);
    log_id += 1;
    store.set(&DataKey::AuditLogCount, &log_id);

    let mut logs: Vec<AuditLog> = store
        .get(&DataKey::AuditLogs(asset_id.clone()))
        .unwrap_or_else(|| Vec::new(env));

    logs.push_back(AuditLog {
        log_id,
        asset_id: asset_id.clone(),
        action,
        actor,
        timestamp: env.ledger().timestamp(),
        details,
    });

    store.set(&DataKey::AuditLogs(asset_id), &logs);
}

pub fn get_audit_logs(env: &Env, asset_id: BytesN<32>) -> Vec<AuditLog> {
    env.storage()
        .persistent()
        .get(&DataKey::AuditLogs(asset_id))
        .unwrap_or_else(|| Vec::new(env))
}
