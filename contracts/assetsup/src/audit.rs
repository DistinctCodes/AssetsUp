//! On-chain audit log and its reconciliation contract with the off-chain
//! `audit-logs` service.
//!
//! ## What is written on-chain
//!
//! Every significant registry action appends an [`AuditEntry`] to the asset's
//! log. The entry is intentionally minimal and self-describing:
//!
//! | Field | Meaning | Reconciliation key |
//! |---|---|---|
//! | `timestamp` | Ledger close time of the action | Part of the composite key |
//! | `action` | Stable machine token, e.g. `ASSET_REGISTERED` | Part of the composite key |
//! | `actor` | Address that triggered the action | Part of the composite key |
//! | `details` | Human-readable context | Not used for matching |
//!
//! ## Reconciliation model
//!
//! The on-chain log is the **source of truth**. The backend `audit-logs`
//! service keeps a richer record and must reconcile against the chain as
//! follows:
//!
//! 1. Index [`crate::events`] for the same action; each event carries the
//!    transaction hash and ledger sequence that the on-chain entry also falls
//!    under. Store that transaction hash on the off-chain record.
//! 2. Treat `(asset_id, action, actor, timestamp)` as the composite identity of
//!    an entry. Appending is idempotent under this key, so replaying a ledger
//!    range never produces duplicates.
//! 3. On divergence, the on-chain entry wins: an off-chain record with no
//!    matching entry is an orphan and must be flagged, and an on-chain entry
//!    with no off-chain record must be backfilled from the chain.
//! 4. `details` is display-only. Never match or reconcile on it, because its
//!    wording may change between contract versions.
//!
//! Actions are append-only and are never mutated or deleted on-chain, so the
//! log may be replayed from genesis at any time to rebuild the off-chain
//! index.

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
