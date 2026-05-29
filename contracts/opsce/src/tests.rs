#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, Env, String, Vec};

fn setup() -> (Env, OpsceMultisigClient<'static>, Address, Address, Address, u64) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(OpsceMultisig, ());
    let client = OpsceMultisigClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);

    let wallet_id = client.create_wallet(&admin, &owners, &2u32);

    (env, client, admin, owner1, owner2, wallet_id)
}

#[test]
fn test_revoke_approval_valid() {
    let (_env, client, _admin, owner1, owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);
    client.approve_transaction(&owner2, &wallet_id, &tx_id);

    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert_eq!(tx.approvals, 2);
    assert!(tx.approvers.contains(&owner1));

    // owner1 revokes their approval before execution.
    client.revoke_approval(&owner1, &wallet_id, &tx_id);

    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert_eq!(tx.approvals, 1);
    assert!(!tx.approvers.contains(&owner1));
    assert!(tx.approvers.contains(&owner2));
    assert!(!tx.executed);
}

#[test]
fn test_revoke_approval_double_revocation_fails() {
    let (_env, client, _admin, owner1, _owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);

    // First revocation succeeds.
    client.revoke_approval(&owner1, &wallet_id, &tx_id);

    // Second revocation must fail with ApprovalNotFound.
    let result = client.try_revoke_approval(&owner1, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::ApprovalNotFound)));
}

#[test]
fn test_revoke_approval_after_execution_fails() {
    let (_env, client, _admin, owner1, owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);
    client.approve_transaction(&owner2, &wallet_id, &tx_id);

    // Execute the transaction.
    client.execute_transaction(&wallet_id, &tx_id);
    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert!(tx.executed);

    // Revocation after execution must fail with AlreadyExecuted.
    let result = client.try_revoke_approval(&owner1, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::AlreadyExecuted)));
}

#[test]
fn test_revoke_approval_non_owner_fails() {
    let (env, client, _admin, owner1, _owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);

    let intruder = Address::generate(&env);
    let result = client.try_revoke_approval(&intruder, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::NotAnOwner)));
}

// ---------------------------------------------------------------------------
// Maintenance record tests
// ---------------------------------------------------------------------------

fn setup_maintenance() -> (Env, OpsceMultisigClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(OpsceMultisig, ());
    let client = OpsceMultisigClient::new(&env, &contract_id);

    let provider = Address::generate(&env);
    (env, client, provider)
}

#[test]
fn test_create_maintenance_record() {
    let (env, client, provider) = setup_maintenance();

    let asset_id = String::from_str(&env, "asset-123");
    let notes = String::from_str(&env, "Quarterly inspection");

    let record_id = client.create_maintenance_record(
        &asset_id,
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &500i128,
        &notes,
    );

    let record = client.get_maintenance_record(&record_id).unwrap();
    assert_eq!(record.asset_id, asset_id);
    assert_eq!(record.provider, provider);
    assert_eq!(record.cost, 500);
    assert_eq!(record.scheduled_date, 1_700_000_000u64);
    assert_eq!(record.status, MaintenanceStatus::Scheduled);
    assert_eq!(record.record_type, MaintenanceRecordType::Preventive);
}

#[test]
fn test_get_maintenance_records_for_asset() {
    let (env, client, provider) = setup_maintenance();

    let asset_a = String::from_str(&env, "asset-A");
    let asset_b = String::from_str(&env, "asset-B");
    let notes = String::from_str(&env, "note");

    // Two records for asset_a in different ledgers (so timestamps differ).
    client.create_maintenance_record(
        &asset_a,
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &100i128,
        &notes,
    );
    env.ledger().set_timestamp(env.ledger().timestamp() + 60);
    client.create_maintenance_record(
        &asset_a,
        &MaintenanceRecordType::Corrective,
        &provider,
        &1_700_000_100u64,
        &200i128,
        &notes,
    );
    // One record for asset_b.
    env.ledger().set_timestamp(env.ledger().timestamp() + 60);
    client.create_maintenance_record(
        &asset_b,
        &MaintenanceRecordType::Inspection,
        &provider,
        &1_700_000_200u64,
        &50i128,
        &notes,
    );

    let a_records = client.get_maintenance_records(&asset_a);
    assert_eq!(a_records.len(), 2);
    assert_eq!(a_records.get(0).unwrap().cost, 100);
    assert_eq!(a_records.get(1).unwrap().cost, 200);

    let b_records = client.get_maintenance_records(&asset_b);
    assert_eq!(b_records.len(), 1);
    assert_eq!(b_records.get(0).unwrap().cost, 50);

    // Unknown asset returns empty Vec.
    let unknown = client.get_maintenance_records(&String::from_str(&env, "asset-Z"));
    assert_eq!(unknown.len(), 0);
}

#[test]
fn test_create_maintenance_record_duplicate_fails() {
    let (env, client, provider) = setup_maintenance();

    let asset_id = String::from_str(&env, "asset-dup");
    let notes = String::from_str(&env, "duplicate test");

    client.create_maintenance_record(
        &asset_id,
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &500i128,
        &notes,
    );

    // Same asset_id + same ledger timestamp => same record_id => duplicate.
    let result = client.try_create_maintenance_record(
        &asset_id,
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &500i128,
        &notes,
    );
    assert_eq!(result, Err(Ok(ContractError::DuplicateRecord)));
}

#[test]
fn test_create_maintenance_record_empty_asset_id_fails() {
    let (env, client, provider) = setup_maintenance();

    let result = client.try_create_maintenance_record(
        &String::from_str(&env, ""),
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &100i128,
        &String::from_str(&env, ""),
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidAssetId)));
}

#[test]
fn test_create_maintenance_record_negative_cost_fails() {
    let (env, client, provider) = setup_maintenance();

    let result = client.try_create_maintenance_record(
        &String::from_str(&env, "asset-neg"),
        &MaintenanceRecordType::Preventive,
        &provider,
        &1_700_000_000u64,
        &-1i128,
        &String::from_str(&env, ""),
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidCost)));
}

// ---------------------------------------------------------------------------
// Maintenance alert tests
// ---------------------------------------------------------------------------

const BASE_TS: u64 = 1_700_000_000;
const ONE_DAY: u64 = 86_400;

fn setup_alerts() -> (Env, OpsceMultisigClient<'static>, Address, Address, String) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(BASE_TS);

    let contract_id = env.register(OpsceMultisig, ());
    let client = OpsceMultisigClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let provider = Address::generate(&env);
    client.set_admin(&admin);

    let asset_id = String::from_str(&env, "asset-A");
    (env, client, admin, provider, asset_id)
}

fn schedule_record(
    env: &Env,
    client: &OpsceMultisigClient<'_>,
    asset_id: &String,
    provider: &Address,
    scheduled_date: u64,
) {
    client.create_maintenance_record(
        asset_id,
        &MaintenanceRecordType::Preventive,
        provider,
        &scheduled_date,
        &100i128,
        &String::from_str(env, "note"),
    );
}

#[test]
fn test_check_maintenance_alerts_no_alert_when_far_future() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    // Scheduled 10 days out -> no alert (> 7 days).
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + 10 * ONE_DAY);

    let alerts = client.check_maintenance_alerts(&asset_id);
    assert_eq!(alerts.len(), 0);
    assert_eq!(client.get_active_alerts(&asset_id).len(), 0);
}

#[test]
fn test_check_maintenance_alerts_low_severity_at_seven_days() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    // 6 days out -> Low (in (3, 7]).
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + 6 * ONE_DAY);

    let alerts = client.check_maintenance_alerts(&asset_id);
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts.get(0).unwrap().severity, AlertSeverity::Low);
    assert_eq!(alerts.get(0).unwrap().alert_type, AlertType::ServiceDue);
}

#[test]
fn test_check_maintenance_alerts_medium_severity() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    // 2 days out -> Medium (in (1, 3]).
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + 2 * ONE_DAY);

    let alerts = client.check_maintenance_alerts(&asset_id);
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts.get(0).unwrap().severity, AlertSeverity::Medium);
}

#[test]
fn test_check_maintenance_alerts_high_severity() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    // 12 hours out -> High.
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + ONE_DAY / 2);

    let alerts = client.check_maintenance_alerts(&asset_id);
    assert_eq!(alerts.len(), 1);
    assert_eq!(alerts.get(0).unwrap().severity, AlertSeverity::High);
}

#[test]
fn test_check_maintenance_alerts_overdue_critical() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    // Schedule one in the future, then advance the ledger past it.
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + ONE_DAY);
    env.ledger().set_timestamp(BASE_TS + 3 * ONE_DAY);

    let alerts = client.check_maintenance_alerts(&asset_id);
    assert_eq!(alerts.len(), 1);
    let a = alerts.get(0).unwrap();
    assert_eq!(a.severity, AlertSeverity::Critical);
    assert_eq!(a.alert_type, AlertType::Overdue);
}

#[test]
fn test_check_maintenance_alerts_dedupes_same_severity() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + 6 * ONE_DAY);

    let first = client.check_maintenance_alerts(&asset_id);
    let second = client.check_maintenance_alerts(&asset_id);
    assert_eq!(first.len(), 1);
    assert_eq!(second.len(), 1);
    assert_eq!(
        first.get(0).unwrap().alert_id,
        second.get(0).unwrap().alert_id
    );
    // Index should still hold a single alert id.
    assert_eq!(client.get_active_alerts(&asset_id).len(), 1);
}

#[test]
fn test_dismiss_alert_resolves_alert() {
    let (env, client, admin, provider, asset_id) = setup_alerts();
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + ONE_DAY / 2);

    let alerts = client.check_maintenance_alerts(&asset_id);
    let alert_id = alerts.get(0).unwrap().alert_id;

    client.dismiss_alert(&admin, &alert_id);

    let active = client.get_active_alerts(&asset_id);
    assert_eq!(active.len(), 0);
}

#[test]
fn test_dismiss_alert_non_admin_fails() {
    let (env, client, _admin, provider, asset_id) = setup_alerts();
    schedule_record(&env, &client, &asset_id, &provider, BASE_TS + ONE_DAY / 2);

    let alerts = client.check_maintenance_alerts(&asset_id);
    let alert_id = alerts.get(0).unwrap().alert_id;

    let intruder = Address::generate(&env);
    let result = client.try_dismiss_alert(&intruder, &alert_id);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}
