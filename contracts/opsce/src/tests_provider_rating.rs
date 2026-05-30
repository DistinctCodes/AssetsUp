#![cfg(test)]
extern crate std;

use crate::{ContractError, OpsceContract, OpsceContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

struct Fixture {
    env: Env,
    client: OpsceContractClient<'static>,
    owner: Address,
    provider: Address,
    record_id: u64,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(OpsceContract, ());
    let client = OpsceContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let provider = Address::generate(&env);
    let owner = Address::generate(&env);

    client.init(&admin);
    client.register_provider(&provider);

    let record_id: u64 = 1;
    client.record_completed_maintenance(&record_id, &101u64, &owner, &provider);

    Fixture {
        env,
        client,
        owner,
        provider,
        record_id,
    }
}

#[test]
fn rate_provider_valid_rating_updates_running_average() {
    let fx = setup();

    // First rating: 5 stars.
    fx.client
        .rate_provider(&fx.record_id, &5u32, &String::from_str(&fx.env, "Great"));

    let rating = fx.client.get_provider_rating(&fx.provider);
    assert_eq!(rating.total_reviews, 1);
    assert_eq!(rating.average_rating, 500); // 5.00 stars scaled by 100

    // Second rating on a different record: 4 stars => running avg 4.5.
    let record_id2: u64 = 2;
    fx.client
        .record_completed_maintenance(&record_id2, &102u64, &fx.owner, &fx.provider);
    fx.client
        .rate_provider(&record_id2, &4u32, &String::from_str(&fx.env, "Good"));

    let rating = fx.client.get_provider_rating(&fx.provider);
    assert_eq!(rating.total_reviews, 2);
    assert_eq!(rating.average_rating, 450); // (5+4)*100/2 = 450
}

#[test]
fn rate_provider_duplicate_returns_already_rated() {
    let fx = setup();

    fx.client
        .rate_provider(&fx.record_id, &5u32, &String::from_str(&fx.env, "Great"));

    // Re-rating the same record must fail with AlreadyRated.
    let result = fx.client.try_rate_provider(
        &fx.record_id,
        &4u32,
        &String::from_str(&fx.env, "Again"),
    );
    assert!(result.is_err(), "duplicate rating should fail");
    if let Err(Ok(err)) = result {
        let expected = soroban_sdk::Error::from_contract_error(ContractError::AlreadyRated as u32);
        assert_eq!(err, expected);
    }

    // The provider's average must remain at the first rating only.
    let rating = fx.client.get_provider_rating(&fx.provider);
    assert_eq!(rating.total_reviews, 1);
    assert_eq!(rating.average_rating, 500);
}

#[test]
fn rate_provider_rejects_rating_below_one() {
    let fx = setup();

    let result =
        fx.client
            .try_rate_provider(&fx.record_id, &0u32, &String::from_str(&fx.env, ""));
    assert!(result.is_err(), "rating 0 should fail");
    if let Err(Ok(err)) = result {
        let expected = soroban_sdk::Error::from_contract_error(ContractError::InvalidRating as u32);
        assert_eq!(err, expected);
    }

    // No state change occurred.
    let rating = fx.client.get_provider_rating(&fx.provider);
    assert_eq!(rating.total_reviews, 0);
    assert_eq!(rating.average_rating, 0);
}

#[test]
fn rate_provider_rejects_rating_above_five() {
    let fx = setup();

    let result =
        fx.client
            .try_rate_provider(&fx.record_id, &6u32, &String::from_str(&fx.env, ""));
    assert!(result.is_err(), "rating 6 should fail");
    if let Err(Ok(err)) = result {
        let expected = soroban_sdk::Error::from_contract_error(ContractError::InvalidRating as u32);
        assert_eq!(err, expected);
    }

    let rating = fx.client.get_provider_rating(&fx.provider);
    assert_eq!(rating.total_reviews, 0);
    assert_eq!(rating.average_rating, 0);
}
