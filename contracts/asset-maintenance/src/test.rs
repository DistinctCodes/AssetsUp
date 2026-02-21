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

    env.mock_all_auths();
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
