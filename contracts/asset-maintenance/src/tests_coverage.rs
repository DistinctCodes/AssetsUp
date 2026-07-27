//! Expanded coverage for asset-maintenance ([SC-41]).
//!
//! `test.rs` covers four happy paths across ~730 lines. This module works
//! through every entrypoint with both happy and failure paths, the validation
//! boundaries, the authorization boundaries without `mock_all_auths`, and the
//! property the whole contract exists for: **maintenance history is audit
//! evidence and cannot be silently altered or deleted**.
#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::{Address as _, Ledger as _, LedgerInfo};
use soroban_sdk::{vec, Address, Env, String, Vec};

use super::*;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

struct Ctx<'a> {
    client: AssetMaintenanceContractClient<'a>,
    admin: Address,
    provider: Address,
}

const NOW: u64 = 1_000_000;

fn setup(env: &Env) -> Ctx<'_> {
    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.timestamp = NOW;
    });

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let registry = Address::generate(env);
    let provider = Address::generate(env);

    env.mock_all_auths();
    client.init(&admin, &registry);
    client.register_provider(&provider_profile(env, &provider, true));

    Ctx {
        client,
        admin,
        provider,
    }
}

fn provider_profile(env: &Env, address: &Address, active: bool) -> ProviderProfile {
    ProviderProfile {
        address: address.clone(),
        name: String::from_str(env, "Service Corp"),
        specialization: vec![env, String::from_str(env, "Engines")],
        certification_details: String::from_str(env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: env.ledger().timestamp(),
        is_active: active,
        contact_hash: String::from_str(env, "hash"),
        service_area: String::from_str(env, "Global"),
    }
}

/// A valid record: costs balance, ratings in range, service date not in future.
fn record(env: &Env, provider: &Address, record_id: u64, asset_id: u64) -> MaintenanceRecord {
    MaintenanceRecord {
        record_id,
        asset_id,
        maintenance_type: MaintenanceType::Preventive,
        provider: provider.clone(),
        technician_id: String::from_str(env, "tech-01"),
        service_date: NOW - 100,
        duration_hours: 4,
        description: String::from_str(env, "Routine service"),
        parts_replaced: vec![env, String::from_str(env, "filter")],
        labor_cost: 60,
        parts_cost: 40,
        total_cost: 100,
        location: String::from_str(env, "Depot"),
        condition_before: 5,
        condition_after: 9,
        issues_found: String::from_str(env, "none"),
        issues_resolved: String::from_str(env, "none"),
        next_recommendation: String::from_str(env, "6 months"),
        documents_ipfs: vec![env, String::from_str(env, "ipfs://doc")],
        quality_rating: 8,
        timestamp: NOW,
    }
}

fn schedule(env: &Env, provider: &Address, asset_id: u64, due: u64) -> ScheduledMaintenance {
    ScheduledMaintenance {
        asset_id,
        maintenance_type: MaintenanceType::Preventive,
        frequency_days: 30,
        last_service_date: NOW - 1000,
        next_service_due: due,
        provider_assigned: provider.clone(),
        reminder_days: 7,
        auto_schedule: true,
        priority: PriorityLevel::Medium,
        estimated_cost: 100,
        estimated_duration: 4,
        required_parts: vec![env, String::from_str(env, "filter")],
        special_instructions: String::from_str(env, "none"),
    }
}

fn warranty(env: &Env, asset_id: u64, start: u64, end: u64) -> WarrantyInfo {
    WarrantyInfo {
        asset_id,
        provider: String::from_str(env, "Maker Ltd"),
        warranty_type: String::from_str(env, "Manufacturer"),
        start_date: start,
        end_date: end,
        coverage_details: String::from_str(env, "Parts and labour"),
        terms_hash: String::from_str(env, "hash"),
        claim_count: 0,
        max_claims: 2,
        status: WarrantyStatus::Active,
        is_transferable: true,
    }
}

fn alert(env: &Env, asset_id: u64) -> MaintenanceAlert {
    MaintenanceAlert {
        asset_id,
        alert_type: AlertType::ServiceDue,
        severity: AlertSeverity::Medium,
        message: String::from_str(env, "Service due"),
        due_date: NOW + 1000,
        acknowledged: false,
        acknowledged_by: Address::generate(env),
        created_at: NOW,
    }
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

#[test]
fn init_stores_admin_and_registry() {
    let env = Env::default();
    let ctx = setup(&env);
    // Observable through an admin-gated call succeeding.
    ctx.client
        .register_provider(&provider_profile(&env, &Address::generate(&env), true));
}

#[test]
#[should_panic(expected = "already initialized")]
fn init_twice_panics() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.init(&ctx.admin, &Address::generate(&env));
}

#[test]
fn init_requires_the_admins_authorization() {
    // Without this, whoever calls init first owns a freshly deployed contract.
    let env = Env::default();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let res = client.try_init(&Address::generate(&env), &Address::generate(&env));
    assert!(res.is_err(), "init must require the admin's authorization");
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

#[test]
fn register_provider_stores_the_profile() {
    let env = Env::default();
    let ctx = setup(&env);

    let fetched = ctx.client.get_provider_details(&ctx.provider).unwrap();
    assert_eq!(fetched.name, String::from_str(&env, "Service Corp"));
    assert!(fetched.is_active);
}

#[test]
fn get_provider_details_is_none_for_an_unknown_provider() {
    let env = Env::default();
    let ctx = setup(&env);
    assert!(ctx
        .client
        .get_provider_details(&Address::generate(&env))
        .is_none());
}

#[test]
fn deactivate_provider_clears_the_active_flag() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client.deactivate_provider(&ctx.provider);

    assert!(
        !ctx.client
            .get_provider_details(&ctx.provider)
            .unwrap()
            .is_active
    );
}

#[test]
fn deactivating_an_unknown_provider_is_a_no_op() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.deactivate_provider(&Address::generate(&env));
}

#[test]
fn register_provider_requires_the_admins_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res =
        ctx.client
            .try_register_provider(&provider_profile(&env, &Address::generate(&env), true));
    assert!(res.is_err(), "only the admin may register providers");
}

#[test]
fn deactivate_provider_requires_the_admins_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res = ctx.client.try_deactivate_provider(&ctx.provider);
    assert!(res.is_err(), "only the admin may deactivate providers");
}

// ---------------------------------------------------------------------------
// Maintenance records — validation boundaries
// ---------------------------------------------------------------------------

#[test]
fn add_maintenance_record_appends_to_history() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));

    let history = ctx.client.get_maintenance_history(&7);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap().record_id, 1);
}

#[test]
fn maintenance_history_is_empty_for_an_unknown_asset() {
    let env = Env::default();
    let ctx = setup(&env);
    assert_eq!(ctx.client.get_maintenance_history(&999).len(), 0);
}

#[test]
#[should_panic(expected = "provider not registered")]
fn a_record_from_an_unregistered_provider_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let stranger = Address::generate(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &stranger, 1, 7));
}

#[test]
#[should_panic(expected = "provider is inactive")]
fn a_record_from_a_deactivated_provider_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.deactivate_provider(&ctx.provider);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));
}

#[test]
#[should_panic(expected = "service date cannot be in future")]
fn a_record_dated_in_the_future_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.service_date = NOW + 1;

    ctx.client.add_maintenance_record(&r);
}

#[test]
fn a_record_dated_exactly_now_is_accepted() {
    // The boundary: `service_date > now` is rejected, so `== now` must pass.
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.service_date = NOW;

    ctx.client.add_maintenance_record(&r);
    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
}

#[test]
fn a_record_dated_far_in_the_past_is_accepted() {
    // Backfilling historical service records is legitimate.
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.service_date = 1;

    ctx.client.add_maintenance_record(&r);
    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
}

#[test]
#[should_panic(expected = "cost values must be non-negative")]
fn a_record_with_a_negative_cost_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.labor_cost = -1;
    r.total_cost = 39;

    ctx.client.add_maintenance_record(&r);
}

#[test]
#[should_panic(expected = "labor + parts cost must equal total cost")]
fn a_record_whose_costs_do_not_balance_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.total_cost = 999;

    ctx.client.add_maintenance_record(&r);
}

#[test]
fn a_zero_cost_record_is_accepted() {
    // Boundary at zero: a warranty-covered service costs nothing.
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.labor_cost = 0;
    r.parts_cost = 0;
    r.total_cost = 0;

    ctx.client.add_maintenance_record(&r);
    assert_eq!(ctx.client.calculate_total_maintenance_cost(&7), 0);
}

#[test]
#[should_panic(expected = "condition ratings must be 1-10")]
fn a_condition_rating_below_the_range_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.condition_before = 0;

    ctx.client.add_maintenance_record(&r);
}

#[test]
#[should_panic(expected = "condition ratings must be 1-10")]
fn a_condition_rating_above_the_range_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.condition_after = 11;

    ctx.client.add_maintenance_record(&r);
}

#[test]
fn condition_ratings_at_both_ends_of_the_range_are_accepted() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.condition_before = 1;
    r.condition_after = 10;

    ctx.client.add_maintenance_record(&r);
    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
}

#[test]
#[should_panic(expected = "quality rating must be 1-10")]
fn a_quality_rating_of_zero_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.quality_rating = 0;

    ctx.client.add_maintenance_record(&r);
}

#[test]
#[should_panic(expected = "quality rating must be 1-10")]
fn a_quality_rating_above_ten_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut r = record(&env, &ctx.provider, 1, 7);
    r.quality_rating = 11;

    ctx.client.add_maintenance_record(&r);
}

#[test]
fn add_maintenance_record_requires_the_providers_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res = ctx
        .client
        .try_add_maintenance_record(&record(&env, &ctx.provider, 1, 7));
    assert!(
        res.is_err(),
        "naming a registered provider must not be enough to file a record"
    );
}

// ---------------------------------------------------------------------------
// The audit property: history is append-only
// ---------------------------------------------------------------------------

#[test]
fn history_is_append_only_and_earlier_records_are_never_rewritten() {
    // The core reason this contract exists. If a later write could alter an
    // earlier record, the on-chain history would be worthless as evidence.
    let env = Env::default();
    let ctx = setup(&env);

    let first = record(&env, &ctx.provider, 1, 7);
    ctx.client.add_maintenance_record(&first);

    let mut second = record(&env, &ctx.provider, 2, 7);
    second.description = String::from_str(&env, "Second service");
    second.total_cost = 250;
    second.labor_cost = 150;
    second.parts_cost = 100;
    ctx.client.add_maintenance_record(&second);

    let history = ctx.client.get_maintenance_history(&7);
    assert_eq!(history.len(), 2, "both records must be retained");

    let stored_first = history.get(0).unwrap();
    assert_eq!(stored_first.record_id, 1);
    assert_eq!(
        stored_first.total_cost, 100,
        "the first record is unchanged"
    );
    assert_eq!(stored_first.description, first.description);
    assert_eq!(history.get(1).unwrap().record_id, 2);
}

#[test]
fn reusing_a_record_id_appends_rather_than_overwriting() {
    // There is no de-duplication on record_id. Filing the same id twice adds a
    // second entry; it does not replace the first. Pinning the real behaviour:
    // the audit trail keeps both, which is the safe direction, but consumers
    // must not assume record_id is unique.
    let env = Env::default();
    let ctx = setup(&env);

    let mut original = record(&env, &ctx.provider, 1, 7);
    original.total_cost = 100;
    ctx.client.add_maintenance_record(&original);

    let mut duplicate = record(&env, &ctx.provider, 1, 7);
    duplicate.total_cost = 20;
    duplicate.labor_cost = 10;
    duplicate.parts_cost = 10;
    ctx.client.add_maintenance_record(&duplicate);

    let history = ctx.client.get_maintenance_history(&7);
    assert_eq!(history.len(), 2, "the original is retained, not replaced");
    assert_eq!(history.get(0).unwrap().total_cost, 100);
}

#[test]
fn no_entrypoint_removes_a_maintenance_record() {
    // Completing scheduled maintenance and deactivating the provider are the
    // operations most likely to prune history. Neither may.
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));
    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));
    ctx.client
        .complete_scheduled_maintenance(&7, &record(&env, &ctx.provider, 2, 7));
    ctx.client.deactivate_provider(&ctx.provider);

    let history = ctx.client.get_maintenance_history(&7);
    assert_eq!(
        history.len(),
        2,
        "history must survive every other operation"
    );
    assert_eq!(history.get(0).unwrap().record_id, 1);
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

#[test]
fn schedule_maintenance_stores_the_schedule() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));

    let upcoming = ctx.client.get_upcoming_maintenance(&7).unwrap();
    assert_eq!(upcoming.next_service_due, NOW + 500);
}

#[test]
fn get_upcoming_maintenance_is_none_when_nothing_is_scheduled() {
    let env = Env::default();
    let ctx = setup(&env);
    assert!(ctx.client.get_upcoming_maintenance(&7).is_none());
}

#[test]
#[should_panic(expected = "frequency must be positive")]
fn a_schedule_with_zero_frequency_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut sched = schedule(&env, &ctx.provider, 7, NOW + 500);
    sched.frequency_days = 0;

    ctx.client.schedule_maintenance(&ctx.admin, &sched);
}

#[test]
fn a_schedule_due_in_the_past_is_accepted_and_reads_as_overdue() {
    // Scheduling in the past is allowed — it is how a missed service is
    // recorded — and must immediately register as overdue.
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW - 1));

    assert!(ctx.client.get_overdue_maintenance(&7));
}

#[test]
fn a_schedule_due_in_the_future_is_not_overdue() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));

    assert!(!ctx.client.get_overdue_maintenance(&7));
}

#[test]
fn a_schedule_due_exactly_now_is_not_yet_overdue() {
    // Boundary: the check is `now > due`, so equality is not overdue.
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW));

    assert!(!ctx.client.get_overdue_maintenance(&7));
}

#[test]
fn get_overdue_maintenance_is_false_without_a_schedule() {
    let env = Env::default();
    let ctx = setup(&env);
    assert!(!ctx.client.get_overdue_maintenance(&7));
}

#[test]
#[should_panic(expected = "no schedule exists for asset")]
fn updating_a_schedule_that_does_not_exist_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .update_maintenance_schedule(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));
}

#[test]
fn update_maintenance_schedule_replaces_the_existing_schedule() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));

    ctx.client
        .update_maintenance_schedule(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 9_000));

    assert_eq!(
        ctx.client
            .get_upcoming_maintenance(&7)
            .unwrap()
            .next_service_due,
        NOW + 9_000
    );
}

#[test]
fn schedule_maintenance_requires_the_owners_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res = ctx
        .client
        .try_schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));
    assert!(res.is_err(), "scheduling must require authorization");
}

#[test]
fn completing_scheduled_maintenance_rolls_the_schedule_forward() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .schedule_maintenance(&ctx.admin, &schedule(&env, &ctx.provider, 7, NOW + 500));

    let r = record(&env, &ctx.provider, 1, 7);
    ctx.client.complete_scheduled_maintenance(&7, &r);

    // auto_schedule is on, so the next due date moves to service_date + 30 days.
    let expected = r.service_date + 30 * 86400;
    assert_eq!(
        ctx.client
            .get_upcoming_maintenance(&7)
            .unwrap()
            .next_service_due,
        expected
    );
    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
}

#[test]
fn completing_maintenance_without_a_schedule_still_records_the_service() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .complete_scheduled_maintenance(&7, &record(&env, &ctx.provider, 1, 7));

    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
    assert!(ctx.client.get_upcoming_maintenance(&7).is_none());
}

// ---------------------------------------------------------------------------
// Warranties
// ---------------------------------------------------------------------------

#[test]
fn add_warranty_information_stores_the_terms() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));

    assert_eq!(ctx.client.get_warranty(&7).unwrap().end_date, NOW + 10_000);
}

#[test]
fn get_warranty_is_none_for_an_asset_without_one() {
    let env = Env::default();
    let ctx = setup(&env);
    assert!(ctx.client.get_warranty(&7).is_none());
}

#[test]
#[should_panic(expected = "warranty dates invalid")]
fn a_warranty_ending_before_it_starts_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW + 100, NOW));
}

#[test]
#[should_panic(expected = "warranty dates invalid")]
fn a_zero_length_warranty_is_rejected() {
    // Boundary: end must be strictly after start.
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW));
}

#[test]
#[should_panic(expected = "no warranty exists for asset")]
fn updating_a_warranty_that_does_not_exist_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .update_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));
}

#[test]
fn update_warranty_information_replaces_the_terms() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));

    ctx.client
        .update_warranty_information(&warranty(&env, 7, NOW, NOW + 50_000));

    assert_eq!(ctx.client.get_warranty(&7).unwrap().end_date, NOW + 50_000);
}

#[test]
fn add_warranty_information_requires_the_admins_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res = ctx
        .client
        .try_add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));
    assert!(
        res.is_err(),
        "warranty terms must not be writable by anyone"
    );
}

// ---------------------------------------------------------------------------
// Warranty claims
// ---------------------------------------------------------------------------

#[test]
fn filing_a_claim_increments_the_claim_count() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));

    ctx.client.file_warranty_claim(&7, &500);

    assert_eq!(ctx.client.get_warranty(&7).unwrap().claim_count, 1);
}

#[test]
#[should_panic(expected = "no warranty found")]
fn claiming_against_a_missing_warranty_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.file_warranty_claim(&7, &500);
}

#[test]
#[should_panic(expected = "max claims reached")]
fn claiming_beyond_the_maximum_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));

    // max_claims is 2.
    ctx.client.file_warranty_claim(&7, &100);
    ctx.client.file_warranty_claim(&7, &100);
    ctx.client.file_warranty_claim(&7, &100);
}

#[test]
#[should_panic(expected = "warranty has expired")]
fn claiming_after_the_warranty_expires_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 100));

    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.timestamp = NOW + 101;
    });

    ctx.client.file_warranty_claim(&7, &100);
}

#[test]
#[should_panic(expected = "warranty is not active")]
fn claiming_against_a_voided_warranty_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    let mut w = warranty(&env, 7, NOW, NOW + 10_000);
    w.status = WarrantyStatus::Voided;
    ctx.client.add_warranty_information(&w);

    ctx.client.file_warranty_claim(&7, &100);
}

#[test]
fn file_warranty_claim_requires_the_admins_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_warranty_information(&warranty(&env, 7, NOW, NOW + 10_000));
    env.set_auths(&[]);

    let res = ctx.client.try_file_warranty_claim(&7, &100);
    assert!(res.is_err(), "claims must not be forgeable by anyone");
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

#[test]
fn create_maintenance_alert_appends_to_the_alert_list() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client.create_maintenance_alert(&alert(&env, 7));
    ctx.client.create_maintenance_alert(&alert(&env, 7));

    assert_eq!(ctx.client.get_alerts(&7).len(), 2);
}

#[test]
fn get_alerts_is_empty_for_an_asset_without_any() {
    let env = Env::default();
    let ctx = setup(&env);
    assert_eq!(ctx.client.get_alerts(&7).len(), 0);
}

#[test]
fn acknowledging_an_alert_marks_it_and_records_who() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.create_maintenance_alert(&alert(&env, 7));

    let acker = Address::generate(&env);
    ctx.client.acknowledge_maintenance_alert(&7, &0, &acker);

    let stored = ctx.client.get_alerts(&7).get(0).unwrap();
    assert!(stored.acknowledged);
    assert_eq!(stored.acknowledged_by, acker);
}

#[test]
fn acknowledging_an_out_of_range_alert_index_is_a_no_op() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client.create_maintenance_alert(&alert(&env, 7));

    ctx.client
        .acknowledge_maintenance_alert(&7, &99, &Address::generate(&env));

    assert!(!ctx.client.get_alerts(&7).get(0).unwrap().acknowledged);
}

#[test]
#[should_panic(expected = "no alerts found")]
fn acknowledging_an_alert_for_an_asset_without_any_is_rejected() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .acknowledge_maintenance_alert(&7, &0, &Address::generate(&env));
}

#[test]
fn create_maintenance_alert_requires_the_admins_authorization() {
    let env = Env::default();
    let ctx = setup(&env);
    env.set_auths(&[]);

    let res = ctx.client.try_create_maintenance_alert(&alert(&env, 7));
    assert!(res.is_err(), "alerts must not be forgeable by anyone");
}

// ---------------------------------------------------------------------------
// Derived statistics
// ---------------------------------------------------------------------------

#[test]
fn stats_start_at_zero_for_an_unknown_asset() {
    let env = Env::default();
    let ctx = setup(&env);

    assert_eq!(ctx.client.calculate_total_maintenance_cost(&7), 0);
    assert_eq!(ctx.client.calculate_asset_downtime(&7), 0);
}

#[test]
fn cost_and_downtime_accumulate_across_records() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));
    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 2, 7));

    assert_eq!(ctx.client.calculate_total_maintenance_cost(&7), 200);
    assert_eq!(ctx.client.calculate_asset_downtime(&7), 8);
    assert_eq!(ctx.client.get_asset_stats(&7).service_count, 2);
}

#[test]
fn health_score_is_within_the_documented_range() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));

    let score = ctx.client.get_asset_health_score(&7);
    assert!(score <= 100, "health score must be on a 1-100 scale");
}

#[test]
fn is_maintenance_cost_excessive_compares_against_the_threshold() {
    let env = Env::default();
    let ctx = setup(&env);
    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));

    assert!(ctx.client.is_maintenance_cost_excessive(&7, &99));
    assert!(!ctx.client.is_maintenance_cost_excessive(&7, &100));
    assert!(!ctx.client.is_maintenance_cost_excessive(&7, &101));
}

#[test]
fn stats_are_tracked_per_asset() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));
    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 2, 8));

    assert_eq!(ctx.client.calculate_total_maintenance_cost(&7), 100);
    assert_eq!(ctx.client.calculate_total_maintenance_cost(&8), 100);
    assert_eq!(ctx.client.get_maintenance_history(&7).len(), 1);
    assert_eq!(ctx.client.get_maintenance_history(&8).len(), 1);
}

#[test]
fn records_for_different_assets_do_not_share_history() {
    let env = Env::default();
    let ctx = setup(&env);

    ctx.client
        .add_maintenance_record(&record(&env, &ctx.provider, 1, 7));

    assert_eq!(ctx.client.get_maintenance_history(&8).len(), 0);
}

#[test]
fn parts_replaced_and_documents_round_trip() {
    let env = Env::default();
    let ctx = setup(&env);
    let r = record(&env, &ctx.provider, 1, 7);

    ctx.client.add_maintenance_record(&r);

    let stored = ctx.client.get_maintenance_history(&7).get(0).unwrap();
    let expected_parts: Vec<String> = vec![&env, String::from_str(&env, "filter")];
    assert_eq!(stored.parts_replaced, expected_parts);
    assert_eq!(stored.documents_ipfs.len(), 1);
    assert_eq!(stored.technician_id, String::from_str(&env, "tech-01"));
}
