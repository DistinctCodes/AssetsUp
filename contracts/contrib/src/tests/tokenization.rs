use assetsup::types::AssetType;
use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup(env: &Env) -> (AssetUpContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(env, &id);
    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

fn tokenize(client: &AssetUpContractClient<'_>, env: &Env, asset_id: u64, tokenizer: &Address) {
    client.tokenize_asset(
        &asset_id,
        &String::from_str(env, "TST"),
        &1_000_000i128,
        &6u32,
        &100i128,
        tokenizer,
        &String::from_str(env, "Test Token"),
        &String::from_str(env, "A tokenized asset"),
        &AssetType::Physical,
    );
}

#[test]
fn test_tokenize_asset_success() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let tokenizer = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &tokenizer);

    let asset = client.get_tokenized_asset(&1u64);
    assert_eq!(asset.asset_id, 1);
    assert_eq!(asset.total_supply, 1_000_000);
    assert_eq!(asset.tokenizer, tokenizer);
    assert_eq!(asset.tokens_in_circulation, 1_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_tokenize_asset_already_tokenized() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let tokenizer = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &tokenizer);
    // second call must panic with AssetAlreadyTokenized (#10)
    tokenize(&client, &env, 1, &tokenizer);
}

#[test]
fn test_transfer_tokens_success() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &from);

    client.transfer_tokens(&1u64, &from, &to, &400_000i128);

    assert_eq!(client.get_token_balance(&1u64, &from).unwrap(), 600_000);
    assert_eq!(client.get_token_balance(&1u64, &to).unwrap(), 400_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_transfer_tokens_insufficient_balance() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &from);

    // Try to transfer more than balance — should panic with InsufficientBalance (#14)
    client.transfer_tokens(&1u64, &from, &to, &2_000_000i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn test_transfer_tokens_blacklisted_recipient() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let from = Address::generate(&env);
    let blocked = Address::generate(&env);
    let allowed = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &from);

    // Add only `allowed` to whitelist — `blocked` is not listed
    client.add_to_whitelist(&1u64, &allowed);

    // Transfer to non-whitelisted address should panic with TransferRestrictionFailed (#17)
    client.transfer_tokens(&1u64, &from, &blocked, &100_000i128);
}
