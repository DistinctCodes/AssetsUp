use assetsup::AssetType;
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
        &String::from_str(env, "DTK"),
        &1_000_000i128,
        &6u32,
        &100i128,
        tokenizer,
        &String::from_str(env, "Detokenize Token"),
        &String::from_str(env, "Detokenization test asset"),
        &AssetType::Physical,
    );
}

#[test]
fn test_execute_detokenization_end_to_end() {
    let env = Env::default();
    let client = setup(&env);
    let proposer = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &proposer);

    // Propose detokenization
    let proposal_id = client.propose_detokenization(&1u64, &proposer);
    assert!(client.is_detokenization_active(&1u64));

    // proposer holds 100% — cast vote so proposal passes
    client.cast_vote(&1u64, &proposal_id, &proposer);
    assert!(client.proposal_passed(&1u64, &proposal_id));

    // Execute detokenization
    client.execute_detokenization(&1u64, &proposal_id);

    // Asset should no longer be tokenized
    assert!(!client.is_detokenization_active(&1u64));
}

#[test]
#[should_panic(expected = "Error(Contract, #28)")]
fn test_execute_detokenization_without_votes_panics() {
    let env = Env::default();
    let client = setup(&env);
    let proposer = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &proposer);

    let proposal_id = client.propose_detokenization(&1u64, &proposer);

    // No votes cast — should panic with DetokenizationNotApproved (#28)
    client.execute_detokenization(&1u64, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #29)")]
fn test_propose_detokenization_duplicate_panics() {
    let env = Env::default();
    let client = setup(&env);
    let proposer = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &proposer);

    client.propose_detokenization(&1u64, &proposer);
    // Second proposal on same active asset should panic with DetokenizationAlreadyProposed (#29)
    client.propose_detokenization(&1u64, &proposer);
}
