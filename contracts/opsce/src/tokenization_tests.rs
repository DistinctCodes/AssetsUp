use crate::{AssetUpContract, AssetUpContractClient, AssetType, Error, TokenMetadata};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn make_metadata(env: &Env) -> TokenMetadata {
    TokenMetadata {
        name: String::from_str(env, "AssetToken"),
        description: String::from_str(env, "Tokenized asset for testing"),
        asset_type: AssetType::Digital,
        ipfs_uri: None,
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(env),
    }
}

#[test]
fn test_tokenize_asset_success_and_retokenization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin = Address::random(&env);
    let tokenizer = Address::random(&env);

    client.initialize(&admin);

    let asset_id = 1u64;
    let symbol = String::from_str(&env, "TEST");
    let metadata = make_metadata(&env);

    let tokenized = client
        .tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata)
        .unwrap();

    assert_eq!(tokenized.asset_id, asset_id);
    assert_eq!(tokenized.total_supply, 1_000i128);
    assert_eq!(tokenized.tokenizer, tokenizer);

    let retry = client.tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata);
    assert_eq!(retry, Err(Error::AssetAlreadyTokenized));
}

#[test]
fn test_mint_tokens_success_and_max_supply_exceeded_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin = Address::random(&env);
    let tokenizer = Address::random(&env);

    client.initialize(&admin);

    let asset_id = 2u64;
    let symbol = String::from_str(&env, "MINT");
    let metadata = make_metadata(&env);

    client
        .tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata)
        .unwrap();

    let minted = client.mint_tokens(&asset_id, &500i128, &tokenizer).unwrap();
    assert_eq!(minted.total_supply, 1_500i128);

    let overflow_amount = i128::MAX - 1_500i128 + 1;
    let result = client.mint_tokens(&asset_id, &overflow_amount, &tokenizer);
    assert_eq!(result, Err(Error::MaxSupplyExceeded));
}

#[test]
fn test_burn_tokens_success_and_insufficient_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin = Address::random(&env);
    let tokenizer = Address::random(&env);

    client.initialize(&admin);

    let asset_id = 3u64;
    let symbol = String::from_str(&env, "BURN");
    let metadata = make_metadata(&env);

    client
        .tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata)
        .unwrap();

    let burned = client.burn_tokens(&asset_id, &200i128, &tokenizer).unwrap();
    assert_eq!(burned.total_supply, 800i128);

    let result = client.burn_tokens(&asset_id, &1_000i128, &tokenizer);
    assert_eq!(result, Err(Error::InsufficientBalance));
}

#[test]
fn test_transfer_tokens_success_insufficient_balance_and_self_transfer_prevented() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin = Address::random(&env);
    let tokenizer = Address::random(&env);
    let holder = Address::random(&env);

    client.initialize(&admin);

    let asset_id = 4u64;
    let symbol = String::from_str(&env, "XFER");
    let metadata = make_metadata(&env);

    client
        .tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata)
        .unwrap();

    client
        .transfer_tokens(&asset_id, &tokenizer, &holder, &300i128)
        .unwrap();

    let balance = client.get_token_balance(&asset_id, &holder).unwrap();
    assert_eq!(balance, 300i128);

    let fail_balance = client.transfer_tokens(&asset_id, &holder, &tokenizer, &500i128);
    assert_eq!(fail_balance, Err(Error::InsufficientBalance));

    let self_transfer = client.transfer_tokens(&asset_id, &holder, &holder, &100i128);
    assert_eq!(self_transfer, Err(Error::InvalidTokenTransfer));
}

#[test]
fn test_get_token_balance_returns_correct_value_after_mints_and_transfers() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(&env, &contract_id);
    let admin = Address::random(&env);
    let tokenizer = Address::random(&env);
    let recipient = Address::random(&env);

    client.initialize(&admin);

    let asset_id = 5u64;
    let symbol = String::from_str(&env, "BAL");
    let metadata = make_metadata(&env);

    client
        .tokenize_asset(&asset_id, &symbol, &1_000i128, &8u32, &10i128, &tokenizer, &metadata)
        .unwrap();

    client.mint_tokens(&asset_id, &200i128, &tokenizer).unwrap();
    client.transfer_tokens(&asset_id, &tokenizer, &recipient, &250i128).unwrap();
    client.transfer_tokens(&asset_id, &recipient, &tokenizer, &50i128).unwrap();

    assert_eq!(client.get_token_balance(&asset_id, &tokenizer).unwrap(), 1_000i128 - 250i128 + 50i128 + 200i128);
    assert_eq!(client.get_token_balance(&asset_id, &recipient).unwrap(), 200i128);
}
