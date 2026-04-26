#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

#[test]
fn test_submit_kyc() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, KycContract);
    let client = KycContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let user = Address::generate(&env);
    
    client.submit_kyc(&user);
    
    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Pending);
    assert_eq!(record.tier, 0);
    assert_eq!(client.is_kyc_approved(&user), false);
}

#[test]
fn test_approve_kyc() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, KycContract);
    let client = KycContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let user = Address::generate(&env);
    
    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    client.submit_kyc(&user);
    
    let expires_at = 20000;
    let tier = 2; // accredited
    
    client.approve_kyc(&user, &tier, &expires_at);
    
    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Approved);
    assert_eq!(record.tier, tier);
    assert_eq!(record.verified_at, 10000);
    assert_eq!(record.expires_at, expires_at);
    
    assert_eq!(client.is_kyc_approved(&user), true);
}

#[test]
fn test_is_kyc_approved_expiration() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, KycContract);
    let client = KycContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let user = Address::generate(&env);
    
    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    let expires_at = 20000;
    client.approve_kyc(&user, &1, &expires_at);
    
    assert_eq!(client.is_kyc_approved(&user), true);
    
    // Fast forward time past expiration
    env.ledger().with_mut(|li| {
        li.timestamp = 20001;
    });
    
    assert_eq!(client.is_kyc_approved(&user), false);
}

#[test]
fn test_revoke_kyc() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, KycContract);
    let client = KycContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let user = Address::generate(&env);
    
    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    client.approve_kyc(&user, &1, &20000);
    assert_eq!(client.is_kyc_approved(&user), true);
    
    client.revoke_kyc(&user);
    
    let record = client.get_kyc_record(&user);
    assert_eq!(record.status, KycStatus::Revoked);
    assert_eq!(client.is_kyc_approved(&user), false);
}
