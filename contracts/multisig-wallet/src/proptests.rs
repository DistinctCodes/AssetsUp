//! Property-based tests for threshold and confirmation invariants ([SC-50]).
//!
//! The example-based tests check specific sequences. These check that an
//! invariant holds across *any* generated sequence of owner additions,
//! removals and confirmations — which is where threshold logic tends to break,
//! because the interesting cases are combinations nobody thought to write down.
//!
//! Case counts are kept modest so the suite stays CI-appropriate; each case
//! spins up a fresh Soroban `Env`, which is not free.
#![cfg(test)]

extern crate std;

use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::types::{ProposalStatus, TransactionType};
use crate::{MultisigWallet, MultisigWalletClient};

/// Builds an `owner_count`-owner wallet with the given threshold.
fn wallet(
    env: &Env,
    owner_count: usize,
    threshold: u32,
) -> (MultisigWalletClient<'_>, Vec<Address>) {
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(env, &contract_id);
    let admin = Address::generate(env);

    let mut owners = Vec::new(env);
    for _ in 0..owner_count {
        owners.push_back(Address::generate(env));
    }

    env.mock_all_auths();
    client.initialize(&admin, &owners, &threshold);
    (client, owners)
}

fn submit(env: &Env, client: &MultisigWalletClient, initiator: &Address) -> u64 {
    client.submit_transaction(
        initiator,
        &TransactionType::Routine,
        &Address::generate(env),
        &Symbol::new(env, "noop"),
        &Vec::new(env),
        &3600,
        &0,
    )
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(24))]

    /// A transaction's confirmation count must always equal the number of
    /// *distinct current owners* who confirmed it — never more, however the
    /// confirmations are ordered or repeated.
    #[test]
    fn confirmation_count_equals_distinct_confirming_owners(
        owner_count in 2usize..6,
        // Indices into the owner set, with deliberate repeats so duplicate
        // confirmations are exercised.
        confirmations in prop::collection::vec(0usize..6, 0..12),
    ) {
        let threshold = 1 + (owner_count as u32) / 2;
        let env = Env::default();
        let (client, owners) = wallet(&env, owner_count, threshold);

        let tx_id = submit(&env, &client, &owners.get(0).unwrap());

        let mut distinct = std::collections::BTreeSet::new();
        let mut executed = false;

        for idx in confirmations {
            if idx >= owner_count {
                continue;
            }
            let owner = owners.get(idx as u32).unwrap();

            // Once the threshold is reached the transaction auto-executes and
            // further confirmations are rejected; stop tracking there.
            if client.try_confirm_transaction(&owner, &tx_id).is_ok() {
                distinct.insert(idx);
            }

            let tx = client.get_transaction(&tx_id).unwrap();
            if tx.confirmations_count >= threshold {
                executed = true;
            }

            if !executed {
                prop_assert_eq!(
                    tx.confirmations_count as usize,
                    distinct.len(),
                    "count must equal the number of distinct owners who confirmed"
                );
            }
        }
    }

    /// A duplicate confirmation from the same owner never increases the count.
    #[test]
    fn a_repeated_confirmation_never_raises_the_count(
        owner_count in 2usize..6,
        repeats in 1usize..5,
    ) {
        let env = Env::default();
        // Threshold above 1 so the first confirmation does not auto-execute.
        let (client, owners) = wallet(&env, owner_count, owner_count as u32);
        let tx_id = submit(&env, &client, &owners.get(0).unwrap());
        let confirmer = owners.get(0).unwrap();

        client.confirm_transaction(&confirmer, &tx_id);
        let after_first = client.get_transaction(&tx_id).unwrap().confirmations_count;

        for _ in 0..repeats {
            let _ = client.try_confirm_transaction(&confirmer, &tx_id);
            prop_assert_eq!(
                client.get_transaction(&tx_id).unwrap().confirmations_count,
                after_first,
                "a repeated confirmation must not move the count"
            );
        }
    }

    /// A proposal executes only when at least `threshold` distinct owners have
    /// confirmed it — never on fewer.
    #[test]
    fn a_proposal_never_executes_below_the_threshold(
        owner_count in 3usize..6,
        confirming in 1usize..3,
    ) {
        let env = Env::default();
        let threshold = owner_count as u32;
        let (client, owners) = wallet(&env, owner_count, threshold);

        let candidate = Address::generate(&env);
        let proposal_id = client.propose_add_owner(&owners.get(0).unwrap(), &candidate);

        // Confirm with strictly fewer owners than the threshold.
        let confirming = confirming.min(owner_count - 1);
        for i in 0..confirming {
            client.confirm_proposal(&owners.get(i as u32).unwrap(), &proposal_id);
        }

        let proposal = client.get_proposal(&proposal_id).unwrap();
        prop_assert_eq!(
            proposal.status,
            ProposalStatus::Pending,
            "a proposal below its threshold must stay pending"
        );
        prop_assert!(
            !client.get_owners().contains(candidate),
            "the owner must not have been added"
        );
        prop_assert!(
            client.try_execute_proposal(&proposal_id).is_err(),
            "explicit execution below the threshold must be rejected"
        );
    }

    /// The threshold invariant holds after any accepted governance change:
    /// `1 <= threshold <= owners.len()`, and there are always at least two
    /// owners.
    #[test]
    fn threshold_stays_within_the_owner_count(
        owner_count in 2usize..6,
        requested_threshold in 0u32..10,
    ) {
        let env = Env::default();
        let (client, owners) = wallet(&env, owner_count, 1);

        // A threshold of 1 means one confirmation executes the proposal.
        let proposer = owners.get(0).unwrap();
        let result = client.try_propose_change_threshold(&proposer, &requested_threshold);

        if result.is_ok() {
            let proposal_id = result.unwrap().unwrap();
            client.confirm_proposal(&proposer, &proposal_id);
        }

        let threshold = client.get_threshold();
        let count = client.get_owners().len();

        prop_assert!(threshold >= 1, "threshold must never drop to zero");
        prop_assert!(
            threshold <= count,
            "threshold must never exceed the owner count"
        );
        prop_assert!(count >= 2, "a multisig must keep at least two owners");
    }

    /// Removing owners can never leave the wallet with a threshold its
    /// remaining owners could not reach.
    #[test]
    fn removals_never_strand_the_threshold(
        owner_count in 3usize..6,
        removals in 1usize..4,
    ) {
        let env = Env::default();
        let threshold = 2u32;
        let (client, owners) = wallet(&env, owner_count, threshold);
        let proposer = owners.get(0).unwrap();

        for i in 0..removals {
            let victim_index = owner_count - 1 - (i % owner_count);
            if victim_index == 0 {
                continue;
            }
            let victim = owners.get(victim_index as u32).unwrap();
            if !client.get_owners().contains(victim.clone()) {
                continue;
            }

            if let Ok(Ok(proposal_id)) = client.try_propose_remove_owner(&proposer, &victim) {
                // Threshold is 2, so two distinct owners must confirm.
                let current = client.get_owners();
                client.confirm_proposal(&current.get(0).unwrap(), &proposal_id);
                if current.len() > 1 {
                    let _ = client.try_confirm_proposal(&current.get(1).unwrap(), &proposal_id);
                }
            }

            let remaining = client.get_owners().len();
            prop_assert!(
                remaining >= 2,
                "removal must never drop the wallet below two owners"
            );
            prop_assert!(
                client.get_threshold() <= remaining,
                "removal must never leave an unreachable threshold"
            );
        }
    }
}
