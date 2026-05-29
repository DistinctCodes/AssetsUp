#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

#[test]
fn test_file_insurance_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InsuranceClaimContract, ());
    let client = InsuranceClaimContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let policy_id = BytesN::from_array(&env, &[2u8; 32]);
    let description = String::from_str(&env, "Broken window");

    let claim_id = client
        .file_insurance_claim(&asset_id, &policy_id, &100, &description)
        .unwrap();

    let claim = client.get_insurance_claim(&claim_id).unwrap();
    assert_eq!(claim.asset_id, asset_id);
    assert_eq!(claim.policy_id, policy_id);
    assert_eq!(claim.amount, 100);
    assert_eq!(claim.description, description);
    assert_eq!(claim.status, ClaimStatus::Pending);
}

#[test]
fn test_settle_claim_approve() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InsuranceClaimContract, ());
    let client = InsuranceClaimContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    let asset_id = BytesN::from_array(&env, &[3u8; 32]);
    let policy_id = BytesN::from_array(&env, &[4u8; 32]);
    let claim_id = client
        .file_insurance_claim(&asset_id, &policy_id, &200, &String::from_str(&env, "Theft"))
        .unwrap();

    client.settle_claim(&claim_id, &true, &150).unwrap();

    let claim = client.get_insurance_claim(&claim_id).unwrap();
    assert_eq!(claim.status, ClaimStatus::Paid);
    assert_eq!(claim.payout_amount, 150);
}

#[test]
fn test_settle_claim_reject() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InsuranceClaimContract, ());
    let client = InsuranceClaimContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    let asset_id = BytesN::from_array(&env, &[5u8; 32]);
    let policy_id = BytesN::from_array(&env, &[6u8; 32]);
    let claim_id = client
        .file_insurance_claim(&asset_id, &policy_id, &50, &String::from_str(&env, "Damage"))
        .unwrap();

    client.settle_claim(&claim_id, &false, &0).unwrap();

    let claim = client.get_insurance_claim(&claim_id).unwrap();
    assert_eq!(claim.status, ClaimStatus::Rejected);
    assert_eq!(claim.payout_amount, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_settle_claim_invalid_caller() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InsuranceClaimContract, ());
    let client = InsuranceClaimContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.init(&admin);

    let asset_id = BytesN::from_array(&env, &[7u8; 32]);
    let policy_id = BytesN::from_array(&env, &[8u8; 32]);
    let claim_id = client
        .file_insurance_claim(&asset_id, &policy_id, &75, &String::from_str(&env, "Water damage"))
        .unwrap();

    // Clear auths so the settle_claim call fails for admin authorization
    env.reset_auths();
    client.settle_claim(&claim_id, &true, &75).unwrap();
}
