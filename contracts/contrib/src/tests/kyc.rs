#![cfg(test)]

use crate::kyc::KycStatus;
use crate::{ContribContract, ContribContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

fn setup_test(env: &Env) -> (ContribContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_submit_kyc_starts_pending() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let user = Address::generate(&env);

    client.submit_kyc(&user);

    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Pending);
    assert_eq!(record.tier, 0);
    assert!(!client.is_kyc_approved(&user));
}

#[test]
fn test_admin_approves_kyc() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let user = Address::generate(&env);

    env.ledger().with_mut(|li| li.timestamp = 10_000);
    client.submit_kyc(&user);

    let expires_at = 20_000;
    client.approve_kyc(&admin, &user, &2, &expires_at);

    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Approved);
    assert_eq!(record.tier, 2);
    assert_eq!(record.verified_at, 10_000);
    assert_eq!(record.expires_at, expires_at);
    assert!(client.is_kyc_approved(&user));
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_non_admin_cannot_approve_kyc() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let impostor = Address::generate(&env);
    let user = Address::generate(&env);

    client.submit_kyc(&user);
    client.approve_kyc(&impostor, &user, &1, &20_000);
}

#[test]
fn test_kyc_approval_expires() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let user = Address::generate(&env);

    env.ledger().with_mut(|li| li.timestamp = 10_000);
    client.approve_kyc(&admin, &user, &1, &20_000);
    assert!(client.is_kyc_approved(&user));

    env.ledger().with_mut(|li| li.timestamp = 20_001);
    assert!(!client.is_kyc_approved(&user));
}

#[test]
fn test_admin_revokes_kyc() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let user = Address::generate(&env);

    client.approve_kyc(&admin, &user, &1, &20_000);
    assert!(client.is_kyc_approved(&user));

    client.revoke_kyc(&admin, &user);

    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Revoked);
    assert!(!client.is_kyc_approved(&user));
}
