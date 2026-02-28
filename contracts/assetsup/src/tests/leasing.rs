#![cfg(test)]

extern crate std;

use soroban_sdk::{Address, BytesN, Env};

use crate::error::Error;
use crate::leasing::{self, LeaseStatus};

// ── Helpers ──────────────────────────────────────────────────────────────────

fn make_id(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[31] = seed;
    BytesN::from_array(env, &bytes)
}

/// Build and store a default active lease; returns (asset_id, lease_id, lessor, lessee).
fn create_default_lease(
    env: &Env,
) -> (BytesN<32>, BytesN<32>, Address, Address) {
    let asset_id = make_id(env, 1);
    let lease_id = make_id(env, 2);
    let lessor = Address::random(env);
    let lessee = Address::random(env);

    leasing::create_lease(
        env,
        asset_id.clone(),
        lease_id.clone(),
        lessor.clone(),
        lessee.clone(),
        /* start */ 500,
        /* end   */ 2000,
        /* rent  */ 100,
        /* dep   */ 500,
    )
    .unwrap();

    (asset_id, lease_id, lessor, lessee)
}

// ── create_lease ─────────────────────────────────────────────────────────────

#[test]
fn test_create_lease_success() {
    let env = Env::default();
    let (asset_id, lease_id, lessor, lessee) = create_default_lease(&env);

    let lease = leasing::get_lease(&env, lease_id.clone()).unwrap();

    assert_eq!(lease.lease_id, lease_id);
    assert_eq!(lease.asset_id, asset_id);
    assert_eq!(lease.lessor, lessor);
    assert_eq!(lease.lessee, lessee);
    assert_eq!(lease.start_timestamp, 500);
    assert_eq!(lease.end_timestamp, 2000);
    assert_eq!(lease.rent_per_period, 100);
    assert_eq!(lease.deposit, 500);
    assert_eq!(lease.status, LeaseStatus::Active);
    assert_eq!(lease.returned_at, 0);
}

#[test]
fn test_create_lease_registers_active_lease_for_asset() {
    let env = Env::default();
    let (asset_id, lease_id, _, _) = create_default_lease(&env);

    let active = leasing::get_asset_active_lease(&env, asset_id.clone());
    assert_eq!(active, Some(lease_id));
}

#[test]
fn test_create_lease_records_in_lessee_history() {
    let env = Env::default();
    let (_, lease_id, _, lessee) = create_default_lease(&env);

    let leases = leasing::get_lessee_leases(&env, lessee);
    assert_eq!(leases.len(), 1);
    assert_eq!(leases.get(0).unwrap(), lease_id);
}

#[test]
fn test_create_lease_duplicate_lease_id_fails() {
    let env = Env::default();
    let (asset_id, lease_id, lessor, lessee) = create_default_lease(&env);

    // Use a different asset so AssetAlreadyLeased doesn't fire first.
    let other_asset = make_id(&env, 99);
    let err = leasing::create_lease(
        &env, other_asset, lease_id, lessor, lessee, 500, 2000, 100, 0,
    )
    .unwrap_err();

    assert_eq!(err, Error::LeaseAlreadyExists);
    let _ = asset_id;
}

#[test]
fn test_create_lease_asset_already_leased_fails() {
    let env = Env::default();
    let (asset_id, _, lessor, lessee) = create_default_lease(&env);

    let second_lease_id = make_id(&env, 50);
    let err = leasing::create_lease(
        &env, asset_id, second_lease_id, lessor, lessee, 500, 2000, 100, 0,
    )
    .unwrap_err();

    assert_eq!(err, Error::AssetAlreadyLeased);
}

#[test]
fn test_create_lease_invalid_period_fails() {
    let env = Env::default();
    let asset_id = make_id(&env, 10);
    let lease_id = make_id(&env, 11);
    let lessor = Address::random(&env);
    let lessee = Address::random(&env);

    // end == start → invalid
    let err =
        leasing::create_lease(&env, asset_id.clone(), lease_id.clone(), lessor.clone(), lessee.clone(), 1000, 1000, 100, 0)
            .unwrap_err();
    assert_eq!(err, Error::InvalidLeasePeriod);

    // end < start → invalid
    let err2 =
        leasing::create_lease(&env, asset_id, lease_id, lessor, lessee, 2000, 1000, 100, 0)
            .unwrap_err();
    assert_eq!(err2, Error::InvalidLeasePeriod);
}

#[test]
fn test_create_lease_zero_rent_fails() {
    let env = Env::default();
    let asset_id = make_id(&env, 20);
    let lease_id = make_id(&env, 21);
    let lessor = Address::random(&env);
    let lessee = Address::random(&env);

    let err =
        leasing::create_lease(&env, asset_id, lease_id, lessor, lessee, 500, 2000, 0, 0)
            .unwrap_err();
    assert_eq!(err, Error::InvalidRentAmount);
}

// ── return_asset ─────────────────────────────────────────────────────────────

#[test]
fn test_return_asset_by_lessee_success() {
    let env = Env::default();
    let (asset_id, lease_id, _, lessee) = create_default_lease(&env);

    leasing::return_asset(&env, lease_id.clone(), lessee).unwrap();

    let lease = leasing::get_lease(&env, lease_id).unwrap();
    assert_eq!(lease.status, LeaseStatus::Returned);

    // Active lease marker must be cleared.
    assert_eq!(leasing::get_asset_active_lease(&env, asset_id), None);
}

#[test]
fn test_return_asset_by_lessor_success() {
    let env = Env::default();
    let (_, lease_id, lessor, _) = create_default_lease(&env);

    leasing::return_asset(&env, lease_id.clone(), lessor).unwrap();

    let lease = leasing::get_lease(&env, lease_id).unwrap();
    assert_eq!(lease.status, LeaseStatus::Returned);
}

#[test]
fn test_return_asset_by_stranger_fails() {
    let env = Env::default();
    let (_, lease_id, _, _) = create_default_lease(&env);
    let stranger = Address::random(&env);

    let err = leasing::return_asset(&env, lease_id, stranger).unwrap_err();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_return_asset_already_returned_fails() {
    let env = Env::default();
    let (_, lease_id, _, lessee) = create_default_lease(&env);

    leasing::return_asset(&env, lease_id.clone(), lessee.clone()).unwrap();

    let err = leasing::return_asset(&env, lease_id, lessee).unwrap_err();
    assert_eq!(err, Error::LeaseNotActive);
}

#[test]
fn test_return_asset_not_found_fails() {
    let env = Env::default();
    let nonexistent = make_id(&env, 200);
    let caller = Address::random(&env);

    let err = leasing::return_asset(&env, nonexistent, caller).unwrap_err();
    assert_eq!(err, Error::LeaseNotFound);
}

// ── cancel_lease ─────────────────────────────────────────────────────────────

#[test]
fn test_cancel_lease_before_start_success() {
    let env = Env::default();
    // Default ledger timestamp is 0; start_timestamp is 500, so it hasn't started yet.
    let (asset_id, lease_id, lessor, _) = create_default_lease(&env);

    leasing::cancel_lease(&env, lease_id.clone(), lessor).unwrap();

    let lease = leasing::get_lease(&env, lease_id).unwrap();
    assert_eq!(lease.status, LeaseStatus::Cancelled);
    assert_eq!(leasing::get_asset_active_lease(&env, asset_id), None);
}

#[test]
fn test_cancel_lease_after_start_fails() {
    let env = Env::default();
    let (_, lease_id, lessor, _) = create_default_lease(&env);

    // Advance ledger past start_timestamp (500).
    env.ledger().with_mut(|li| li.timestamp = 600);

    let err = leasing::cancel_lease(&env, lease_id, lessor).unwrap_err();
    assert_eq!(err, Error::LeaseAlreadyStarted);
}

#[test]
fn test_cancel_lease_by_lessee_fails() {
    let env = Env::default();
    let (_, lease_id, _, lessee) = create_default_lease(&env);

    let err = leasing::cancel_lease(&env, lease_id, lessee).unwrap_err();
    assert_eq!(err, Error::Unauthorized);
}

// ── expire_lease ─────────────────────────────────────────────────────────────

#[test]
fn test_expire_lease_after_end_success() {
    let env = Env::default();
    let (asset_id, lease_id, _, _) = create_default_lease(&env);

    // Advance past end_timestamp (2000).
    env.ledger().with_mut(|li| li.timestamp = 2001);

    leasing::expire_lease(&env, lease_id.clone()).unwrap();

    let lease = leasing::get_lease(&env, lease_id).unwrap();
    assert_eq!(lease.status, LeaseStatus::Expired);
    assert_eq!(leasing::get_asset_active_lease(&env, asset_id), None);
}

#[test]
fn test_expire_lease_before_end_fails() {
    let env = Env::default();
    let (_, lease_id, _, _) = create_default_lease(&env);

    // Ledger is at 0, end_timestamp is 2000 — not yet expired.
    let err = leasing::expire_lease(&env, lease_id).unwrap_err();
    assert_eq!(err, Error::LeaseNotExpired);
}

#[test]
fn test_expire_already_returned_fails() {
    let env = Env::default();
    let (_, lease_id, _, lessee) = create_default_lease(&env);

    leasing::return_asset(&env, lease_id.clone(), lessee).unwrap();

    env.ledger().with_mut(|li| li.timestamp = 3000);

    let err = leasing::expire_lease(&env, lease_id).unwrap_err();
    assert_eq!(err, Error::LeaseNotActive);
}

// ── get_lessee_leases ─────────────────────────────────────────────────────────

#[test]
fn test_lessee_accumulates_multiple_leases() {
    let env = Env::default();
    let lessor = Address::random(&env);
    let lessee = Address::random(&env);

    // First lease
    let asset1 = make_id(&env, 30);
    let id1 = make_id(&env, 31);
    leasing::create_lease(&env, asset1, id1.clone(), lessor.clone(), lessee.clone(), 100, 200, 10, 0).unwrap();

    // Second lease on a different asset
    let asset2 = make_id(&env, 32);
    let id2 = make_id(&env, 33);
    leasing::create_lease(&env, asset2, id2.clone(), lessor, lessee.clone(), 100, 200, 10, 0).unwrap();

    let leases = leasing::get_lessee_leases(&env, lessee);
    assert_eq!(leases.len(), 2);
    assert_eq!(leases.get(0).unwrap(), id1);
    assert_eq!(leases.get(1).unwrap(), id2);
}

#[test]
fn test_get_lessee_leases_empty_for_unknown_address() {
    let env = Env::default();
    let nobody = Address::random(&env);
    let leases = leasing::get_lessee_leases(&env, nobody);
    assert_eq!(leases.len(), 0);
}
