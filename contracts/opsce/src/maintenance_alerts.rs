use soroban_sdk::{Address, Bytes, BytesN, Env, String, Symbol, Vec};

use crate::error::ContractError;
use crate::maintenance_record::get_maintenance_records;
use crate::types::{
    AlertSeverity, AlertType, DataKey, MaintenanceAlert, MaintenanceStatus,
};

const ONE_DAY_SECS: u64 = 86_400;
const THREE_DAYS_SECS: u64 = 3 * ONE_DAY_SECS;
const SEVEN_DAYS_SECS: u64 = 7 * ONE_DAY_SECS;

/// Set the contract admin. May only be called once.
pub fn set_admin(env: &Env, admin: Address) -> Result<(), ContractError> {
    admin.require_auth();
    if env.storage().instance().has(&DataKey::Admin) {
        return Err(ContractError::AdminAlreadySet);
    }
    env.storage().instance().set(&DataKey::Admin, &admin);
    Ok(())
}

/// Evaluate all `Scheduled` records for `asset_id` against the current ledger
/// timestamp and return alerts due within the next 7 days (or already overdue).
///
/// Severity bands (relative to `scheduled_date`):
/// - `Critical`  — already overdue (`scheduled_date < now`)
/// - `High`      — due within 1 day
/// - `Medium`    — due within 3 days
/// - `Low`       — due within 7 days
///
/// Newly generated alerts are persisted, indexed per asset, and an
/// `alert_generated` event is emitted for each new alert. Alerts that already
/// exist (same `record_id` + `severity`) are not duplicated, but are returned
/// in the result if still unresolved.
pub fn check_maintenance_alerts(env: &Env, asset_id: String) -> Vec<MaintenanceAlert> {
    let records = get_maintenance_records(env, asset_id.clone());
    let now = env.ledger().timestamp();
    let mut out: Vec<MaintenanceAlert> = Vec::new(env);

    for record in records.iter() {
        // Only schedule-status records can produce alerts.
        if record.status != MaintenanceStatus::Scheduled {
            continue;
        }

        let severity = match compute_severity(record.scheduled_date, now) {
            Some(s) => s,
            None => continue,
        };
        let alert_type = if record.scheduled_date < now {
            AlertType::Overdue
        } else {
            AlertType::ServiceDue
        };

        let alert_id = derive_alert_id(env, &record.record_id, severity);

        // Deduplicate: if an alert with the same id already exists, keep it.
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<_, MaintenanceAlert>(&DataKey::Alert(alert_id.clone()))
        {
            if !existing.resolved {
                out.push_back(existing);
            }
            continue;
        }

        let alert = MaintenanceAlert {
            alert_id: alert_id.clone(),
            asset_id: asset_id.clone(),
            record_id: record.record_id.clone(),
            alert_type,
            severity,
            due_date: record.scheduled_date,
            created_at: now,
            resolved: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Alert(alert_id.clone()), &alert);

        let mut index: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::AlertIndex(asset_id.clone()))
            .unwrap_or_else(|| Vec::new(env));
        index.push_back(alert_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::AlertIndex(asset_id.clone()), &index);

        // Emit `alert_generated` event.
        let topic = Symbol::new(env, "alert_generated");
        env.events().publish(
            (topic, alert_id),
            (severity, record.record_id.clone(), record.scheduled_date),
        );

        out.push_back(alert);
    }

    out
}

/// Return all unresolved alerts for the given `asset_id`.
pub fn get_active_alerts(env: &Env, asset_id: String) -> Vec<MaintenanceAlert> {
    let index: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(&DataKey::AlertIndex(asset_id))
        .unwrap_or_else(|| Vec::new(env));

    let mut out = Vec::new(env);
    for id in index.iter() {
        if let Some(alert) = env
            .storage()
            .persistent()
            .get::<_, MaintenanceAlert>(&DataKey::Alert(id))
        {
            if !alert.resolved {
                out.push_back(alert);
            }
        }
    }
    out
}

/// Mark an alert as resolved. Admin-only.
pub fn dismiss_alert(
    env: &Env,
    caller: Address,
    alert_id: BytesN<32>,
) -> Result<(), ContractError> {
    caller.require_auth();

    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::AdminNotSet)?;
    if admin != caller {
        return Err(ContractError::NotAdmin);
    }

    let mut alert: MaintenanceAlert = env
        .storage()
        .persistent()
        .get(&DataKey::Alert(alert_id.clone()))
        .ok_or(ContractError::AlertNotFound)?;

    alert.resolved = true;
    env.storage()
        .persistent()
        .set(&DataKey::Alert(alert_id), &alert);

    Ok(())
}

/// Compute alert severity for a scheduled timestamp `due` relative to `now`.
/// Returns `None` if the record is more than 7 days away.
fn compute_severity(due: u64, now: u64) -> Option<AlertSeverity> {
    if due < now {
        return Some(AlertSeverity::Critical);
    }
    let delta = due - now;
    if delta <= ONE_DAY_SECS {
        Some(AlertSeverity::High)
    } else if delta <= THREE_DAYS_SECS {
        Some(AlertSeverity::Medium)
    } else if delta <= SEVEN_DAYS_SECS {
        Some(AlertSeverity::Low)
    } else {
        None
    }
}

fn severity_byte(s: AlertSeverity) -> u8 {
    match s {
        AlertSeverity::Low => 1,
        AlertSeverity::Medium => 2,
        AlertSeverity::High => 3,
        AlertSeverity::Critical => 4,
    }
}

/// `alert_id = sha256(record_id_bytes || [severity_byte])`.
fn derive_alert_id(env: &Env, record_id: &BytesN<32>, severity: AlertSeverity) -> BytesN<32> {
    let arr = record_id.to_array();
    let mut data = Bytes::from_slice(env, &arr);
    data.append(&Bytes::from_slice(env, &[severity_byte(severity)]));
    env.crypto().sha256(&data).to_bytes()
}
