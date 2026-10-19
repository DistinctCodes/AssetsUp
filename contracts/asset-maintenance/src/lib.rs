#![no_std]
//! # asset-maintenance
//!
//! Records asset maintenance history, schedules, warranties, service
//! providers, and alerts on-chain.
//!
//! The maintenance history is intended as **audit evidence**: records are
//! appended, never rewritten. Assets are referenced by `u64` id.
//!
//! ## Invariants
//!
//! - Maintenance history is append-only — no entrypoint removes an existing
//!   [`MaintenanceRecord`] from the stored [`Vec`]. A record that was filed by
//!   mistake is *voided* (its `voided` flag is set and it is excluded from the
//!   [`AssetStats`] rollup) or *amended* (a [`MaintenanceAmendment`] sidecar
//!   carries the corrected values) but the original entry is never erased, so
//!   the audit trail remains reconstructable.
//! - [`AssetStats`] is a derived rollup (total cost, downtime, service count,
//!   health score) recomputed from the live (non-voided, amendment-adjusted)
//!   history.
//! - Health scores are expressed on a 1–100 scale.
//! - The admin can pause the contract, which blocks new maintenance logging.
//! - The admin can mark an asset detokenized (burned); such an asset accepts
//!   neither new records nor new schedules until it is reactivated.
//!
//! ## Error handling
//!
//! Failures trap with a typed [`Error`] (`contracterror`) so callers can match
//! on specific codes (shared 1–99 and asset-maintenance 500–599).
//!
//! See [`README.md`](https://github.com/DistinctCodes/AssetsUp/blob/main/contracts/asset-maintenance/README.md)
//! for the full entrypoint, storage, and event tables.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

pub mod error;
pub mod events;
mod proptests;
mod test;
mod tests_coverage;
pub mod ttl;

pub use crate::error::{handle_error, Error};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MaintenanceType {
    Preventive,
    Corrective,
    Emergency,
    Inspection,
    Upgrade,
    Calibration,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AlertType {
    ServiceDue,
    WarrantyExpiring,
    IssueDetected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WarrantyStatus {
    Active,
    Expired,
    Voided,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PriorityLevel {
    Low,
    Medium,
    High,
    Urgent,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecord {
    pub record_id: u64,
    pub asset_id: u64,
    pub maintenance_type: MaintenanceType,
    pub provider: Address,
    pub technician_id: String,
    pub service_date: u64,
    pub duration_hours: u32,
    pub description: String,
    pub parts_replaced: Vec<String>,
    pub labor_cost: i128,
    pub parts_cost: i128,
    pub total_cost: i128,
    pub location: String,
    pub condition_before: u32, // 1-10
    pub condition_after: u32,  // 1-10
    pub issues_found: String,
    pub issues_resolved: String,
    pub next_recommendation: String,
    pub documents_ipfs: Vec<String>,
    pub quality_rating: u32, // 1-10
    pub timestamp: u64,
    /// Set once the record has been voided as a mistaken entry. Voided records
    /// stay in the history but no longer count towards [`AssetStats`].
    pub voided: bool,
    /// Set once an amendment sidecar has been filed for this record.
    pub amended: bool,
}

/// Audit sidecar describing a correction to an append-only [`MaintenanceRecord`].
///
/// The original record is never rewritten: [`AssetMaintenanceContract::amend_maintenance_record`]
/// stores one of these keyed by `(asset_id, record_id)` and flags the record as
/// `amended`, so both the originally filed values and the correction are
/// recoverable. The corrected cost and duration feed the [`AssetStats`] rollup.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceAmendment {
    pub asset_id: u64,
    pub record_id: u64,
    pub amended_by: Address,
    pub reason: String,
    pub corrected_total_cost: i128,
    pub corrected_duration_hours: u32,
    pub corrected_description: String,
    pub timestamp: u64,
}

/// Audit sidecar describing why and by whom a [`MaintenanceRecord`] was voided.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceVoidRecord {
    pub asset_id: u64,
    pub record_id: u64,
    pub voided_by: Address,
    pub reason: String,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ScheduledMaintenance {
    pub asset_id: u64,
    pub maintenance_type: MaintenanceType,
    pub frequency_days: u32,
    pub last_service_date: u64,
    pub next_service_due: u64,
    pub provider_assigned: Address,
    pub reminder_days: u32,
    pub auto_schedule: bool,
    pub priority: PriorityLevel,
    pub estimated_cost: i128,
    pub estimated_duration: u32,
    pub required_parts: Vec<String>,
    pub special_instructions: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderProfile {
    pub address: Address,
    pub name: String,
    pub specialization: Vec<String>,
    pub certification_details: String,
    pub total_services: u32,
    pub average_rating: u32, // scaled by 100 or something if fractional, but requirement says 1-10
    pub registration_timestamp: u64,
    pub is_active: bool,
    pub contact_hash: String,
    pub service_area: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WarrantyInfo {
    pub asset_id: u64,
    pub provider: String,
    pub warranty_type: String, // Manufacturer, Extended, Third-party
    pub start_date: u64,
    pub end_date: u64,
    pub coverage_details: String,
    pub terms_hash: String,
    pub claim_count: u32,
    pub max_claims: u32,
    pub status: WarrantyStatus,
    pub is_transferable: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceAlert {
    pub asset_id: u64,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub message: String,
    pub due_date: u64,
    pub acknowledged: bool,
    pub acknowledged_by: Address,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    AssetRegistry,
    Provider(Address),
    MaintenanceHistory(u64),   // asset_id -> Vec<MaintenanceRecord>
    MaintenanceSchedule(u64),  // asset_id -> ScheduledMaintenance
    Warranty(u64),             // asset_id -> WarrantyInfo
    Alerts(u64),               // asset_id -> Vec<MaintenanceAlert>
    AssetStats(u64),           // asset_id -> AssetStats (downtime, total cost, etc.)
    Paused,                    // bool: emergency pause on new maintenance logging
    RecordAmendment(u64, u64), // (asset_id, record_id) -> MaintenanceAmendment
    RecordVoid(u64, u64),      // (asset_id, record_id) -> MaintenanceVoidRecord
    DetokenizedAsset(u64),     // asset_id -> bool: burned/detokenized asset
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetStats {
    pub total_cost: i128,
    pub total_downtime_hours: u64,
    pub service_count: u32,
    pub health_score: u32, // 1-100
}

#[contract]
pub struct AssetMaintenanceContract;

#[contractimpl]
impl AssetMaintenanceContract {
    /// Loads the stored admin and requires its authorization.
    ///
    /// Several entrypoints mutate registry-level data without taking a caller
    /// argument, so the stored admin is the only principal this contract can
    /// authenticate against without an ABI change. A finer-grained model —
    /// letting the asset owner manage their own warranty, for instance — needs
    /// the asset-registry integration this contract does not have yet.
    fn admin(env: &Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| handle_error(env, Error::NotInitialized))
    }

    fn require_admin(env: &Env) -> Address {
        let admin = Self::admin(env);
        admin.require_auth();
        admin
    }

    pub fn init(env: Env, admin: Address, registry: Address) {
        // Without this, whoever calls init first becomes admin of a freshly
        // deployed contract, regardless of who deployed it.
        admin.require_auth();

        ttl::extend_instance(&env);

        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AssetRegistry, &registry);

        // Extend on write, not only on read: a freshly written entry gets the
        // network's minimum lifetime, which is short.
        ttl::extend_persistent(&env, &DataKey::Admin);
        ttl::extend_persistent(&env, &DataKey::AssetRegistry);

        events::contract_initialized(&env, &admin, &registry);
    }

    pub fn register_provider(env: Env, provider: ProviderProfile) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| handle_error(&env, Error::NotInitialized));
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::Provider(provider.address.clone()), &provider);

        events::provider_registered(&env, &provider.address);
    }

    pub fn deactivate_provider(env: Env, provider_address: Address) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| handle_error(&env, Error::NotInitialized));
        admin.require_auth();

        if let Some(mut provider) = env
            .storage()
            .persistent()
            .get::<_, ProviderProfile>(&DataKey::Provider(provider_address.clone()))
        {
            provider.is_active = false;
            env.storage()
                .persistent()
                .set(&DataKey::Provider(provider_address.clone()), &provider);

            events::provider_deactivated(&env, &provider_address);
        }
    }

    pub fn add_maintenance_record(env: Env, record: MaintenanceRecord) {
        // Auth check: provider must be the one adding the record
        record.provider.require_auth();
        Self::add_record_inner(&env, &record);
    }

    /// Validates and persists a record whose provider has already been
    /// authenticated.
    ///
    /// Shared by [`Self::add_maintenance_record`] and
    /// [`Self::add_maintenance_records_batch`] so the latter can authenticate
    /// each distinct provider exactly once — the host rejects a second
    /// authorization entry for the same address within a single invocation.
    fn add_record_inner(env: &Env, record: &MaintenanceRecord) {
        // Emergency stop: while paused, no new maintenance may be logged.
        if Self::is_paused(env.clone()) {
            handle_error(env, Error::ContractPaused);
        }

        // A detokenized (burned) asset must not accrue new maintenance.
        if Self::is_asset_detokenized(env.clone(), record.asset_id) {
            handle_error(env, Error::AssetDetokenized);
        }

        // 1. Verify provider is registered and active
        let provider_data: ProviderProfile = env
            .storage()
            .persistent()
            .get(&DataKey::Provider(record.provider.clone()))
            .unwrap_or_else(|| handle_error(env, Error::ProviderNotRegistered));
        if !provider_data.is_active {
            panic!("provider is inactive");
        }

        // 2. Validation Rules
        if record.service_date > env.ledger().timestamp() {
            panic!("service date cannot be in future");
        }
        if record.labor_cost < 0 || record.parts_cost < 0 || record.total_cost < 0 {
            panic!("cost values must be non-negative");
        }
        let max_cost: i128 = 999_999_999_999; // Upper bound on individual cost
        if record.labor_cost > max_cost
            || record.parts_cost > max_cost
            || record.total_cost > max_cost
        {
            panic!("cost value exceeds maximum allowed");
        }
        if record.labor_cost + record.parts_cost != record.total_cost {
            panic!("labor + parts cost must equal total cost");
        }
        if record.condition_before < 1
            || record.condition_before > 10
            || record.condition_after < 1
            || record.condition_after > 10
        {
            panic!("condition ratings must be 1-10");
        }
        if record.quality_rating < 1 || record.quality_rating > 10 {
            panic!("quality rating must be 1-10");
        }

        // 3. Verify asset exists
        if !Self::verify_asset_exists(env, record.asset_id) {
            panic!("asset does not exist");
        }

        // 4. Update Maintenance History
        let mut history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(record.asset_id))
            .unwrap_or(Vec::new(env));
        history.push_back(record.clone());
        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceHistory(record.asset_id), &history);
        ttl::extend_persistent(env, &DataKey::MaintenanceHistory(record.asset_id));

        // 5. Recompute Asset Stats from the live (non-voided) history.
        Self::recompute_asset_stats(env, record.asset_id);

        // 6. Emit Event
        events::maintenance_recorded(env, record);
    }

    /// Adds several maintenance records in a single invocation.
    ///
    /// Each record is validated and stored exactly as if it had been submitted
    /// through [`Self::add_maintenance_record`]; the call is atomic, so if any
    /// record is invalid the whole invocation reverts and none are persisted.
    /// An empty batch is rejected rather than accepted as a silent no-op.
    pub fn add_maintenance_records_batch(env: Env, records: Vec<MaintenanceRecord>) {
        if records.is_empty() {
            handle_error(&env, Error::InvalidArguments);
        }

        // Authenticate each distinct provider once. The host rejects a second
        // authorization entry for the same address within a single invocation,
        // so the per-record `require_auth` used by the single-record entrypoint
        // cannot simply be repeated here.
        let mut authenticated: Vec<Address> = Vec::new(&env);
        for record in records.iter() {
            let mut seen = false;
            for address in authenticated.iter() {
                if address == record.provider {
                    seen = true;
                    break;
                }
            }
            if !seen {
                record.provider.require_auth();
                authenticated.push_back(record.provider.clone());
            }
        }

        for record in records.iter() {
            Self::add_record_inner(&env, &record);
        }
    }

    pub fn get_maintenance_history(env: Env, asset_id: u64) -> Vec<MaintenanceRecord> {
        // Extend on read too. An asset that is only ever queried and never
        // serviced again would otherwise be archived despite still being
        // referenced as audit evidence.
        ttl::extend_persistent(&env, &DataKey::MaintenanceHistory(asset_id));
        env.storage()
            .persistent()
            .get(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    /// Schedules recurring maintenance for an asset.
    ///
    /// Rejected if the asset has been marked detokenized/burned: a burned asset
    /// has no ongoing service obligation, and silently queueing work against it
    /// wastes provider time and corrupts downstream scheduling.
    pub fn schedule_maintenance(env: Env, owner: Address, schedule: ScheduledMaintenance) {
        owner.require_auth();

        if Self::is_asset_detokenized(env.clone(), schedule.asset_id) {
            handle_error(&env, Error::AssetDetokenized);
        }

        Self::store_schedule(&env, &schedule);
        events::maintenance_scheduled(&env, &schedule);
    }

    pub fn update_maintenance_schedule(env: Env, owner: Address, schedule: ScheduledMaintenance) {
        owner.require_auth();

        // Update existing schedule
        if !env
            .storage()
            .persistent()
            .has(&DataKey::MaintenanceSchedule(schedule.asset_id))
        {
            panic!("no schedule exists for asset");
        }

        Self::store_schedule(&env, &schedule);
        events::maintenance_schedule_updated(&env, &schedule);
    }

    /// Validates and persists a schedule without emitting an event, so that
    /// the create and update entrypoints each emit their own.
    fn store_schedule(env: &Env, schedule: &ScheduledMaintenance) {
        // Asset owner check (placeholder - assuming caller is owner or admin)
        // In a real system, we'd check if owner is truly the owner via Registry
        if schedule.frequency_days == 0 {
            panic!("frequency must be positive");
        }

        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceSchedule(schedule.asset_id), schedule);
        ttl::extend_persistent(env, &DataKey::MaintenanceSchedule(schedule.asset_id));
    }

    /// Cancels a scheduled maintenance and removes the stored schedule.
    ///
    /// Authorized by the passed `owner` (mirroring [`Self::schedule_maintenance`]),
    /// which must authenticate. Fails if no schedule exists for the asset, so a
    /// cancellation of a schedule that was never created cannot masquerade as a
    /// successful removal. Unlike completing a service, cancelling leaves no
    /// record in the append-only history — it is a schedule mutation, not audit
    /// evidence — and it is surfaced off-chain through the
    /// [`events::MaintenanceScheduleCancelled`] event.
    pub fn cancel_scheduled_maintenance(env: Env, owner: Address, asset_id: u64) {
        owner.require_auth();

        if !env
            .storage()
            .persistent()
            .has(&DataKey::MaintenanceSchedule(asset_id))
        {
            handle_error(&env, Error::ScheduleNotFound);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::MaintenanceSchedule(asset_id));

        events::maintenance_schedule_cancelled(&env, asset_id);
    }

    pub fn get_upcoming_maintenance(env: Env, asset_id: u64) -> Option<ScheduledMaintenance> {
        ttl::extend_persistent(&env, &DataKey::MaintenanceSchedule(asset_id));
        env.storage()
            .persistent()
            .get(&DataKey::MaintenanceSchedule(asset_id))
    }

    pub fn complete_scheduled_maintenance(env: Env, asset_id: u64, record: MaintenanceRecord) {
        // 1. Add record
        Self::add_maintenance_record(env.clone(), record.clone());

        // 2. Update schedule if auto-schedule is on
        if let Some(mut schedule) = env
            .storage()
            .persistent()
            .get::<_, ScheduledMaintenance>(&DataKey::MaintenanceSchedule(asset_id))
        {
            if schedule.auto_schedule {
                schedule.last_service_date = record.service_date;
                schedule.next_service_due =
                    record.service_date + (schedule.frequency_days as u64 * 86400);
                env.storage()
                    .persistent()
                    .set(&DataKey::MaintenanceSchedule(asset_id), &schedule);
            }
        }

        events::maintenance_completed(&env, asset_id, &record);
    }

    pub fn add_warranty_information(env: Env, warranty: WarrantyInfo) {
        Self::require_admin(&env);

        Self::store_warranty(&env, &warranty);
        events::warranty_added(&env, warranty.asset_id, warranty.end_date);
    }

    pub fn update_warranty_information(env: Env, warranty: WarrantyInfo) {
        Self::require_admin(&env);

        if !env
            .storage()
            .persistent()
            .has(&DataKey::Warranty(warranty.asset_id))
        {
            panic!("no warranty exists for asset");
        }

        Self::store_warranty(&env, &warranty);
        events::warranty_updated(&env, warranty.asset_id, warranty.end_date);
    }

    /// Validates and persists warranty terms without emitting an event, so
    /// that the add and update entrypoints each emit their own.
    fn store_warranty(env: &Env, warranty: &WarrantyInfo) {
        if warranty.end_date <= warranty.start_date {
            panic!("warranty dates invalid");
        }
        env.storage()
            .persistent()
            .set(&DataKey::Warranty(warranty.asset_id), warranty);
    }

    pub fn get_provider_details(env: Env, provider_address: Address) -> Option<ProviderProfile> {
        env.storage()
            .persistent()
            .get(&DataKey::Provider(provider_address))
    }

    pub fn get_warranty(env: Env, asset_id: u64) -> Option<WarrantyInfo> {
        env.storage().persistent().get(&DataKey::Warranty(asset_id))
    }

    pub fn file_warranty_claim(env: Env, asset_id: u64, claim_amount: i128) {
        Self::require_admin(&env);

        if claim_amount <= 0 {
            panic!("claim amount must be positive");
        }

        let mut warranty: WarrantyInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Warranty(asset_id))
            .unwrap_or_else(|| handle_error(&env, Error::WarrantyNotFound));

        if warranty.status != WarrantyStatus::Active {
            panic!("warranty is not active");
        }
        if env.ledger().timestamp() > warranty.end_date {
            panic!("warranty has expired");
        }
        if warranty.claim_count >= warranty.max_claims {
            panic!("max claims reached");
        }

        warranty.claim_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Warranty(asset_id), &warranty);

        events::warranty_claim_filed(&env, asset_id, claim_amount);
    }

    pub fn create_maintenance_alert(env: Env, alert: MaintenanceAlert) {
        Self::require_admin(&env);

        let mut alerts = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceAlert>>(&DataKey::Alerts(alert.asset_id))
            .unwrap_or(Vec::new(&env));
        alerts.push_back(alert.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Alerts(alert.asset_id), &alerts);

        events::alert_created(&env, &alert);
    }

    pub fn acknowledge_maintenance_alert(env: Env, asset_id: u64, alert_index: u32, by: Address) {
        by.require_auth();
        let mut alerts: Vec<MaintenanceAlert> = env
            .storage()
            .persistent()
            .get(&DataKey::Alerts(asset_id))
            .unwrap_or_else(|| handle_error(&env, Error::NotFound));

        if alert_index >= alerts.len() {
            panic!("alert index out of bounds");
        }

        let mut alert = alerts
            .get(alert_index)
            .unwrap_or_else(|| handle_error(&env, Error::AlertIndexOutOfBounds));
        alert.acknowledged = true;
        alert.acknowledged_by = by.clone();
        alerts.set(alert_index, alert);
        env.storage()
            .persistent()
            .set(&DataKey::Alerts(asset_id), &alerts);

        events::alert_acknowledged(&env, asset_id, alert_index, &by);
    }

    pub fn get_alerts(env: Env, asset_id: u64) -> Vec<MaintenanceAlert> {
        env.storage()
            .persistent()
            .get(&DataKey::Alerts(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn calculate_total_maintenance_cost(env: Env, asset_id: u64) -> i128 {
        let stats = Self::get_asset_stats(env, asset_id);
        stats.total_cost
    }

    pub fn calculate_asset_downtime(env: Env, asset_id: u64) -> u64 {
        let stats = Self::get_asset_stats(env, asset_id);
        stats.total_downtime_hours
    }

    pub fn get_asset_health_score(env: Env, asset_id: u64) -> u32 {
        let stats = Self::get_asset_stats(env, asset_id);
        stats.health_score
    }

    pub fn get_asset_stats(env: Env, asset_id: u64) -> AssetStats {
        env.storage()
            .persistent()
            .get(&DataKey::AssetStats(asset_id))
            .unwrap_or(AssetStats {
                total_cost: 0,
                total_downtime_hours: 0,
                service_count: 0,
                health_score: 100,
            })
    }

    pub fn is_maintenance_cost_excessive(env: Env, asset_id: u64, threshold: i128) -> bool {
        let stats = Self::get_asset_stats(env, asset_id);
        stats.total_cost > threshold
    }

    pub fn get_overdue_maintenance(env: Env, asset_id: u64) -> bool {
        if let Some(schedule) = env
            .storage()
            .persistent()
            .get::<_, ScheduledMaintenance>(&DataKey::MaintenanceSchedule(asset_id))
        {
            return env.ledger().timestamp() > schedule.next_service_due;
        }
        false
    }

    // -----------------------------------------------------------------------
    // Emergency pause (#1478)
    // -----------------------------------------------------------------------

    /// Pauses the contract. New maintenance records then reject with
    /// [`Error::ContractPaused`] until [`Self::unpause`] is called.
    pub fn pause(env: Env) {
        let admin = Self::require_admin(&env);

        env.storage().persistent().set(&DataKey::Paused, &true);
        ttl::extend_persistent(&env, &DataKey::Paused);

        events::contract_paused(&env, &admin);
    }

    /// Resumes normal operation after a [`Self::pause`].
    pub fn unpause(env: Env) {
        let admin = Self::require_admin(&env);

        env.storage().persistent().set(&DataKey::Paused, &false);
        ttl::extend_persistent(&env, &DataKey::Paused);

        events::contract_unpaused(&env, &admin);
    }

    /// Returns whether the contract is currently paused. Absent storage means
    /// not paused, so an un-initialized-looking contract stays usable.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Detokenized (burned) assets (#1477)
    // -----------------------------------------------------------------------

    /// Marks an asset as detokenized/burned. Such an asset accepts neither new
    /// maintenance records nor new schedules until [`Self::reactivate_asset`].
    pub fn mark_asset_detokenized(env: Env, asset_id: u64) {
        let admin = Self::require_admin(&env);

        env.storage()
            .persistent()
            .set(&DataKey::DetokenizedAsset(asset_id), &true);
        ttl::extend_persistent(&env, &DataKey::DetokenizedAsset(asset_id));

        events::asset_detokenized(&env, asset_id, &admin);
    }

    /// Clears the detokenized flag, allowing maintenance again.
    pub fn reactivate_asset(env: Env, asset_id: u64) {
        let admin = Self::require_admin(&env);

        env.storage()
            .persistent()
            .set(&DataKey::DetokenizedAsset(asset_id), &false);
        ttl::extend_persistent(&env, &DataKey::DetokenizedAsset(asset_id));

        events::asset_reactivated(&env, asset_id, &admin);
    }

    /// Returns whether an asset has been marked detokenized/burned.
    pub fn is_asset_detokenized(env: Env, asset_id: u64) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::DetokenizedAsset(asset_id))
            .unwrap_or(false)
    }

    // -----------------------------------------------------------------------
    // Voiding and amending records (#1479)
    // -----------------------------------------------------------------------

    /// Voids a maintenance record that was filed by mistake.
    ///
    /// The record is *not* removed from the audit history; its `voided` flag is
    /// set, a [`MaintenanceVoidRecord`] captures the reason and caller, and the
    /// asset's derived stats are recomputed without it.
    pub fn void_maintenance_record(env: Env, asset_id: u64, record_id: u64, reason: String) {
        let admin = Self::require_admin(&env);

        let mut history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or_else(|| handle_error(&env, Error::RecordNotFound));

        let index = Self::find_record_index(&history, record_id)
            .unwrap_or_else(|| handle_error(&env, Error::RecordNotFound));

        let mut record = history.get(index).unwrap();
        if record.voided {
            handle_error(&env, Error::RecordAlreadyVoided);
        }
        record.voided = true;
        history.set(index, record);

        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceHistory(asset_id), &history);
        ttl::extend_persistent(&env, &DataKey::MaintenanceHistory(asset_id));

        let void_record = MaintenanceVoidRecord {
            asset_id,
            record_id,
            voided_by: admin.clone(),
            reason,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::RecordVoid(asset_id, record_id), &void_record);
        ttl::extend_persistent(&env, &DataKey::RecordVoid(asset_id, record_id));

        Self::recompute_asset_stats(&env, asset_id);

        events::maintenance_record_voided(&env, asset_id, record_id, &admin);
    }

    /// Amends a maintenance record's cost, duration, and description.
    ///
    /// The original values remain in the history; the correction is stored as a
    /// [`MaintenanceAmendment`] and the derived stats are recomputed from the
    /// corrected cost and duration. A voided record cannot be amended.
    pub fn amend_maintenance_record(
        env: Env,
        asset_id: u64,
        record_id: u64,
        reason: String,
        corrected_total_cost: i128,
        corrected_duration_hours: u32,
        corrected_description: String,
    ) {
        let admin = Self::require_admin(&env);

        if corrected_total_cost < 0 {
            handle_error(&env, Error::InvalidArguments);
        }

        let mut history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or_else(|| handle_error(&env, Error::RecordNotFound));

        let index = Self::find_record_index(&history, record_id)
            .unwrap_or_else(|| handle_error(&env, Error::RecordNotFound));

        if history.get(index).unwrap().voided {
            handle_error(&env, Error::RecordVoided);
        }
        let mut record = history.get(index).unwrap();
        record.amended = true;
        history.set(index, record);
        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceHistory(asset_id), &history);
        ttl::extend_persistent(&env, &DataKey::MaintenanceHistory(asset_id));

        let amendment = MaintenanceAmendment {
            asset_id,
            record_id,
            amended_by: admin.clone(),
            reason,
            corrected_total_cost,
            corrected_duration_hours,
            corrected_description,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::RecordAmendment(asset_id, record_id), &amendment);
        ttl::extend_persistent(&env, &DataKey::RecordAmendment(asset_id, record_id));

        Self::recompute_asset_stats(&env, asset_id);

        events::maintenance_record_amended(&env, asset_id, record_id, &admin);
    }

    /// Returns the amendment sidecar for a record, if one has been filed.
    pub fn get_maintenance_amendment(
        env: Env,
        asset_id: u64,
        record_id: u64,
    ) -> Option<MaintenanceAmendment> {
        env.storage()
            .persistent()
            .get(&DataKey::RecordAmendment(asset_id, record_id))
    }

    /// Returns the void sidecar for a record, if it has been voided.
    pub fn get_maintenance_void(
        env: Env,
        asset_id: u64,
        record_id: u64,
    ) -> Option<MaintenanceVoidRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::RecordVoid(asset_id, record_id))
    }

    /// Returns whether a specific record has been voided.
    pub fn is_maintenance_record_voided(env: Env, asset_id: u64, record_id: u64) -> bool {
        env.storage()
            .persistent()
            .get::<_, MaintenanceVoidRecord>(&DataKey::RecordVoid(asset_id, record_id))
            .is_some()
    }

    /// Finds the position of `record_id` in `history`, if present.
    fn find_record_index(history: &Vec<MaintenanceRecord>, record_id: u64) -> Option<u32> {
        for (index, record) in (0u32..).zip(history.iter()) {
            if record.record_id == record_id {
                return Some(index);
            }
        }
        None
    }

    /// Recomputes the [`AssetStats`] rollup for an asset from its live history.
    ///
    /// Voided records are excluded; amended records contribute the corrected
    /// cost and duration. The health score reuses the historical weighting
    /// (40% average quality, 30% preventive ratio, improvement bonus, overdue
    /// penalty) but only over the live records.
    fn recompute_asset_stats(env: &Env, asset_id: u64) -> AssetStats {
        let history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or(Vec::new(env));

        let mut total_cost: i128 = 0;
        let mut total_downtime: u64 = 0;
        let mut service_count: u32 = 0;
        let mut total_quality: u32 = 0;
        let mut improvement_score: u32 = 0;
        let mut preventive_count: u32 = 0;

        for record in history.iter() {
            if record.voided {
                continue;
            }

            let (cost, downtime) = match env.storage().persistent().get::<_, MaintenanceAmendment>(
                &DataKey::RecordAmendment(asset_id, record.record_id),
            ) {
                Some(amendment) => (
                    amendment.corrected_total_cost,
                    amendment.corrected_duration_hours as u64,
                ),
                None => (record.total_cost, record.duration_hours as u64),
            };

            total_cost += cost;
            total_downtime += downtime;
            service_count += 1;
            total_quality += record.quality_rating;
            if record.condition_after > record.condition_before {
                improvement_score += 5;
            }
            if let MaintenanceType::Preventive = record.maintenance_type {
                preventive_count += 1;
            }
        }

        let health_score = if service_count == 0 {
            100
        } else {
            let avg_quality = (total_quality * 10).checked_div(service_count).unwrap_or(0);
            let preventive_ratio = (preventive_count * 100)
                .checked_div(service_count)
                .unwrap_or(0);

            // Weighted Score: 40% Quality, 30% Preventive Ratio, 30% Improvement
            let mut score =
                (avg_quality * 4 / 10) + (preventive_ratio * 3 / 10) + improvement_score;

            // Penalty for overdue
            if let Some(schedule) = env
                .storage()
                .persistent()
                .get::<_, ScheduledMaintenance>(&DataKey::MaintenanceSchedule(asset_id))
            {
                if env.ledger().timestamp() > schedule.next_service_due {
                    let days_overdue =
                        (env.ledger().timestamp() - schedule.next_service_due) / 86400;
                    let penalty = (days_overdue as u32 * 2).min(30);
                    score = score.saturating_sub(penalty);
                }
            }

            score.clamp(0, 100)
        };

        let stats = AssetStats {
            total_cost,
            total_downtime_hours: total_downtime,
            service_count,
            health_score,
        };
        env.storage()
            .persistent()
            .set(&DataKey::AssetStats(asset_id), &stats);
        ttl::extend_persistent(env, &DataKey::AssetStats(asset_id));

        stats
    }

    fn verify_asset_exists(_env: &Env, _asset_id: u64) -> bool {
        true
    }
}
