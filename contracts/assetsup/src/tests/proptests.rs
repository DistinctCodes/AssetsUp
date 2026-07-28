//! Property-based tests for share accounting ([SC-50]).
//!
//! The invariant fractional ownership rests on: **after any sequence of
//! tokenize, mint, burn and transfer operations, the sum of all holder
//! balances equals the total supply, and no balance is negative.**
//!
//! Example-based tests check specific sequences. This checks the invariant
//! survives arbitrary ones, which is where accounting bugs actually live —
//! a transfer that credits without debiting, or a burn that forgets to reduce
//! supply, only shows up in a combination nobody wrote down.
//!
//! Case counts are kept modest; each case spins up a fresh Soroban `Env`.

use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String, Vec};

use crate::types::AssetType;
use crate::{AssetUpContract, AssetUpContractClient};

/// Tokenizes asset 1 with `supply` shares held entirely by the tokenizer.
fn tokenized(env: &Env, supply: i128) -> (AssetUpContractClient<'_>, Address) {
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(env, &contract_id);
    let admin = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&admin);

    let tokenizer = Address::generate(env);
    client.tokenize_asset(
        &1u64,
        &String::from_str(env, "SHARE"),
        &supply,
        &7u32,
        &1i128,
        &tokenizer,
        &String::from_str(env, "Share"),
        &String::from_str(env, "Fractional share"),
        &AssetType::Physical,
    );

    (client, tokenizer)
}

/// Sums every holder's balance.
fn total_held(client: &AssetUpContractClient) -> i128 {
    let holders: Vec<Address> = client.get_token_holders(&1u64);
    let mut sum = 0i128;
    for holder in holders.iter() {
        let balance = client.get_token_balance(&1u64, &holder);
        assert!(balance >= 0, "a holder balance must never go negative");
        sum += balance;
    }
    sum
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(20))]

    /// Transfers move value without creating or destroying it.
    #[test]
    fn transfers_conserve_total_supply(
        supply in 100i128..1_000_000,
        transfers in prop::collection::vec(1i128..1000, 0..8),
    ) {
        let env = Env::default();
        let (client, tokenizer) = tokenized(&env, supply);

        let expected = client.get_tokenized_asset(&1u64).total_supply;
        prop_assert_eq!(total_held(&client), expected);

        let recipients: std::vec::Vec<Address> =
            (0..3).map(|_| Address::generate(&env)).collect();

        for (i, amount) in transfers.iter().enumerate() {
            let to = &recipients[i % recipients.len()];
            // Transfers that exceed the sender's balance are rejected; either
            // way the invariant must hold afterwards.
            let _ = client.try_transfer_tokens(&1u64, &tokenizer, to, amount);

            prop_assert_eq!(
                total_held(&client),
                expected,
                "holder balances must always sum to total supply"
            );
        }
    }

    /// Minting raises supply by exactly the amount minted, and the holder sum
    /// tracks it.
    #[test]
    fn minting_raises_supply_and_the_holder_sum_together(
        supply in 100i128..100_000,
        mints in prop::collection::vec(1i128..1000, 1..6),
    ) {
        let env = Env::default();
        let (client, tokenizer) = tokenized(&env, supply);

        for amount in mints {
            let before = client.get_tokenized_asset(&1u64).total_supply;

            if client.try_mint_tokens(&1u64, &amount, &tokenizer).is_ok() {
                let after = client.get_tokenized_asset(&1u64).total_supply;
                prop_assert_eq!(
                    after,
                    before + amount,
                    "supply must rise by exactly the amount minted"
                );
            }

            prop_assert_eq!(
                total_held(&client),
                client.get_tokenized_asset(&1u64).total_supply,
                "holder balances must always sum to total supply"
            );
        }
    }

    /// Burning lowers supply by exactly the amount burned, and never takes a
    /// holder below zero.
    #[test]
    fn burning_lowers_supply_without_going_negative(
        supply in 1000i128..100_000,
        burns in prop::collection::vec(1i128..2000, 1..6),
    ) {
        let env = Env::default();
        let (client, tokenizer) = tokenized(&env, supply);

        for amount in burns {
            let before = client.get_tokenized_asset(&1u64).total_supply;

            if client.try_burn_tokens(&1u64, &amount, &tokenizer).is_ok() {
                let after = client.get_tokenized_asset(&1u64).total_supply;
                prop_assert_eq!(
                    after,
                    before - amount,
                    "supply must fall by exactly the amount burned"
                );
            }

            prop_assert!(
                client.get_token_balance(&1u64, &tokenizer) >= 0,
                "burning must never drive a balance negative"
            );
            prop_assert_eq!(
                total_held(&client),
                client.get_tokenized_asset(&1u64).total_supply,
                "holder balances must always sum to total supply"
            );
        }
    }

    /// A transfer larger than the sender's balance must be rejected outright,
    /// leaving both balances untouched.
    #[test]
    fn an_overdrawn_transfer_changes_nothing(
        supply in 100i128..10_000,
        excess in 1i128..5000,
    ) {
        let env = Env::default();
        let (client, tokenizer) = tokenized(&env, supply);
        let recipient = Address::generate(&env);

        let sender_before = client.get_token_balance(&1u64, &tokenizer);
        let amount = sender_before + excess;

        let result = client.try_transfer_tokens(&1u64, &tokenizer, &recipient, &amount);

        prop_assert!(result.is_err(), "an overdrawn transfer must be rejected");
        prop_assert_eq!(
            client.get_token_balance(&1u64, &tokenizer),
            sender_before,
            "the sender's balance must be untouched"
        );
        prop_assert_eq!(
            client.get_token_balance(&1u64, &recipient),
            0,
            "the recipient must not have been credited"
        );
    }

    /// Mixed sequences of every value-moving operation still conserve supply.
    #[test]
    fn arbitrary_operation_sequences_conserve_supply(
        supply in 1000i128..100_000,
        ops in prop::collection::vec((0u8..3, 1i128..500), 1..10),
    ) {
        let env = Env::default();
        let (client, tokenizer) = tokenized(&env, supply);
        let other = Address::generate(&env);

        for (op, amount) in ops {
            match op {
                0 => { let _ = client.try_mint_tokens(&1u64, &amount, &tokenizer); }
                1 => { let _ = client.try_burn_tokens(&1u64, &amount, &tokenizer); }
                _ => { let _ = client.try_transfer_tokens(&1u64, &tokenizer, &other, &amount); }
            }

            let supply_now = client.get_tokenized_asset(&1u64).total_supply;
            prop_assert!(supply_now >= 0, "total supply must never go negative");
            prop_assert_eq!(
                total_held(&client),
                supply_now,
                "holder balances must sum to total supply after any operation"
            );
        }
    }
}
