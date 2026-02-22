use crate::insurance::{ClaimStatus, PolicyStatus};
use crate::tests::helpers::*;
use soroban_sdk::testutils::Ledger;

#[test]
fn test_create_insurance_policy_success() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Verify policy was created
    let stored_policy = client.get_insurance_policy(&policy_id);
    assert!(stored_policy.is_some());
    
    let stored = stored_policy.unwrap();
    assert_eq!(stored.policy_id, policy_id);
    assert_eq!(stored.holder, user1);
    assert_eq!(stored.status, PolicyStatus::Active);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_create_insurance_policy_already_exists() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Try to create again - should panic with AssetAlreadyExists
    client.create_insurance_policy(&policy);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_create_insurance_policy_invalid_coverage() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let mut policy = create_test_policy(&env, policy_id, &user1, &insurer, asset_id);
    
    // Invalid: deductible >= coverage_amount
    policy.deductible = 10000;
    policy.coverage_amount = 10000;
    
    env.mock_all_auths();
    
    // Should panic with InvalidPayment error
    client.create_insurance_policy(&policy);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_create_insurance_policy_invalid_dates() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let mut policy = create_test_policy(&env, policy_id, &user1, &insurer, asset_id);
    
    // Invalid: start_date >= end_date
    policy.start_date = 1000;
    policy.end_date = 1000;
    
    env.mock_all_auths();
    
    // Should panic with InvalidPayment error
    client.create_insurance_policy(&policy);
}

#[test]
fn test_cancel_insurance_policy_by_holder() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Cancel by holder
    client.cancel_insurance_policy(&policy_id, &user1);
    
    // Verify policy was cancelled
    let stored_policy = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored_policy.status, PolicyStatus::Cancelled);
}

#[test]
fn test_cancel_insurance_policy_by_insurer() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Cancel by insurer
    client.cancel_insurance_policy(&policy_id, &insurer);
    
    // Verify policy was cancelled
    let stored_policy = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored_policy.status, PolicyStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_cancel_insurance_policy_unauthorized() {
    let env = create_env();
    let (admin, user1, insurer, user3) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // user3 is neither holder nor insurer - should panic with Unauthorized
    client.cancel_insurance_policy(&policy_id, &user3);
}

#[test]
fn test_suspend_insurance_policy() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Suspend policy
    client.suspend_insurance_policy(&policy_id, &insurer);
    
    // Verify policy was suspended
    let stored_policy = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored_policy.status, PolicyStatus::Suspended);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_suspend_insurance_policy_unauthorized() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Holder cannot suspend - should panic with Unauthorized
    client.suspend_insurance_policy(&policy_id, &user1);
}

#[test]
fn test_expire_insurance_policy() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let mut policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    // Set current time to 5000
    env.ledger().with_mut(|li| li.timestamp = 5000);
    
    // Set dates: start now, end in 1000 seconds
    policy.start_date = 5000;
    policy.end_date = 6000;
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Advance time past end_date
    env.ledger().with_mut(|li| li.timestamp = 7000);
    
    // Expire policy (permissionless)
    client.expire_insurance_policy(&policy_id);
    
    // Verify policy was expired
    let stored_policy = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored_policy.status, PolicyStatus::Expired);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_expire_insurance_policy_not_yet_expired() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Should panic with Unauthorized error - end date hasn't passed
    client.expire_insurance_policy(&policy_id);
}

#[test]
fn test_renew_insurance_policy() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    // Renew policy
    let new_end_date = env.ledger().timestamp() + 63072000; // 2 years
    let new_premium = 150i128;
    
    client.renew_insurance_policy(&policy_id, &new_end_date, &new_premium, &insurer);
    
    // Verify policy was renewed
    let stored_policy = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored_policy.end_date, new_end_date);
    assert_eq!(stored_policy.premium, new_premium);
    assert_eq!(stored_policy.status, PolicyStatus::Active);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_renew_insurance_policy_unauthorized() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy);
    
    let new_end_date = env.ledger().timestamp() + 63072000;
    let new_premium = 150i128;
    
    // Holder cannot renew - should panic with Unauthorized
    client.renew_insurance_policy(&policy_id, &new_end_date, &new_premium, &user1);
}

#[test]
fn test_get_asset_insurance_policies() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let asset_id = generate_asset_id(&env, 100);
    let policy_id1 = generate_asset_id(&env, 1);
    let policy_id2 = generate_asset_id(&env, 2);
    
    let policy1 = create_test_policy(&env, policy_id1.clone(), &user1, &insurer, asset_id.clone());
    let policy2 = create_test_policy(&env, policy_id2.clone(), &user1, &insurer, asset_id.clone());
    
    env.mock_all_auths();
    client.create_insurance_policy(&policy1);
    client.create_insurance_policy(&policy2);
    
    // Get all policies for asset
    let policies = client.get_asset_insurance_policies(&asset_id);
    assert_eq!(policies.len(), 2);
}

#[test]
fn test_policy_lifecycle_full() {
    let env = create_env();
    let (admin, user1, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);
    
    let policy_id = generate_asset_id(&env, 1);
    let asset_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &user1, &insurer, asset_id);
    
    env.mock_all_auths();
    
    // Create
    client.create_insurance_policy(&policy);
    let stored = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored.status, PolicyStatus::Active);
    
    // Renew while active
    let new_end_date = env.ledger().timestamp() + 63072000;
    client.renew_insurance_policy(&policy_id, &new_end_date, &150i128, &insurer);
    let stored = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored.status, PolicyStatus::Active);
    assert_eq!(stored.premium, 150);
    
    // Suspend
    client.suspend_insurance_policy(&policy_id, &insurer);
    let stored = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored.status, PolicyStatus::Suspended);
    
    // Cancel from suspended state
    client.cancel_insurance_policy(&policy_id, &user1);
    let stored = client.get_insurance_policy(&policy_id).unwrap();
    assert_eq!(stored.status, PolicyStatus::Cancelled);
}
