use soroban_sdk::{contracttype, Address, BytesN, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    AuditLog(BytesN<32>), // Key for asset-specific audit log
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditEntry {
    pub timestamp: u64,
    pub action: String,
    pub actor: Address,
    pub details: String,
}

/// Internal function to append an audit log entry for an asset
/// This function is used by various modules to record significant events
pub(crate) fn append_audit_log(
    env: &Env,
    asset_id: &BytesN<32>,
    action: String,
    actor: Address,
    details: String,
) {
    let key = DataKey::AuditLog(asset_id.clone());
    let mut log: Vec<AuditEntry> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    let entry = AuditEntry {
        timestamp: env.ledger().timestamp(),
        action,
        actor,
        details,
    };

    log.push_back(entry);
    env.storage().persistent().set(&key, &log);
}

/// Public function to retrieve the audit log for an asset
/// Returns an empty vector if no history exists
pub fn get_asset_log(env: &Env, asset_id: &BytesN<32>) -> Vec<AuditEntry> {
    let key = DataKey::AuditLog(asset_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env))
}
