#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Address, Env, String, Vec};

#[test]
fn test_batch_transfer_successful() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BatchTokenTransferContract, ());
    let client = BatchTokenTransferContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let asset_id = 1u64;
    let metadata = assetsup::TokenMetadata {
        name: String::from_str(&env, "Batch Asset"),
        description: String::from_str(&env, "Batch transfer test asset"),
        asset_type: assetsup::AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(&env),
    };

    assetsup::tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "BATCH"),
        1000,
        2,
        1,
        sender.clone(),
        metadata,
    )
    .unwrap();

    let recipient1 = Address::generate(&env);
    let recipient2 = Address::generate(&env);
    let transfers: Vec<(Address, i128)> = vec![&env, (recipient1.clone(), 100_i128), (recipient2.clone(), 200_i128)];

    client.batch_transfer_tokens(&asset_id, &transfers).unwrap();

    let sender_balance = assetsup::tokenization::get_token_balance(&env, asset_id, sender.clone()).unwrap();
    assert_eq!(sender_balance, 700);

    let recipient1_balance = assetsup::tokenization::get_token_balance(&env, asset_id, recipient1).unwrap();
    assert_eq!(recipient1_balance, 100);

    let recipient2_balance = assetsup::tokenization::get_token_balance(&env, asset_id, recipient2).unwrap();
    assert_eq!(recipient2_balance, 200);
}

#[test]
fn test_batch_transfer_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BatchTokenTransferContract, ());
    let client = BatchTokenTransferContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let asset_id = 2u64;
    let metadata = assetsup::TokenMetadata {
        name: String::from_str(&env, "Batch Asset"),
        description: String::from_str(&env, "Insufficient balance asset"),
        asset_type: assetsup::AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(&env),
    };

    assetsup::tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "BATCH2"),
        100,
        2,
        1,
        sender.clone(),
        metadata,
    )
    .unwrap();

    let recipient = Address::generate(&env);
    let transfers: Vec<(Address, i128)> = vec![&env, (recipient.clone(), 60_i128), (recipient.clone(), 50_i128)];

    let result = client.batch_transfer_tokens(&asset_id, &transfers);
    assert_eq!(result, Err(ContractError::InsufficientBalance));
}

#[test]
fn test_batch_transfer_limit_exceeded() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BatchTokenTransferContract, ());
    let client = BatchTokenTransferContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let asset_id = 3u64;
    let metadata = assetsup::TokenMetadata {
        name: String::from_str(&env, "Batch Limit Asset"),
        description: String::from_str(&env, "Limit exceeded asset"),
        asset_type: assetsup::AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(&env),
    };

    assetsup::tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "BATCH3"),
        10000,
        2,
        1,
        sender.clone(),
        metadata,
    )
    .unwrap();

    let mut transfers: Vec<(Address, i128)> = Vec::new(&env);
    for _ in 0..51 {
        transfers.push_back((Address::generate(&env), 1_i128));
    }

    let result = client.batch_transfer_tokens(&asset_id, &transfers);
    assert_eq!(result, Err(ContractError::BatchLimitExceeded));
}

#[test]
fn test_batch_transfer_empty_batch() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(BatchTokenTransferContract, ());
    let client = BatchTokenTransferContractClient::new(&env, &contract_id);

    let asset_id = 4u64;
    let sender = Address::generate(&env);
    let metadata = assetsup::TokenMetadata {
        name: String::from_str(&env, "Batch Empty Asset"),
        description: String::from_str(&env, "Empty transfer asset"),
        asset_type: assetsup::AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(&env),
    };

    assetsup::tokenization::tokenize_asset(
        &env,
        asset_id,
        String::from_str(&env, "BATCH4"),
        500,
        2,
        1,
        sender,
        metadata,
    )
    .unwrap();

    let transfers: Vec<(Address, i128)> = Vec::new(&env);
    client.batch_transfer_tokens(&asset_id, &transfers).unwrap();
}
