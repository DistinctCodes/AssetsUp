#![cfg(test)]

use crate::{ContribContract, ContribContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
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
fn test_authorized_oracle_updates_valuation() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let oracle = Address::generate(&env);
    let currency = String::from_str(&env, "USD");

    client.add_oracle(&admin, &oracle);

    env.ledger().with_mut(|li| li.timestamp = 10_000);
    client.update_valuation(&oracle, &1, &50_000, &currency);

    let latest = client.get_latest_valuation(&1);
    assert_eq!(latest.asset_id, 1);
    assert_eq!(latest.value, 50_000);
    assert_eq!(latest.currency, currency);
    assert_eq!(latest.source, oracle);
    assert_eq!(latest.timestamp, 10_000);
}

#[test]
#[should_panic(expected = "Unauthorized oracle")]
fn test_unauthorized_source_rejected() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let unauthorized = Address::generate(&env);
    let currency = String::from_str(&env, "USD");

    client.update_valuation(&unauthorized, &1, &50_000, &currency);
}

#[test]
#[should_panic(expected = "Unauthorized oracle")]
fn test_removed_oracle_rejected() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let oracle = Address::generate(&env);
    let currency = String::from_str(&env, "USD");

    client.add_oracle(&admin, &oracle);
    client.remove_oracle(&admin, &oracle);
    client.update_valuation(&oracle, &1, &1_000, &currency);
}

#[test]
fn test_valuation_history_retains_last_ten() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let oracle = Address::generate(&env);
    let currency = String::from_str(&env, "USD");

    client.add_oracle(&admin, &oracle);

    for i in 1..=12i128 {
        env.ledger().with_mut(|li| li.timestamp = i as u64 * 1000);
        client.update_valuation(&oracle, &2, &(i * 1000), &currency);
    }

    let history = client.get_valuation_history(&2);
    assert_eq!(history.len(), 10);
    assert_eq!(history.get(0).unwrap().value, 3000);
    assert_eq!(history.last().unwrap().value, 12000);
}
