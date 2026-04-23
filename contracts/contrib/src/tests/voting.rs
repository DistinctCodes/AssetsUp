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
        &String::from_str(env, "VOT"),
        &1_000_000i128,
        &6u32,
        &100i128,
        tokenizer,
        &String::from_str(env, "Vote Token"),
        &String::from_str(env, "Voting test asset"),
        &AssetType::Physical,
    );
}

#[test]
fn test_cast_vote_success() {
    let env = Env::default();
    let client = setup(&env);
    let voter = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &voter);

    client.cast_vote(&1u64, &1u64, &voter);

    assert!(client.has_voted(&1u64, &1u64, &voter).unwrap());
    assert_eq!(client.get_vote_tally(&1u64, &1u64).unwrap(), 1_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #22)")]
fn test_cast_vote_double_vote_panics() {
    let env = Env::default();
    let client = setup(&env);
    let voter = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &voter);

    client.cast_vote(&1u64, &1u64, &voter);
    // second vote must panic with AlreadyVoted (#22)
    client.cast_vote(&1u64, &1u64, &voter);
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")]
fn test_cast_vote_below_threshold_panics() {
    let env = Env::default();
    let client = setup(&env);
    let tokenizer = Address::generate(&env);
    let low_voter = Address::generate(&env);

    env.mock_all_auths();
    // min_voting_threshold = 500_000; low_voter gets only 50 tokens
    client.tokenize_asset(
        &1u64,
        &String::from_str(&env, "VOT"),
        &1_000_000i128,
        &6u32,
        &500_000i128, // high threshold
        &tokenizer,
        &String::from_str(&env, "Vote Token"),
        &String::from_str(&env, "Voting test asset"),
        &AssetType::Physical,
    );

    // Transfer a tiny amount to low_voter
    client.transfer_tokens(&1u64, &tokenizer, &low_voter, &50i128);

    // low_voter has 50 tokens, threshold is 500_000 — should panic with InsufficientVotingPower (#21)
    client.cast_vote(&1u64, &1u64, &low_voter);
}

#[test]
fn test_proposal_passed_with_majority() {
    let env = Env::default();
    let client = setup(&env);
    let voter = Address::generate(&env);

    env.mock_all_auths();
    tokenize(&client, &env, 1, &voter);

    client.cast_vote(&1u64, &1u64, &voter);

    // voter holds 100% of supply — proposal must pass
    assert!(client.proposal_passed(&1u64, &1u64).unwrap());
}
