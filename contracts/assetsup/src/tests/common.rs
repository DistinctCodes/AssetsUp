#![cfg(test)]

extern crate std;
use soroban_sdk::{
    testutils::Address as _,
    token,
    vec,
    Address, Env
};

use crate::{AssetUpContractClient, AssetUpContract};

/// Helper to set up the contract and environment specifically for subscription tests.
pub fn setup_subscription_test_env()->(Env, AssetUpContractClient<'static>, Address, token::Client) {
    let env = Env::default();
    env.mock_all_auths();

    //set ledger state for predictable date/time logic
    env.ledger().set_sequence(100);
    env.ledger().set_close_time_resolution(5); // 5 seconds per ledger
    
    let contract_id = env.register_contract(None, AssetUpContract);
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin= Address::generate(&env);

    //Initialize contract
    client.initialize(&admin);

    //MOck token setup(USDC)
    let admin = Address::generate(&env);
    // Use token::StellarAsset for a standard token mock 
    let token_contract_id = env.register_contract_wasm(&token_admin, token::StellarAssetContract);
    let token_client=token::Client::new(&env, &token_contract_id);

    (env,client,admin, token_client)

}