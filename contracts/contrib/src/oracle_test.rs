#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String};

#[test]
fn test_add_remove_oracle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let oracle = Address::generate(&env);
    
    client.add_oracle(&oracle);
    
    // Test that the oracle was added by trying to update valuation
    let asset_id = 1;
    let currency = String::from_str(&env, "USD");
    client.update_valuation(&oracle, &asset_id, &1000, &currency);
    
    // Now remove and verify it panics on update
    client.remove_oracle(&oracle);
}

#[test]
#[should_panic(expected = "Unauthorized oracle")]
fn test_remove_oracle_enforcement() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let oracle = Address::generate(&env);
    client.add_oracle(&oracle);
    client.remove_oracle(&oracle);

    let asset_id = 1;
    let currency = String::from_str(&env, "USD");
    client.update_valuation(&oracle, &asset_id, &1000, &currency);
}

#[test]
fn test_update_valuation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let oracle = Address::generate(&env);
    client.add_oracle(&oracle);

    let asset_id = 1;
    let currency = String::from_str(&env, "USD");
    
    env.ledger().with_mut(|li| {
        li.timestamp = 10000;
    });

    client.update_valuation(&oracle, &asset_id, &50000, &currency);
    
    let latest = client.get_latest_valuation(&asset_id);
    assert_eq!(latest.asset_id, asset_id);
    assert_eq!(latest.value, 50000);
    assert_eq!(latest.currency, currency);
    assert_eq!(latest.source, oracle);
    assert_eq!(latest.timestamp, 10000);
}

#[test]
#[should_panic(expected = "Unauthorized oracle")]
fn test_unauthorized_oracle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let unauthorized = Address::generate(&env);
    let currency = String::from_str(&env, "USD");
    
    client.update_valuation(&unauthorized, &1, &50000, &currency);
}

#[test]
fn test_valuation_history_limit() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);
    
    client.init(&admin);

    let oracle = Address::generate(&env);
    client.add_oracle(&oracle);

    let asset_id = 2;
    let currency = String::from_str(&env, "USD");
    
    // Add 12 valuations
    for i in 1..=12 {
        env.ledger().with_mut(|li| {
            li.timestamp = i as u64 * 1000;
        });
        client.update_valuation(&oracle, &asset_id, &(i * 1000), &currency);
    }
    
    let history = client.get_valuation_history(&asset_id);
    
    // History should only retain the last 10 entries
    assert_eq!(history.len(), 10);
    
    // Check that the earliest retained is the 3rd one, meaning 1 and 2 were popped
    assert_eq!(history.get(0).unwrap().value, 3000);
    assert_eq!(history.last().unwrap().value, 12000);
}
