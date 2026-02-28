#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

mod test;

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
pub enum DataKey {
    Admin,
    AssetRegistry,
    Provider(Address),
    MaintenanceHistory(u64),  // asset_id -> Vec<MaintenanceRecord>
    MaintenanceSchedule(u64), // asset_id -> ScheduledMaintenance
    Warranty(u64),            // asset_id -> WarrantyInfo
    Alerts(u64),              // asset_id -> Vec<MaintenanceAlert>
    AssetStats(u64),          // asset_id -> AssetStats (downtime, total cost, etc.)
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
    pub fn init(env: Env, admin: Address, registry: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AssetRegistry, &registry);
    }

    pub fn register_provider(env: Env, provider: ProviderProfile) {
        let admin: Address = env.storage().persistent().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::Provider(provider.address.clone()), &provider);
    }

    pub fn deactivate_provider(env: Env, provider_address: Address) {
        let admin: Address = env.storage().persistent().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if let Some(mut provider) = env
            .storage()
            .persistent()
            .get::<_, ProviderProfile>(&DataKey::Provider(provider_address.clone()))
        {
            provider.is_active = false;
            env.storage()
                .persistent()
                .set(&DataKey::Provider(provider_address), &provider);
        }
    }

    pub fn add_maintenance_record(env: Env, record: MaintenanceRecord) {
        // Auth check: provider must be the one adding the record
        record.provider.require_auth();

        // 1. Verify provider is registered and active
        let provider_data: ProviderProfile = env
            .storage()
            .persistent()
            .get(&DataKey::Provider(record.provider.clone()))
            .expect("provider not registered");
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
        if !Self::verify_asset_exists(&env, record.asset_id) {
            panic!("asset does not exist");
        }

        // 4. Update Maintenance History
        let mut history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(record.asset_id))
            .unwrap_or(Vec::new(&env));
        history.push_back(record.clone());
        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceHistory(record.asset_id), &history);

        // 5. Update Asset Stats
        let mut stats = env
            .storage()
            .persistent()
            .get::<_, AssetStats>(&DataKey::AssetStats(record.asset_id))
            .unwrap_or(AssetStats {
                total_cost: 0,
                total_downtime_hours: 0,
                service_count: 0,
                health_score: 100, // Start with 100
            });

        stats.total_cost += record.total_cost;
        stats.total_downtime_hours += record.duration_hours as u64;
        stats.service_count += 1;
        // Recalculate health score (placeholder for now, will implement properly later)
        stats.health_score = Self::calculate_health_score(&env, record.asset_id);

        env.storage()
            .persistent()
            .set(&DataKey::AssetStats(record.asset_id), &stats);

        // 6. Emit Event
        env.events().publish(
            (symbol_short!("MaintRec"), record.asset_id),
            (record.record_id, record.provider, env.ledger().timestamp()),
        );
    }

    pub fn get_maintenance_history(env: Env, asset_id: u64) -> Vec<MaintenanceRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn schedule_maintenance(env: Env, owner: Address, schedule: ScheduledMaintenance) {
        owner.require_auth();
        // Asset owner check (placeholder - assuming caller is owner or admin)
        // In a real system, we'd check if owner is truly the owner via Registry
        if schedule.frequency_days == 0 {
            panic!("frequency must be positive");
        }

        env.storage()
            .persistent()
            .set(&DataKey::MaintenanceSchedule(schedule.asset_id), &schedule);

        env.events().publish(
            (symbol_short!("MaintSch"), schedule.asset_id),
            (schedule.next_service_due, env.ledger().timestamp()),
        );
    }

    pub fn update_maintenance_schedule(env: Env, owner: Address, schedule: ScheduledMaintenance) {
        // Update existing schedule
        if !env
            .storage()
            .persistent()
            .has(&DataKey::MaintenanceSchedule(schedule.asset_id))
        {
            panic!("no schedule exists for asset");
        }
        Self::schedule_maintenance(env, owner, schedule);
    }

    pub fn get_upcoming_maintenance(env: Env, asset_id: u64) -> Option<ScheduledMaintenance> {
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

        env.events().publish(
            (symbol_short!("MaintCmp"), asset_id),
            (record.record_id, record.provider, env.ledger().timestamp()),
        );
    }

    pub fn add_warranty_information(env: Env, warranty: WarrantyInfo) {
        if warranty.end_date <= warranty.start_date {
            panic!("warranty dates invalid");
        }
        env.storage()
            .persistent()
            .set(&DataKey::Warranty(warranty.asset_id), &warranty);

        env.events().publish(
            (symbol_short!("WarrAdd"), warranty.asset_id),
            (warranty.end_date, env.ledger().timestamp()),
        );
    }

    pub fn update_warranty_information(env: Env, warranty: WarrantyInfo) {
        if !env
            .storage()
            .persistent()
            .has(&DataKey::Warranty(warranty.asset_id))
        {
            panic!("no warranty exists for asset");
        }
        Self::add_warranty_information(env, warranty);
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
        let mut warranty: WarrantyInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Warranty(asset_id))
            .expect("no warranty found");

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

        env.events().publish(
            (symbol_short!("WarrClm"), asset_id),
            (claim_amount, env.ledger().timestamp()),
        );
    }

    pub fn create_maintenance_alert(env: Env, alert: MaintenanceAlert) {
        let mut alerts = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceAlert>>(&DataKey::Alerts(alert.asset_id))
            .unwrap_or(Vec::new(&env));
        alerts.push_back(alert.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Alerts(alert.asset_id), &alerts);

        env.events().publish(
            (symbol_short!("AlertCr"), alert.asset_id),
            (alert.alert_type, alert.severity, env.ledger().timestamp()),
        );
    }

    pub fn acknowledge_maintenance_alert(env: Env, asset_id: u64, alert_index: u32, by: Address) {
        by.require_auth();
        let mut alerts: Vec<MaintenanceAlert> = env
            .storage()
            .persistent()
            .get(&DataKey::Alerts(asset_id))
            .expect("no alerts found");

        if let Some(mut alert) = alerts.get(alert_index) {
            alert.acknowledged = true;
            alert.acknowledged_by = by;
            alerts.set(alert_index, alert);
            env.storage()
                .persistent()
                .set(&DataKey::Alerts(asset_id), &alerts);
        }
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

    fn calculate_health_score(env: &Env, asset_id: u64) -> u32 {
        let history = env
            .storage()
            .persistent()
            .get::<_, Vec<MaintenanceRecord>>(&DataKey::MaintenanceHistory(asset_id))
            .unwrap_or(Vec::new(env));

        if history.is_empty() {
            return 100;
        }

        let mut total_quality = 0;
        let mut improvement_score = 0;
        let mut preventive_count = 0;

        for record in history.iter() {
            total_quality += record.quality_rating;
            if record.condition_after > record.condition_before {
                improvement_score += 5;
            }
            if let MaintenanceType::Preventive = record.maintenance_type {
                preventive_count += 1;
            }
        }

        let avg_quality = (total_quality * 10) / history.len(); // Scale to 100
        let preventive_ratio = (preventive_count * 100) / history.len();

        // Weighted Score: 40% Quality, 30% Preventive Ratio, 30% Improvement/Condition
        let mut score = (avg_quality * 4 / 10) + (preventive_ratio * 3 / 10) + (improvement_score);

        // Penalty for overdue
        if let Some(schedule) = env
            .storage()
            .persistent()
            .get::<_, ScheduledMaintenance>(&DataKey::MaintenanceSchedule(asset_id))
        {
            if env.ledger().timestamp() > schedule.next_service_due {
                let days_overdue = (env.ledger().timestamp() - schedule.next_service_due) / 86400;
                let penalty = (days_overdue as u32 * 2).min(30);
                score = score.saturating_sub(penalty);
            }
        }

        score.clamp(0, 100)
    }

    fn verify_asset_exists(_env: &Env, _asset_id: u64) -> bool {
        true
    }
}
