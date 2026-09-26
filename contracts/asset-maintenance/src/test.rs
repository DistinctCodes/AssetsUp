#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, Env, String};

#[test]
fn test_init_and_provider_registration() {
    let env = Env::default();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);

    // init now requires the admin's authorization, so auths must be mocked
    // before it rather than after.
    env.mock_all_auths();
    client.init(&admin, &registry);

    let provider_addr = Address::generate(&env);
    let provider = ProviderProfile {
        address: provider_addr.clone(),
        name: String::from_str(&env, "Service Corp"),
        specialization: vec![&env, String::from_str(&env, "Engines")],
        certification_details: String::from_str(&env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: env.ledger().timestamp(),
        is_active: true,
        contact_hash: String::from_str(&env, "hash"),
        service_area: String::from_str(&env, "Global"),
    };

    client.register_provider(&provider);

    let fetched = client.get_provider_details(&provider_addr).unwrap();
    assert_eq!(fetched.name, String::from_str(&env, "Service Corp"));
    assert!(fetched.is_active);

    client.deactivate_provider(&provider_addr);
    let deactivated = client.get_provider_details(&provider_addr).unwrap();
    assert!(!deactivated.is_active);
}

#[test]
fn test_maintenance_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let provider_addr = Address::generate(&env);
    let provider = ProviderProfile {
        address: provider_addr.clone(),
        name: String::from_str(&env, "Service Corp"),
        specialization: vec![&env, String::from_str(&env, "Engines")],
        certification_details: String::from_str(&env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: env.ledger().timestamp(),
        is_active: true,
        contact_hash: String::from_str(&env, "hash"),
        service_area: String::from_str(&env, "Global"),
    };
    client.register_provider(&provider);

    let asset_id = 101u64;
    let record = MaintenanceRecord {
        record_id: 1,
        asset_id,
        maintenance_type: MaintenanceType::Preventive,
        provider: provider_addr.clone(),
        technician_id: String::from_str(&env, "TECH-01"),
        service_date: env.ledger().timestamp(),
        duration_hours: 4,
        description: String::from_str(&env, "Regular Checkup"),
        parts_replaced: vec![&env, String::from_str(&env, "Filter")],
        labor_cost: 100,
        parts_cost: 50,
        total_cost: 150,
        location: String::from_str(&env, "Main Shop"),
        condition_before: 7,
        condition_after: 9,
        issues_found: String::from_str(&env, "None"),
        issues_resolved: String::from_str(&env, "N/A"),
        next_recommendation: String::from_str(&env, "Check in 6 months"),
        documents_ipfs: vec![&env, String::from_str(&env, "ipfs://abc")],
        quality_rating: 10,
        timestamp: env.ledger().timestamp(),
    };

    client.add_maintenance_record(&record);

    let history = client.get_maintenance_history(&asset_id);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap().total_cost, 150);

    let health = client.get_asset_health_score(&asset_id);
    // Based on our algorithm: avg_quality(100) * 0.4 + preventive_ratio(100) * 0.3 + improvement(5) = 40+30+5 = 75?
    // Wait: avg_quality scaling: (10*10)/1 = 100. preventive_ratio: (1*100)/1 = 100. improvement_score = 5.
    // score = (100*4/10) + (100*3/10) + 5 = 40 + 30 + 5 = 75.
    assert_eq!(health, 75);
}

#[test]
fn test_warranty_and_claims() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 102u64;
    let warranty = WarrantyInfo {
        asset_id,
        provider: String::from_str(&env, "OEM"),
        warranty_type: String::from_str(&env, "Manufacturer"),
        start_date: env.ledger().timestamp(),
        end_date: env.ledger().timestamp() + 31536000, // 1 year
        coverage_details: String::from_str(&env, "Full"),
        terms_hash: String::from_str(&env, "hash"),
        claim_count: 0,
        max_claims: 2,
        status: WarrantyStatus::Active,
        is_transferable: true,
    };

    client.add_warranty_information(&warranty);
    client.file_warranty_claim(&asset_id, &500);

    // Verify claim count
    // (We don't have a get_warranty yet, but we can add it or check if it throws error for 3rd claim)
    client.file_warranty_claim(&asset_id, &300);
}

#[test]
fn test_alerts_and_stats() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 103u64;
    let alert = MaintenanceAlert {
        asset_id,
        alert_type: AlertType::ServiceDue,
        severity: AlertSeverity::High,
        message: String::from_str(&env, "Service due soon"),
        due_date: env.ledger().timestamp() + 86400,
        acknowledged: false,
        acknowledged_by: admin.clone(), // Doesn't matter for initial state
        created_at: env.ledger().timestamp(),
    };

    client.create_maintenance_alert(&alert);
    let alerts = client.get_alerts(&asset_id);
    assert_eq!(alerts.len(), 1);

    client.acknowledge_maintenance_alert(&asset_id, &0, &admin);
    let acknowledged_alerts = client.get_alerts(&asset_id);
    assert!(acknowledged_alerts.get(0).unwrap().acknowledged);

    // Test stats
    let stats = client.get_asset_stats(&asset_id);
    assert_eq!(stats.service_count, 0); // No service yet

    assert!(!client.is_maintenance_cost_excessive(&asset_id, &1000));
}

fn make_alert(env: &Env, asset_id: u64, message: &str) -> MaintenanceAlert {
    MaintenanceAlert {
        asset_id,
        alert_type: AlertType::ServiceDue,
        severity: AlertSeverity::High,
        message: String::from_str(env, message),
        due_date: env.ledger().timestamp() + 86400,
        acknowledged: false,
        acknowledged_by: Address::generate(env),
        created_at: env.ledger().timestamp(),
    }
}

// ---------------------------------------------------------------------------
// [SC-69] alert index bounds
// ---------------------------------------------------------------------------

#[test]
fn test_unauthorized_maintenance_logging() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let provider_addr = Address::generate(&env);
    let unauthorized_addr = Address::generate(&env);
    let provider = ProviderProfile {
        address: provider_addr.clone(),
        name: String::from_str(&env, "Service Corp"),
        specialization: vec![&env, String::from_str(&env, "Engines")],
        certification_details: String::from_str(&env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: env.ledger().timestamp(),
        is_active: true,
        contact_hash: String::from_str(&env, "hash"),
        service_area: String::from_str(&env, "Global"),
    };
    client.register_provider(&provider);

    let asset_id = 999u64;
    let record = MaintenanceRecord {
        record_id: 1,
        asset_id,
        maintenance_type: MaintenanceType::Preventive,
        provider: unauthorized_addr.clone(), // Unauthorized provider
        technician_id: String::from_str(&env, "TECH-01"),
        service_date: env.ledger().timestamp(),
        duration_hours: 4,
        description: String::from_str(&env, "Unauthorized attempt"),
        parts_replaced: vec![&env],
        labor_cost: 100,
        parts_cost: 50,
        total_cost: 150,
        location: String::from_str(&env, "Main Shop"),
        condition_before: 7,
        condition_after: 9,
        issues_found: String::from_str(&env, "None"),
        issues_resolved: String::from_str(&env, "N/A"),
        next_recommendation: String::from_str(&env, "Check in 6 months"),
        documents_ipfs: vec![&env],
        quality_rating: 10,
        timestamp: env.ledger().timestamp(),
    };

    // Attempt to add record with unauthorized provider should fail
    assert!(client.try_add_maintenance_record(&record).is_err());
}

#[test]
fn test_out_of_bounds_alert_index_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 104u64;
    client.create_maintenance_alert(&make_alert(&env, asset_id, "Service due soon"));
    client.create_maintenance_alert(&make_alert(&env, asset_id, "Inspection overdue"));

    // One past the current count and far out of range.
    assert!(client
        .try_acknowledge_maintenance_alert(&asset_id, &2, &admin)
        .is_err());
    assert!(client
        .try_acknowledge_maintenance_alert(&asset_id, &u32::MAX, &admin)
        .is_err());

    // Nothing was acknowledged by the failed calls.
    let alerts = client.get_alerts(&asset_id);
    assert_eq!(alerts.len(), 2);
    assert!(!alerts.get(0).unwrap().acknowledged);
    assert!(!alerts.get(1).unwrap().acknowledged);
}

#[test]
fn test_double_acknowledge_is_idempotent() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 105u64;
    client.create_maintenance_alert(&make_alert(&env, asset_id, "Service due soon"));
    client.create_maintenance_alert(&make_alert(&env, asset_id, "Inspection overdue"));

    client.acknowledge_maintenance_alert(&asset_id, &0, &admin);
    client.acknowledge_maintenance_alert(&asset_id, &0, &admin);

    let alerts = client.get_alerts(&asset_id);
    assert!(alerts.get(0).unwrap().acknowledged);
    assert_eq!(alerts.get(0).unwrap().acknowledged_by, admin);
    assert!(
        !alerts.get(1).unwrap().acknowledged,
        "acknowledging index 0 twice must not touch other alerts"
    );
}

// ---------------------------------------------------------------------------
// [SC-68] warranty claim-amount bounds
// ---------------------------------------------------------------------------

#[test]
fn test_zero_and_negative_claim_amounts_are_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 106u64;
    client.add_warranty_information(&WarrantyInfo {
        asset_id,
        provider: String::from_str(&env, "OEM"),
        warranty_type: String::from_str(&env, "Manufacturer"),
        start_date: env.ledger().timestamp(),
        end_date: env.ledger().timestamp() + 31536000,
        coverage_details: String::from_str(&env, "Full"),
        terms_hash: String::from_str(&env, "hash"),
        claim_count: 0,
        max_claims: 5,
        status: WarrantyStatus::Active,
        is_transferable: true,
    });

    assert!(client.try_file_warranty_claim(&asset_id, &0_i128).is_err());
    assert!(client
        .try_file_warranty_claim(&asset_id, &(-1_i128))
        .is_err());

    // A positive claim still goes through, and the rejected ones did not count.
    client.file_warranty_claim(&asset_id, &500_i128);
    assert_eq!(client.get_warranty(&asset_id).unwrap().claim_count, 1);
}

#[test]
fn test_claims_above_any_covered_value_are_allowed_as_advisory() {
    // The warranty stores no numeric "covered value" — claims are triggered by
    // the admin and adjudicated off-chain, so there is intentionally no
    // claim-amount cap relative to coverage. The bounds that *do* exist are
    // amount > 0, active status, expiry, and max_claims. This pins that
    // decision explicitly rather than leaving it implicit.
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 107u64;
    client.add_warranty_information(&WarrantyInfo {
        asset_id,
        provider: String::from_str(&env, "OEM"),
        warranty_type: String::from_str(&env, "Manufacturer"),
        start_date: env.ledger().timestamp(),
        end_date: env.ledger().timestamp() + 31536000,
        coverage_details: String::from_str(&env, "Full"),
        terms_hash: String::from_str(&env, "hash"),
        claim_count: 0,
        max_claims: 2,
        status: WarrantyStatus::Active,
        is_transferable: true,
    });

    // Far beyond any plausible covered value, still accepted and counted.
    client.file_warranty_claim(&asset_id, &10_000_000_000_i128);
    client.file_warranty_claim(&asset_id, &15_000_000_000_i128);
    assert_eq!(client.get_warranty(&asset_id).unwrap().claim_count, 2);

    // The hard fence is max_claims, not the amount.
    assert!(client.try_file_warranty_claim(&asset_id, &1_i128).is_err());
}

#[test]
fn test_aggregate_functions_empty_history() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let asset_id = 98u64;

    // A brand-new asset with zero maintenance records must not trap and must
    // return the sane defaults (0 cost, 0 downtime, a defined health score).
    assert_eq!(client.calculate_total_maintenance_cost(&asset_id), 0);
    assert_eq!(client.calculate_asset_downtime(&asset_id), 0);
    assert_eq!(client.get_asset_health_score(&asset_id), 100);
}

#[test]
fn test_aggregate_functions_single_record() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetMaintenanceContract, ());
    let client = AssetMaintenanceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let registry = Address::generate(&env);
    client.init(&admin, &registry);

    let provider_addr = Address::generate(&env);
    let provider = ProviderProfile {
        address: provider_addr.clone(),
        name: String::from_str(&env, "Service Corp"),
        specialization: vec![&env, String::from_str(&env, "Engines")],
        certification_details: String::from_str(&env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: env.ledger().timestamp(),
        is_active: true,
        contact_hash: String::from_str(&env, "hash"),
        service_area: String::from_str(&env, "Global"),
    };
    client.register_provider(&provider);

    let asset_id = 99u64;
    let record = MaintenanceRecord {
        record_id: 1,
        asset_id,
        maintenance_type: MaintenanceType::Preventive,
        provider: provider_addr.clone(),
        technician_id: String::from_str(&env, "TECH-01"),
        service_date: env.ledger().timestamp(),
        duration_hours: 4,
        description: String::from_str(&env, "Regular Checkup"),
        parts_replaced: vec![&env, String::from_str(&env, "Filter")],
        labor_cost: 100,
        parts_cost: 50,
        total_cost: 150,
        location: String::from_str(&env, "Main Shop"),
        condition_before: 7,
        condition_after: 9,
        issues_found: String::from_str(&env, "None"),
        issues_resolved: String::from_str(&env, "N/A"),
        next_recommendation: String::from_str(&env, "Check in 6 months"),
        documents_ipfs: vec![&env, String::from_str(&env, "ipfs://abc")],
        quality_rating: 10,
        timestamp: env.ledger().timestamp(),
    };
    client.add_maintenance_record(&record);

    assert_eq!(client.calculate_total_maintenance_cost(&asset_id), 150);
    assert_eq!(client.calculate_asset_downtime(&asset_id), 4);
    assert_eq!(client.get_asset_health_score(&asset_id), 75);
}
