//! Property-based coverage for maintenance cost and date inputs (#1483).
//!
//! `test.rs` and `tests_coverage.rs` pin *specific* examples. These properties
//! assert the *rules* hold for arbitrary inputs: a record whose labour and
//! parts costs balance is accepted and rolled into the asset's stats; one that
//! does not balance is rejected; condition/quality ratings only pass inside
//! `1..=10`; and a service dated in the future is always rejected.
//!
//! The generator ranges deliberately straddle every documented boundary
//! (zero, negative-adjacent, and the per-cost maximum) rather than only the
//! happy path.
#![cfg(test)]

extern crate std;

use proptest::prelude::*;
use soroban_sdk::testutils::{Address as _, Ledger as _, LedgerInfo};
use soroban_sdk::{vec, Address, Env, String};

use super::*;

const NOW: u64 = 1_000_000;
/// Matches `max_cost` in `add_maintenance_record`.
const MAX_COST: i128 = 999_999_999_999;

fn ctx(env: &Env) -> (AssetMaintenanceContractClient<'_>, Address) {
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
    client.register_provider(&ProviderProfile {
        address: provider.clone(),
        name: String::from_str(env, "Service Corp"),
        specialization: vec![env, String::from_str(env, "Engines")],
        certification_details: String::from_str(env, "ISO9001"),
        total_services: 0,
        average_rating: 0,
        registration_timestamp: NOW,
        is_active: true,
        contact_hash: String::from_str(env, "hash"),
        service_area: String::from_str(env, "Global"),
    });

    (client, provider)
}

#[allow(clippy::too_many_arguments)]
fn record(
    env: &Env,
    provider: &Address,
    labor: i128,
    parts: i128,
    total: i128,
    condition_before: u32,
    condition_after: u32,
    quality: u32,
    service_date: u64,
) -> MaintenanceRecord {
    MaintenanceRecord {
        record_id: 1,
        asset_id: 7,
        maintenance_type: MaintenanceType::Preventive,
        provider: provider.clone(),
        technician_id: String::from_str(env, "tech-01"),
        service_date,
        duration_hours: 4,
        description: String::from_str(env, "Routine service"),
        parts_replaced: vec![env, String::from_str(env, "filter")],
        labor_cost: labor,
        parts_cost: parts,
        total_cost: total,
        location: String::from_str(env, "Depot"),
        condition_before,
        condition_after,
        issues_found: String::from_str(env, "none"),
        issues_resolved: String::from_str(env, "none"),
        next_recommendation: String::from_str(env, "6 months"),
        documents_ipfs: vec![env, String::from_str(env, "ipfs://doc")],
        quality_rating: quality,
        timestamp: NOW,
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 32, ..ProptestConfig::default() })]

    /// The defining invariant: whenever `labour + parts == total`, and every
    /// figure is inside `[0, MAX_COST]`, the record is accepted and the derived
    /// stats reflect the total exactly.
    #[test]
    fn balancing_costs_are_always_accepted(
        labor in 0i128..(MAX_COST / 2),
        parts in 0i128..(MAX_COST / 2),
    ) {
        let total = labor + parts;
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let r = record(&env, &provider, labor, parts, total, 5, 5, 5, NOW);
        prop_assert!(client.try_add_maintenance_record(&r).is_ok());
        prop_assert_eq!(client.get_maintenance_history(&7).len(), 1);
        prop_assert_eq!(client.get_asset_stats(&7).total_cost, total);
    }

    /// Any record whose costs do not balance is rejected, whatever the split.
    #[test]
    fn unbalanced_costs_are_always_rejected(
        labor in 1i128..100_000,
        parts in 1i128..100_000,
        extra in 1i128..100_000,
    ) {
        let total = labor + parts + extra;
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let r = record(&env, &provider, labor, parts, total, 5, 5, 5, NOW);
        prop_assert!(client.try_add_maintenance_record(&r).is_err());
        prop_assert_eq!(client.get_maintenance_history(&7).len(), 0);
    }

    /// Costs above the per-field maximum are rejected even when they balance.
    #[test]
    fn costs_above_the_maximum_are_rejected(over in 1i128..1_000_000) {
        let labor = MAX_COST + over;
        let parts = 0i128;
        let total = labor + parts;
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let r = record(&env, &provider, labor, parts, total, 5, 5, 5, NOW);
        prop_assert!(client.try_add_maintenance_record(&r).is_err());
    }

    /// Condition and quality ratings are only accepted inside `1..=10`.
    #[test]
    fn in_range_ratings_are_accepted(
        before in 1u32..=10,
        after in 1u32..=10,
        quality in 1u32..=10,
    ) {
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let r = record(&env, &provider, 60, 40, 100, before, after, quality, NOW);
        prop_assert!(client.try_add_maintenance_record(&r).is_ok());
    }

    /// Anything outside `1..=10` for any rating is rejected.
    #[test]
    fn out_of_range_ratings_are_rejected(
        bad in prop_oneof![Just(0u32), 11u32..=100_000],
    ) {
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let mut r = record(&env, &provider, 60, 40, 100, 5, 5, 5, NOW);
        r.condition_before = bad;
        prop_assert!(client.try_add_maintenance_record(&r).is_err());

        let mut r = record(&env, &provider, 60, 40, 100, 5, 5, 5, NOW);
        r.condition_after = bad;
        prop_assert!(client.try_add_maintenance_record(&r).is_err());

        let mut r = record(&env, &provider, 60, 40, 100, 5, 5, 5, NOW);
        r.quality_rating = bad;
        prop_assert!(client.try_add_maintenance_record(&r).is_err());
    }

    /// A service dated in the future is rejected; a date at or before `now` is
    /// accepted.
    #[test]
    fn future_service_dates_are_rejected(offset in 1u64..1_000_000_000) {
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let r = record(&env, &provider, 60, 40, 100, 5, 5, 5, NOW + offset);
        prop_assert!(client.try_add_maintenance_record(&r).is_err());
    }
}

// ---------------------------------------------------------------------------
// Rollups: cost, downtime and health score (#1654)
// ---------------------------------------------------------------------------

/// `(labor, parts, duration_hours, maintenance type, condition before, condition after, quality)`.
type Spec = (i128, i128, u32, u8, u32, u32, u32);

fn spec_record(env: &Env, provider: &Address, spec: &Spec) -> MaintenanceRecord {
    let (labor, parts, hours, kind, before, after, quality) = *spec;
    let mut r = record(
        env,
        provider,
        labor,
        parts,
        labor + parts,
        before,
        after,
        quality,
        NOW,
    );
    r.duration_hours = hours;
    r.maintenance_type = match kind % 6 {
        0 => MaintenanceType::Preventive,
        1 => MaintenanceType::Corrective,
        2 => MaintenanceType::Emergency,
        3 => MaintenanceType::Inspection,
        4 => MaintenanceType::Upgrade,
        _ => MaintenanceType::Calibration,
    };
    r
}

fn spec_strategy() -> impl Strategy<Value = Spec> {
    (
        0i128..1_000_000,
        0i128..1_000_000,
        0u32..10_000,
        0u8..6,
        1u32..=10,
        1u32..=10,
        1u32..=10,
    )
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 32, ..ProptestConfig::default() })]

    /// The rollups equal the sums over the records, however many there are
    /// (including none), and the health score stays inside its documented
    /// `1..=100` range after every record.
    #[test]
    fn totals_equal_the_sum_of_records_and_health_stays_in_range(
        specs in prop::collection::vec(spec_strategy(), 0..8),
    ) {
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let mut expected_cost: i128 = 0;
        let mut expected_hours: u64 = 0;

        for spec in &specs {
            client.add_maintenance_record(&spec_record(&env, &provider, spec));
            expected_cost += spec.0 + spec.1;
            expected_hours += u64::from(spec.2);

            let score = client.get_asset_health_score(&7);
            prop_assert!((1..=100).contains(&score), "health score {} out of range", score);
        }

        prop_assert_eq!(client.calculate_total_maintenance_cost(&7), expected_cost);
        prop_assert_eq!(client.calculate_asset_downtime(&7), expected_hours);

        let stats = client.get_asset_stats(&7);
        prop_assert_eq!(stats.service_count as usize, specs.len());
        prop_assert_eq!(client.get_maintenance_history(&7).len() as usize, specs.len());
        if specs.is_empty() {
            // Nothing recorded: a fresh asset is fully healthy.
            prop_assert_eq!(stats.health_score, 100);
        }
    }

    /// Downtime never decreases as records are added; each record adds
    /// exactly its own duration.
    #[test]
    fn downtime_only_grows_by_each_records_duration(
        specs in prop::collection::vec(spec_strategy(), 1..8),
    ) {
        let env = Env::default();
        let (client, provider) = ctx(&env);

        let mut previous = client.calculate_asset_downtime(&7);
        for spec in &specs {
            client.add_maintenance_record(&spec_record(&env, &provider, spec));
            let now = client.calculate_asset_downtime(&7);
            prop_assert!(now >= previous, "downtime went from {} to {}", previous, now);
            prop_assert_eq!(now - previous, u64::from(spec.2));
            previous = now;
        }
    }

    /// The rollups do not depend on the order the records arrive in.
    #[test]
    fn results_are_independent_of_record_order(
        specs in prop::collection::vec(spec_strategy(), 1..8),
    ) {
        let forward_env = Env::default();
        let (forward, forward_provider) = ctx(&forward_env);
        for spec in &specs {
            forward.add_maintenance_record(&spec_record(&forward_env, &forward_provider, spec));
        }

        let reversed_env = Env::default();
        let (reversed, reversed_provider) = ctx(&reversed_env);
        for spec in specs.iter().rev() {
            reversed.add_maintenance_record(&spec_record(&reversed_env, &reversed_provider, spec));
        }

        prop_assert_eq!(forward.get_asset_stats(&7), reversed.get_asset_stats(&7));
    }
}
