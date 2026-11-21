//! Typed contract events for `asset-maintenance`.
//!
//! See `contracts/EVENTS.md` for the workspace-wide convention. Struct names
//! are `<Subject><PastTenseVerb>`; the SDK derives topic 0 from the name in
//! `lower_snake_case`. `asset_id` is always a `#[topic]` so consumers can index
//! per asset.

use soroban_sdk::{contractevent, Address, Env, String};

use crate::{AlertSeverity, AlertType, MaintenanceAlert, MaintenanceRecord, ScheduledMaintenance};

/// The contract was initialized with an admin and an asset registry.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub registry: Address,
    pub timestamp: u64,
}

/// An admin transfer was nominated. The role does **not** move until the
/// proposed address accepts.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposed {
    #[topic]
    pub proposed_admin: Address,
    pub current_admin: Address,
    pub timestamp: u64,
}

/// A pending admin nomination was withdrawn by the current admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposalCancelled {
    #[topic]
    pub proposed_admin: Address,
    pub current_admin: Address,
    pub timestamp: u64,
}

/// The admin was changed, after the incoming address accepted.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminChanged {
    #[topic]
    pub new_admin: Address,
    pub old_admin: Address,
    pub timestamp: u64,
}

/// Emergency pause was activated.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractPaused {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

/// Emergency pause was lifted.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractUnpaused {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

/// A maintenance provider was registered.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderRegistered {
    #[topic]
    pub provider: Address,
    pub timestamp: u64,
}

/// A maintenance provider was deactivated and can no longer file records.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderDeactivated {
    #[topic]
    pub provider: Address,
    pub timestamp: u64,
}

/// A maintenance record was appended to an asset's history.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecorded {
    #[topic]
    pub asset_id: u64,
    pub record_id: u64,
    pub provider: Address,
    pub timestamp: u64,
}

/// An asset was marked as burned and can no longer be scheduled for service.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetMarkedBurned {
    #[topic]
    pub asset_id: u64,
    pub admin: Address,
    pub timestamp: u64,
}

/// A mistaken record was voided; the original entry is retained.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecordVoided {
    #[topic]
    pub asset_id: u64,
    pub index: u32,
    pub record_id: u64,
    pub admin: Address,
    pub reason: String,
    pub timestamp: u64,
}

/// A mistaken record was amended by appending a corrected record.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecordAmended {
    #[topic]
    pub asset_id: u64,
    pub index: u32,
    pub record_id: u64,
    pub correction_index: u32,
    pub admin: Address,
    pub reason: String,
    pub timestamp: u64,
}

/// Maintenance was scheduled for an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceScheduled {
    #[topic]
    pub asset_id: u64,
    pub next_service_due: u64,
    pub timestamp: u64,
}

/// An existing maintenance schedule was changed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceScheduleUpdated {
    #[topic]
    pub asset_id: u64,
    pub next_service_due: u64,
    pub timestamp: u64,
}

/// A scheduled maintenance was cancelled and its schedule removed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceScheduleCancelled {
    #[topic]
    pub asset_id: u64,
    pub timestamp: u64,
}

/// A scheduled maintenance was completed and recorded.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceCompleted {
    #[topic]
    pub asset_id: u64,
    pub record_id: u64,
    pub provider: Address,
    pub technician_id: String,
    pub timestamp: u64,
}

/// Warranty information was attached to an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WarrantyAdded {
    #[topic]
    pub asset_id: u64,
    pub end_date: u64,
    pub timestamp: u64,
}

/// Warranty information for an asset was changed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WarrantyUpdated {
    #[topic]
    pub asset_id: u64,
    pub end_date: u64,
    pub timestamp: u64,
}

/// A claim was filed against an asset's warranty.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WarrantyClaimFiled {
    #[topic]
    pub asset_id: u64,
    pub claim_amount: i128,
    pub timestamp: u64,
}

/// A maintenance alert was raised against an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlertCreated {
    #[topic]
    pub asset_id: u64,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub timestamp: u64,
}

/// A maintenance alert was acknowledged.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlertAcknowledged {
    #[topic]
    pub asset_id: u64,
    pub alert_index: u32,
    pub acknowledged_by: Address,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Emission helpers
// ---------------------------------------------------------------------------

pub fn contract_initialized(env: &Env, admin: &Address, registry: &Address) {
    ContractInitialized {
        admin: admin.clone(),
        registry: registry.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_proposed(env: &Env, current_admin: &Address, proposed_admin: &Address) {
    AdminProposed {
        proposed_admin: proposed_admin.clone(),
        current_admin: current_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_proposal_cancelled(env: &Env, current_admin: &Address, proposed_admin: &Address) {
    AdminProposalCancelled {
        proposed_admin: proposed_admin.clone(),
        current_admin: current_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_changed(env: &Env, old_admin: &Address, new_admin: &Address) {
    AdminChanged {
        new_admin: new_admin.clone(),
        old_admin: old_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_paused(env: &Env, admin: &Address) {
    ContractPaused {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_unpaused(env: &Env, admin: &Address) {
    ContractUnpaused {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_marked_burned(env: &Env, asset_id: u64, admin: &Address) {
    AssetMarkedBurned {
        asset_id,
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_record_voided(
    env: &Env,
    asset_id: u64,
    index: u32,
    record_id: u64,
    admin: &Address,
    reason: &String,
) {
    MaintenanceRecordVoided {
        asset_id,
        index,
        record_id,
        admin: admin.clone(),
        reason: reason.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_record_amended(
    env: &Env,
    asset_id: u64,
    index: u32,
    record_id: u64,
    correction_index: u32,
    admin: &Address,
    reason: &String,
) {
    MaintenanceRecordAmended {
        asset_id,
        index,
        record_id,
        correction_index,
        admin: admin.clone(),
        reason: reason.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn provider_registered(env: &Env, provider: &Address) {
    ProviderRegistered {
        provider: provider.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn provider_deactivated(env: &Env, provider: &Address) {
    ProviderDeactivated {
        provider: provider.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_recorded(env: &Env, record: &MaintenanceRecord) {
    MaintenanceRecorded {
        asset_id: record.asset_id,
        record_id: record.record_id,
        provider: record.provider.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_scheduled(env: &Env, schedule: &ScheduledMaintenance) {
    MaintenanceScheduled {
        asset_id: schedule.asset_id,
        next_service_due: schedule.next_service_due,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_schedule_updated(env: &Env, schedule: &ScheduledMaintenance) {
    MaintenanceScheduleUpdated {
        asset_id: schedule.asset_id,
        next_service_due: schedule.next_service_due,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_schedule_cancelled(env: &Env, asset_id: u64) {
    MaintenanceScheduleCancelled {
        asset_id,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn maintenance_completed(env: &Env, asset_id: u64, record: &MaintenanceRecord) {
    MaintenanceCompleted {
        asset_id,
        record_id: record.record_id,
        provider: record.provider.clone(),
        technician_id: record.technician_id.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn warranty_added(env: &Env, asset_id: u64, end_date: u64) {
    WarrantyAdded {
        asset_id,
        end_date,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn warranty_updated(env: &Env, asset_id: u64, end_date: u64) {
    WarrantyUpdated {
        asset_id,
        end_date,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn warranty_claim_filed(env: &Env, asset_id: u64, claim_amount: i128) {
    WarrantyClaimFiled {
        asset_id,
        claim_amount,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn alert_created(env: &Env, alert: &MaintenanceAlert) {
    AlertCreated {
        asset_id: alert.asset_id,
        alert_type: alert.alert_type.clone(),
        severity: alert.severity.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn alert_acknowledged(env: &Env, asset_id: u64, alert_index: u32, by: &Address) {
    AlertAcknowledged {
        asset_id,
        alert_index,
        acknowledged_by: by.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}
