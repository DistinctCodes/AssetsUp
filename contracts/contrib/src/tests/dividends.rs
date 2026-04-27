use assetsup::types::AssetType;
use assetsup::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup(env: &Env) -> AssetUpContractClient<'_> {
    let admin = Address::generate(env);
    let id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(env, &id);
    env.mock_all_auths();
    client.initialize(&admin);
    client
}

fn tokenize(client: &AssetUpContractClient<'_>, env: &Env, asset_id: u64, tokenizer: &Address) {
    client.tokenize_asset(
        &asset_id,
        &String::from_str(env, "DIV"),
        &1_000_000i128,
        &6u32,
        &100i128,
        tokenizer,
        &String::from_str(env, "Dividend Token"),
        &String::from_str(env, "Dividend test asset"),
        &AssetType::Physical,
    );
}

#[test]
fn test_distribute_and_claim_dividends_single_holder() {
    let env = Env::default();
    let client = setup(&env);
    let holder = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &holder);
    client.enable_revenue_sharing(&1u64);

    client.distribute_dividends(&1u64, &10_000i128);

    let unclaimed = client.get_unclaimed_dividends(&1u64, &holder).unwrap();
    assert_eq!(unclaimed, 10_000);

    let claimed = client.claim_dividends(&1u64, &holder).unwrap();
    assert_eq!(claimed, 10_000);

    // After claiming, unclaimed should be zero
    assert_eq!(client.get_unclaimed_dividends(&1u64, &holder).unwrap(), 0);
}

#[test]
fn test_distribute_dividends_proportional_multiple_holders() {
    let env = Env::default();
    let client = setup(&env);
    let holder_a = Address::generate(&env);
    let holder_b = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &holder_a); // holder_a gets 1_000_000 tokens
    client.enable_revenue_sharing(&1u64);

    // Transfer 250_000 (25%) to holder_b; holder_a retains 750_000 (75%)
    client.transfer_tokens(&1u64, &holder_a, &holder_b, &250_000i128);

    client.distribute_dividends(&1u64, &1_000_000i128);

    let a_unclaimed = client.get_unclaimed_dividends(&1u64, &holder_a).unwrap();
    let b_unclaimed = client.get_unclaimed_dividends(&1u64, &holder_b).unwrap();

    assert_eq!(a_unclaimed, 750_000); // 75%
    assert_eq!(b_unclaimed, 250_000); // 25%
}

#[test]
#[should_panic(expected = "Error(Contract, #26)")]
fn test_claim_dividends_nothing_to_claim() {
    let env = Env::default();
    let client = setup(&env);
    let holder = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &holder);
    client.enable_revenue_sharing(&1u64);

    // No distribution happened — should panic with NoDividendsToClaim (#26)
    client.claim_dividends(&1u64, &holder);
}
