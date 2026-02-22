#![cfg(test)]

extern crate std;

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, Env};

use crate::insurance::{self, InsurancePolicy, PolicyStatus, PolicyType};
use crate::AssetUpContract;

fn create_test_policy(
    env: &Env,
    policy_id: BytesN<32>,
    holder: Address,
    insurer: Address,
    asset_id: BytesN<32>,
) -> InsurancePolicy {
    let current_time = env.ledger().timestamp();
    InsurancePolicy {
        policy_id,
        holder,
        insurer,
        asset_id,
        policy_type: PolicyType::Comprehensive,
        coverage_amount: 100000,
        deductible: 5000,
        premium: 1000,
        start_date: current_time,
        end_date: current_time + 365 * 24 * 60 * 60, // 1 year from now
        status: PolicyStatus::Active,
        auto_renew: false,
        last_payment: current_time,
    }
}

#[test]
fn test_create_policy_success() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let result = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        insurance::create_policy(env.clone(), policy)
    });

    assert!(result.is_ok());
}

#[test]
fn test_create_policy_invalid_dates() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let result = env.as_contract(&contract_id, || {
        let mut policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        // Set end_date same as start_date (invalid - must be after)
        policy.end_date = policy.start_date;
        insurance::create_policy(env.clone(), policy)
    });

    assert!(result.is_err());
}

#[test]
fn test_create_policy_invalid_coverage() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let result = env.as_contract(&contract_id, || {
        let mut policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        // Set deductible >= coverage_amount (invalid)
        policy.deductible = policy.coverage_amount;
        insurance::create_policy(env.clone(), policy)
    });

    assert!(result.is_err());
}

#[test]
fn test_cancel_policy_by_holder() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (create_ok, cancel_ok, final_status) = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder.clone(), insurer, asset_id);
        let create_result = insurance::create_policy(env.clone(), policy).is_ok();

        let cancel_result =
            insurance::cancel_policy(env.clone(), policy_id.clone(), holder.clone()).is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone());
        let status = final_policy.map(|p| p.status);

        (create_result, cancel_result, status)
    });

    assert!(create_ok);
    assert!(cancel_ok);
    assert_eq!(final_status, Some(PolicyStatus::Cancelled));
}

#[test]
fn test_cancel_policy_by_insurer() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (create_ok, cancel_ok, final_status) = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer.clone(), asset_id);
        let create_result = insurance::create_policy(env.clone(), policy).is_ok();

        let cancel_result =
            insurance::cancel_policy(env.clone(), policy_id.clone(), insurer.clone()).is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone());
        let status = final_policy.map(|p| p.status);

        (create_result, cancel_result, status)
    });

    assert!(create_ok);
    assert!(cancel_ok);
    assert_eq!(final_status, Some(PolicyStatus::Cancelled));
}

#[test]
fn test_cancel_policy_unauthorized() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let cancel_err = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        insurance::create_policy(env.clone(), policy).unwrap();

        insurance::cancel_policy(env.clone(), policy_id.clone(), unauthorized.clone()).is_err()
    });

    assert!(cancel_err);
}

#[test]
fn test_suspend_policy() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (create_ok, suspend_ok, final_status) = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer.clone(), asset_id);
        let create_result = insurance::create_policy(env.clone(), policy).is_ok();

        let suspend_result =
            insurance::suspend_policy(env.clone(), policy_id.clone(), insurer.clone()).is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone());
        let status = final_policy.map(|p| p.status);

        (create_result, suspend_result, status)
    });

    assert!(create_ok);
    assert!(suspend_ok);
    assert_eq!(final_status, Some(PolicyStatus::Suspended));
}

#[test]
fn test_suspend_policy_unauthorized() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let suspend_err = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        insurance::create_policy(env.clone(), policy).unwrap();

        insurance::suspend_policy(env.clone(), policy_id.clone(), unauthorized.clone()).is_err()
    });

    assert!(suspend_err);
}

#[test]
fn test_expire_policy_before_end_date() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let expire_err = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        insurance::create_policy(env.clone(), policy).unwrap();

        // Try to expire before end_date (should fail)
        insurance::expire_policy(env.clone(), policy_id.clone()).is_err()
    });

    assert!(expire_err);
}

#[test]
fn test_expire_policy_after_end_date() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (expire_ok, final_status) = env.as_contract(&contract_id, || {
        // Set initial time
        env.ledger().with_mut(|li| {
            li.timestamp = 1000;
        });

        let mut policy = create_test_policy(&env, policy_id.clone(), holder, insurer, asset_id);
        // Set policy to expire at timestamp 2000
        policy.start_date = 1000;
        policy.end_date = 2000;
        insurance::create_policy(env.clone(), policy).unwrap();

        // Advance time past end_date
        env.ledger().with_mut(|li| {
            li.timestamp = 2500;
        });

        let expire_result = insurance::expire_policy(env.clone(), policy_id.clone()).is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone());
        let status = final_policy.map(|p| p.status);

        (expire_result, status)
    });

    assert!(expire_ok);
    assert_eq!(final_status, Some(PolicyStatus::Expired));
}

#[test]
fn test_renew_policy() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (renew_ok, final_status, new_end_date, new_premium) = env.as_contract(&contract_id, || {
        let policy = create_test_policy(&env, policy_id.clone(), holder, insurer.clone(), asset_id);
        insurance::create_policy(env.clone(), policy).unwrap();

        let new_end = 2000u64;
        let new_prem = 1500i128;
        let renew_result = insurance::renew_policy(
            env.clone(),
            policy_id.clone(),
            new_end,
            new_prem,
            insurer.clone(),
        )
        .is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone()).unwrap();

        (
            renew_result,
            final_policy.status,
            final_policy.end_date,
            final_policy.premium,
        )
    });

    assert!(renew_ok);
    assert_eq!(final_status, PolicyStatus::Active);
    assert_eq!(new_end_date, 2000u64);
    assert_eq!(new_premium, 1500i128);
}

#[test]
fn test_renew_expired_policy() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (renew_ok, final_status) = env.as_contract(&contract_id, || {
        // Set initial time
        env.ledger().with_mut(|li| {
            li.timestamp = 1000;
        });

        let mut policy = create_test_policy(&env, policy_id.clone(), holder, insurer.clone(), asset_id);
        // Set policy to expire at timestamp 2000
        policy.start_date = 1000;
        policy.end_date = 2000;
        insurance::create_policy(env.clone(), policy).unwrap();

        // Advance time past end_date
        env.ledger().with_mut(|li| {
            li.timestamp = 2500;
        });

        // Expire the policy first
        insurance::expire_policy(env.clone(), policy_id.clone()).unwrap();

        // Now renew it to timestamp 3500
        let renew_result = insurance::renew_policy(
            env.clone(),
            policy_id.clone(),
            3500,
            1500,
            insurer.clone(),
        )
        .is_ok();

        let final_policy = insurance::get_policy(env.clone(), policy_id.clone()).unwrap();

        (renew_result, final_policy.status)
    });

    assert!(renew_ok);
    assert_eq!(final_status, PolicyStatus::Active);
}

#[test]
fn test_get_asset_policies() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id1 = BytesN::from_array(&env, &[2u8; 32]);
    let policy_id2 = BytesN::from_array(&env, &[3u8; 32]);

    let policy_count = env.as_contract(&contract_id, || {
        // Create two policies for the same asset
        let policy1 = create_test_policy(
            &env,
            policy_id1.clone(),
            holder.clone(),
            insurer.clone(),
            asset_id.clone(),
        );
        let policy2 = create_test_policy(
            &env,
            policy_id2.clone(),
            holder.clone(),
            insurer.clone(),
            asset_id.clone(),
        );

        insurance::create_policy(env.clone(), policy1).unwrap();
        insurance::create_policy(env.clone(), policy2).unwrap();

        let policies = insurance::get_asset_policies(env.clone(), asset_id.clone());
        policies.len()
    });

    assert_eq!(policy_count, 2);
}

#[test]
fn test_status_transition_validation() {
    let env = Env::default();
    let contract_id = env.register(AssetUpContract, ());
    let holder = Address::generate(&env);
    let insurer = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);

    let (suspend_ok, cancel_after_suspend_ok, suspend_cancelled_err) =
        env.as_contract(&contract_id, || {
            let policy =
                create_test_policy(&env, policy_id.clone(), holder.clone(), insurer.clone(), asset_id);
            insurance::create_policy(env.clone(), policy).unwrap();

            // Active -> Suspended (should work)
            let suspend_result =
                insurance::suspend_policy(env.clone(), policy_id.clone(), insurer.clone()).is_ok();

            // Suspended -> Cancelled (should work)
            let cancel_result =
                insurance::cancel_policy(env.clone(), policy_id.clone(), holder.clone()).is_ok();

            // Cancelled -> Suspended (should fail)
            let suspend_again_result =
                insurance::suspend_policy(env.clone(), policy_id.clone(), insurer.clone()).is_err();

            (suspend_result, cancel_result, suspend_again_result)
        });

    assert!(suspend_ok);
    assert!(cancel_after_suspend_ok);
    assert!(suspend_cancelled_err);
}
