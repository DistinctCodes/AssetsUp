#![cfg(test)]

extern crate std;

use crate::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{Address, Env, testutils::Address as _};

/// Setup text environment with contract and addresses

pub fn setup_test_environment() -> (Env, AssetUpContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AssetUpContract);
    let client = AssetUpContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (env, client, admin)
}

#[test]
fn test_initialize() {
    let (_env, client, admin) = setup_test_environment();
    client.initialize(&admin);
    let saved_admin = client.get_admin();

    assert_eq!(admin, saved_admin);
}

#[test]
#[should_panic(expected="Contract is already initialized")]
fn test_initialize_panic() {
    let (_env, client, admin) = setup_test_environment();
    client.initialize(&admin);
    client.initialize(&admin);
}