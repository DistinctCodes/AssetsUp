//! Dividend payouts (#1785), funded and authorized distributions (#1784),
//! and valuation authorization (#1783).
//!
//! These exercise the public entrypoints with a real Stellar Asset Contract so
//! the token movements are observable. The negative tests deliberately run
//! without `mock_all_auths`, because with all auths mocked an entrypoint that
//! never called `require_auth` would be indistinguishable from one that does.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, Env, IntoVal, String};

use super::helpers::{create_env, create_mock_addresses, initialize_contract, register_asset_for};
use crate::error::Error;
use crate::types::AssetType;
use crate::AssetUpContractClient;

const TOKEN_ID: u64 = 42;
const SUPPLY: i128 = 1_000;

/// Initialize with a tokenized asset, revenue sharing enabled, and (optionally)
/// a funded Stellar Asset Contract configured as the payment token.
fn setup(
    env: &Env,
    with_token: bool,
) -> (
    AssetUpContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
) {
    let (admin, tokenizer, holder, _) = create_mock_addresses(env);
    let client = initialize_contract(env, &admin);
    env.mock_all_auths();

    let registry_id = register_asset_for(env, &client, &admin, &tokenizer, 7);
    client.tokenize_asset(
        &TOKEN_ID,
        &registry_id,
        &String::from_str(env, "DIV"),
        &SUPPLY,
        &2u32,
        &1i128,
        &tokenizer,
        &String::from_str(env, "Dividend token"),
        &String::from_str(env, "A token with dividends"),
        &AssetType::Physical,
    );
    client.enable_revenue_sharing(&TOKEN_ID, &tokenizer);

    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    if with_token {
        client.set_dividend_token(&TOKEN_ID, &token, &tokenizer);
    }

    (client, admin, tokenizer, holder, token)
}

// ---------------------------------------------------------------------------
// #1785 — claims pay real tokens and zero the ledger
// ---------------------------------------------------------------------------

#[test]
fn claim_transfers_dividend_tokens_and_zeroes_the_ledger() {
    let env = create_env();
    let (client, _admin, tokenizer, holder, token) = setup(&env, true);
    let token_client = TokenClient::new(&env, &token);
    let sac = StellarAssetClient::new(&env, &token);

    // Split the supply so both the tokenizer and the holder are entitled.
    client.transfer_tokens(&TOKEN_ID, &tokenizer, &holder, &(SUPPLY / 2));
    sac.mint(&tokenizer, &1_000i128);
    client.distribute_dividends(&TOKEN_ID, &1_000i128, &tokenizer);

    let holder_before = token_client.balance(&holder);
    let contract_before = token_client.balance(&client.address);

    let claimed = client.claim_dividends(&TOKEN_ID, &holder);

    assert_eq!(claimed, 500);
    assert_eq!(client.get_unclaimed_dividends(&TOKEN_ID, &holder), 0);
    assert_eq!(token_client.balance(&holder), holder_before + 500);
    assert_eq!(token_client.balance(&client.address), contract_before - 500);
}

#[test]
fn failed_payout_reverts_and_keeps_unclaimed_dividends() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder, _token) = setup(&env, true);

    // Credit the sole holder through the module path without moving any real
    // funds into the contract, so the payout transfer must fail.
    env.as_contract(&client.address, || {
        crate::dividends::distribute_dividends(&env, TOKEN_ID, 1_000i128).unwrap();
    });

    let before = client.get_unclaimed_dividends(&TOKEN_ID, &tokenizer);
    assert_eq!(before, 1_000);
    assert!(client.try_claim_dividends(&TOKEN_ID, &tokenizer).is_err());
    assert_eq!(
        client.get_unclaimed_dividends(&TOKEN_ID, &tokenizer),
        before,
        "a failed transfer must not clear the holder's ledger"
    );
}

// ---------------------------------------------------------------------------
// #1784 — distributions are authorized and backed by real funds
// ---------------------------------------------------------------------------

#[test]
fn distribute_pulls_the_distributed_amount_into_the_contract() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder, token) = setup(&env, true);
    let token_client = TokenClient::new(&env, &token);
    let sac = StellarAssetClient::new(&env, &token);
    sac.mint(&tokenizer, &10_000i128);

    client.distribute_dividends(&TOKEN_ID, &10_000i128, &tokenizer);

    assert_eq!(token_client.balance(&tokenizer), 0);
    assert_eq!(
        token_client.balance(&client.address),
        10_000,
        "the contract must hold the full amount it credited to holders"
    );
}

#[test]
fn distribute_without_a_configured_token_fails() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder, _token) = setup(&env, false);

    assert_eq!(
        client.try_distribute_dividends(&TOKEN_ID, &100i128, &tokenizer),
        Err(Ok(Error::InvalidInput))
    );
}

#[test]
fn distribute_rejects_an_unauthenticated_caller() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder, _token) = setup(&env, true);

    env.set_auths(&[]);
    let attacker = Address::generate(&env);
    assert!(client
        .try_distribute_dividends(&TOKEN_ID, &100i128, &attacker)
        .is_err());
    assert_eq!(client.get_unclaimed_dividends(&TOKEN_ID, &tokenizer), 0);
}

#[test]
fn distribute_rejects_an_authenticated_non_admin_caller() {
    let env = create_env();
    let (client, _admin, _tokenizer, holder, _token) = setup(&env, true);

    env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &holder,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &client.address,
            fn_name: "distribute_dividends",
            args: (TOKEN_ID, 100i128, holder.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    assert_eq!(
        client.try_distribute_dividends(&TOKEN_ID, &100i128, &holder),
        Err(Ok(Error::Unauthorized))
    );
}

#[test]
fn set_dividend_token_requires_the_tokenizers_authorization() {
    let env = create_env();
    let (client, _admin, tokenizer, _holder, token) = setup(&env, false);
    let attacker = Address::generate(&env);

    // Neither an anonymous caller nor a named-but-unauthenticated tokenizer
    // may configure the payment token.
    env.set_auths(&[]);
    assert!(client
        .try_set_dividend_token(&TOKEN_ID, &token, &attacker)
        .is_err());
    assert!(client
        .try_set_dividend_token(&TOKEN_ID, &token, &tokenizer)
        .is_err());
    assert!(client.try_get_dividend_token(&TOKEN_ID).is_err());

    env.mock_all_auths();
    client.set_dividend_token(&TOKEN_ID, &token, &tokenizer);
    assert_eq!(client.get_dividend_token(&TOKEN_ID), token);
}

// ---------------------------------------------------------------------------
// #1783 — valuation updates are authorized
// ---------------------------------------------------------------------------

#[test]
fn update_valuation_requires_an_authenticated_tokenizer_or_admin() {
    let env = create_env();
    let (client, _admin, tokenizer, holder, _token) = setup(&env, true);

    // Naming the tokenizer without their signature must not work.
    env.set_auths(&[]);
    assert!(client
        .try_update_valuation(&TOKEN_ID, &5_000i128, &tokenizer)
        .is_err());
    assert_eq!(client.get_tokenized_asset(&TOKEN_ID).valuation, SUPPLY);

    // A real signature from a non-privileged address is still Unauthorized.
    env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &holder,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &client.address,
            fn_name: "update_valuation",
            args: (TOKEN_ID, 5_000i128, holder.clone()).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    assert_eq!(
        client.try_update_valuation(&TOKEN_ID, &5_000i128, &holder),
        Err(Ok(Error::Unauthorized))
    );

    // The tokenizer may update it once authenticated.
    env.mock_all_auths();
    client.update_valuation(&TOKEN_ID, &5_000i128, &tokenizer);
    assert_eq!(client.get_tokenized_asset(&TOKEN_ID).valuation, 5_000);
}
