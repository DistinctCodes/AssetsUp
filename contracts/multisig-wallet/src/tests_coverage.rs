//! Expanded coverage for the multisig wallet ([SC-40]).
//!
//! `tests.rs` covers four happy paths. This module works through every public
//! entrypoint, the threshold and signer-count invariants at their boundaries,
//! the proposal lifecycle, and the authorization boundaries — the last using
//! `try_*` without `mock_all_auths` so a missing `require_auth` fails the test
//! rather than passing silently.

use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, Env, IntoVal, Symbol, Vec};

use crate::errors::Error;
use crate::types::{ProposalStatus, ProposalType, TransactionStatus, TransactionType};
use crate::{MultisigWallet, MultisigWalletClient};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

struct Wallet<'a> {
    env: Env,
    client: MultisigWalletClient<'a>,
    admin: Address,
    owners: Vec<Address>,
}

impl<'a> Wallet<'a> {
    fn owner(&self, i: u32) -> Address {
        self.owners.get(i).unwrap()
    }
}

/// An `n`-owner wallet with the given threshold, with all auths mocked.
fn wallet_with(env: &Env, owner_count: u32, threshold: u32) -> Wallet<'_> {
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(env, &contract_id);
    let admin = Address::generate(env);

    let mut owners = Vec::new(env);
    for _ in 0..owner_count {
        owners.push_back(Address::generate(env));
    }

    env.mock_all_auths();
    client.initialize(&admin, &owners, &threshold);

    Wallet {
        env: env.clone(),
        client,
        admin,
        owners,
    }
}

/// The common case: three owners, 2-of-3.
fn wallet(env: &Env) -> Wallet<'_> {
    wallet_with(env, 3, 2)
}

fn submit(w: &Wallet, initiator: &Address) -> u64 {
    let target = Address::generate(&w.env);
    w.client.submit_transaction(
        initiator,
        &TransactionType::Routine,
        &target,
        &Symbol::new(&w.env, "noop"),
        &Vec::new(&w.env),
        &3600,
        &0,
    )
}

/// Submits and expects failure, returning the contract error.
fn submit_expecting_error(w: &Wallet, initiator: &Address) -> Error {
    let target = Address::generate(&w.env);
    w.client
        .try_submit_transaction(
            initiator,
            &TransactionType::Routine,
            &target,
            &Symbol::new(&w.env, "noop"),
            &Vec::new(&w.env),
            &3600,
            &0,
        )
        .expect_err("expected submit_transaction to fail")
        .expect("expected a contract error, not a host error")
}

// ---------------------------------------------------------------------------
// initialize — threshold and signer-count invariants at their boundaries
// ---------------------------------------------------------------------------

#[test]
fn initialize_sets_owners_threshold_and_defaults() {
    let env = Env::default();
    let w = wallet(&env);

    assert_eq!(w.client.get_owners().len(), 3);
    assert_eq!(w.client.get_threshold(), 2);
    assert_eq!(w.client.get_required_confirmations(), 2);
    assert!(!w.client.is_frozen());
}

#[test]
fn initialize_creates_a_profile_for_every_owner() {
    let env = Env::default();
    let w = wallet(&env);

    for i in 0..3 {
        let profile = w
            .client
            .get_owner_profile(&w.owner(i))
            .expect("every owner gets a profile");
        assert!(profile.is_active);
        assert_eq!(profile.voting_weight, 1);
        assert_eq!(profile.added_by, w.admin);
    }
}

#[test]
fn initialize_twice_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_initialize(&w.admin, &w.owners, &2)
        .expect_err("second initialize must fail");
    assert_eq!(res, Ok(Error::AlreadyInitialized));
}

#[test]
fn initialize_rejects_fewer_than_two_owners() {
    let env = Env::default();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    env.mock_all_auths();

    let single = Vec::from_array(&env, [Address::generate(&env)]);
    let res = client
        .try_initialize(&admin, &single, &1)
        .expect_err("a one-owner multisig is not a multisig");
    assert_eq!(res, Ok(Error::InsufficientOwners));
}

#[test]
fn initialize_rejects_zero_threshold() {
    let env = Env::default();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    env.mock_all_auths();

    let owners = Vec::from_array(&env, [Address::generate(&env), Address::generate(&env)]);
    let res = client
        .try_initialize(&admin, &owners, &0)
        .expect_err("a zero threshold would let anyone execute");
    assert_eq!(res, Ok(Error::InvalidThreshold));
}

#[test]
fn initialize_rejects_threshold_greater_than_owner_count() {
    let env = Env::default();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    env.mock_all_auths();

    let owners = Vec::from_array(&env, [Address::generate(&env), Address::generate(&env)]);
    let res = client
        .try_initialize(&admin, &owners, &3)
        .expect_err("an unreachable threshold would brick the wallet");
    assert_eq!(res, Ok(Error::InvalidThreshold));
}

#[test]
fn initialize_accepts_threshold_equal_to_owner_count() {
    // The upper boundary is valid: unanimity is a legitimate configuration.
    let env = Env::default();
    let w = wallet_with(&env, 3, 3);
    assert_eq!(w.client.get_threshold(), 3);
}

// ---------------------------------------------------------------------------
// submit_transaction
// ---------------------------------------------------------------------------

#[test]
fn submit_transaction_assigns_sequential_ids() {
    let env = Env::default();
    let w = wallet(&env);

    assert_eq!(submit(&w, &w.owner(0)), 1);
    assert_eq!(submit(&w, &w.owner(1)), 2);
    assert_eq!(submit(&w, &w.owner(0)), 3);
}

#[test]
fn submit_transaction_records_threshold_and_pending_status() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.status, TransactionStatus::Pending);
    assert_eq!(tx.required_confirmations, 2);
    assert_eq!(tx.confirmations_count, 0);
    assert_eq!(tx.initiator, w.owner(0));
}

#[test]
fn submit_transaction_rejects_a_non_owner() {
    let env = Env::default();
    let w = wallet(&env);
    let stranger = Address::generate(&env);

    assert_eq!(submit_expecting_error(&w, &stranger), Error::NotAnOwner);
}

#[test]
fn get_transaction_returns_none_for_unknown_id() {
    let env = Env::default();
    let w = wallet(&env);
    assert!(w.client.get_transaction(&999).is_none());
}

// ---------------------------------------------------------------------------
// confirm_transaction
// ---------------------------------------------------------------------------

#[test]
fn confirm_transaction_increments_the_count() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.confirm_transaction(&w.owner(0), &tx_id);

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 1);
    assert_eq!(tx.status, TransactionStatus::Pending);
}

#[test]
fn duplicate_confirmation_by_the_same_owner_is_rejected() {
    // Otherwise one owner could reach any threshold alone.
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.confirm_transaction(&w.owner(0), &tx_id);
    let res = w
        .client
        .try_confirm_transaction(&w.owner(0), &tx_id)
        .expect_err("a second confirmation from the same owner must fail");
    assert_eq!(res, Ok(Error::AlreadyConfirmed));

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 1, "count must not have moved");
}

#[test]
fn confirm_transaction_rejects_a_non_owner() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_confirm_transaction(&stranger, &tx_id)
        .expect_err("non-owners cannot confirm");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

#[test]
fn confirm_transaction_rejects_an_unknown_transaction() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_confirm_transaction(&w.owner(0), &4242)
        .expect_err("unknown transaction");
    assert_eq!(res, Ok(Error::TransactionNotFound));
}

#[test]
fn confirm_transaction_rejects_an_expired_transaction() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    // Move the ledger past the 3600s deadline set at submission.
    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);

    let res = w
        .client
        .try_confirm_transaction(&w.owner(0), &tx_id)
        .expect_err("past the deadline");
    assert_eq!(res, Ok(Error::TransactionExpired));
}

#[test]
fn expired_status_is_never_persisted_because_the_call_reverts() {
    // confirm_transaction sets tx.status = Expired and writes it before
    // returning Err(TransactionExpired). Soroban rolls back all storage writes
    // when an invocation returns an error, so that write never lands and the
    // transaction stays Pending forever.
    //
    // Pinning the real behaviour rather than the apparent intent: nothing can
    // currently move a transaction into Expired, so any consumer filtering on
    // that status will never match. Giving it a real transition would need a
    // separate entrypoint that expires without erroring.
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    env.ledger().set_timestamp(env.ledger().timestamp() + 7200);
    let _ = w.client.try_confirm_transaction(&w.owner(0), &tx_id);

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(
        tx.status,
        TransactionStatus::Pending,
        "the Expired write is rolled back with the failed invocation"
    );
}

// ---------------------------------------------------------------------------
// revoke_confirmation
// ---------------------------------------------------------------------------

#[test]
fn revoke_confirmation_decrements_the_count() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.confirm_transaction(&w.owner(0), &tx_id);
    w.client.revoke_confirmation(&w.owner(0), &tx_id);

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 0);
}

#[test]
fn revoking_allows_the_same_owner_to_confirm_again() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.confirm_transaction(&w.owner(0), &tx_id);
    w.client.revoke_confirmation(&w.owner(0), &tx_id);
    w.client.confirm_transaction(&w.owner(0), &tx_id);

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 1);
}

#[test]
fn revoke_without_a_prior_confirmation_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    let res = w
        .client
        .try_revoke_confirmation(&w.owner(1), &tx_id)
        .expect_err("nothing to revoke");
    assert_eq!(res, Ok(Error::Unauthorized));
}

#[test]
fn revoke_confirmation_rejects_a_non_owner() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_revoke_confirmation(&stranger, &tx_id)
        .expect_err("non-owners cannot revoke");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

// ---------------------------------------------------------------------------
// cancel_transaction
// ---------------------------------------------------------------------------

#[test]
fn initiator_can_cancel_their_own_transaction() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.cancel_transaction(&w.owner(0), &tx_id);

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.status, TransactionStatus::Revoked);
}

#[test]
fn a_different_owner_cannot_cancel_someone_elses_transaction() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    let res = w
        .client
        .try_cancel_transaction(&w.owner(1), &tx_id)
        .expect_err("only the initiator may cancel");
    assert_eq!(res, Ok(Error::Unauthorized));
}

#[test]
fn a_cancelled_transaction_cannot_be_confirmed() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));
    w.client.cancel_transaction(&w.owner(0), &tx_id);

    let res = w
        .client
        .try_confirm_transaction(&w.owner(1), &tx_id)
        .expect_err("cancelled transactions are closed");
    assert_eq!(res, Ok(Error::TransactionAlreadyExecuted));
}

#[test]
fn cancel_transaction_rejects_an_unknown_transaction() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_cancel_transaction(&w.owner(0), &7)
        .expect_err("unknown transaction");
    assert_eq!(res, Ok(Error::TransactionNotFound));
}

// ---------------------------------------------------------------------------
// execute_transaction
// ---------------------------------------------------------------------------

#[test]
fn execute_transaction_rejects_an_unknown_transaction() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_execute_transaction(&123)
        .expect_err("unknown transaction");
    assert_eq!(res, Ok(Error::TransactionNotFound));
}

#[test]
fn a_cancelled_transaction_cannot_be_executed() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));
    w.client.cancel_transaction(&w.owner(0), &tx_id);

    let res = w
        .client
        .try_execute_transaction(&tx_id)
        .expect_err("cancelled transactions are closed");
    assert_eq!(res, Ok(Error::TransactionAlreadyExecuted));
}

// ---------------------------------------------------------------------------
// Proposal lifecycle
// ---------------------------------------------------------------------------

#[test]
fn propose_add_owner_creates_a_pending_proposal() {
    let env = Env::default();
    let w = wallet(&env);
    let candidate = Address::generate(&env);

    let id = w.client.propose_add_owner(&w.owner(0), &candidate);

    let p = w.client.get_proposal(&id).unwrap();
    assert_eq!(p.proposal_type, ProposalType::AddOwner);
    assert_eq!(p.status, ProposalStatus::Pending);
    assert_eq!(p.target_address, Some(candidate));
    assert_eq!(p.confirmations_received, 0);
}

#[test]
fn proposing_an_existing_owner_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_propose_add_owner(&w.owner(0), &w.owner(1))
        .expect_err("already an owner");
    assert_eq!(res, Ok(Error::OwnerAlreadyExists));
}

#[test]
fn proposing_removal_of_a_non_owner_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_propose_remove_owner(&w.owner(0), &stranger)
        .expect_err("not an owner");
    assert_eq!(res, Ok(Error::OwnerNotFound));
}

#[test]
fn removal_that_would_drop_below_the_threshold_is_rejected() {
    // The boundary that matters: a 2-of-2 wallet cannot shed an owner, because
    // the remaining owner could never reach the threshold again.
    let env = Env::default();
    let w = wallet_with(&env, 2, 2);

    let res = w
        .client
        .try_propose_remove_owner(&w.owner(0), &w.owner(1))
        .expect_err("removal would make the threshold unreachable");
    assert_eq!(res, Ok(Error::InsufficientOwners));
}

#[test]
fn a_non_owner_cannot_raise_a_proposal() {
    let env = Env::default();
    let w = wallet(&env);
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_propose_change_threshold(&stranger, &1)
        .expect_err("non-owners cannot propose");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

#[test]
fn proposing_a_zero_threshold_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_propose_change_threshold(&w.owner(0), &0)
        .expect_err("zero threshold");
    assert_eq!(res, Ok(Error::InvalidThreshold));
}

#[test]
fn proposing_a_threshold_above_the_owner_count_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_propose_change_threshold(&w.owner(0), &9)
        .expect_err("unreachable threshold");
    assert_eq!(res, Ok(Error::InvalidThreshold));
}

#[test]
fn duplicate_proposal_confirmation_is_rejected() {
    let env = Env::default();
    let w = wallet_with(&env, 3, 3);
    let candidate = Address::generate(&env);
    let id = w.client.propose_add_owner(&w.owner(0), &candidate);

    w.client.confirm_proposal(&w.owner(0), &id);
    let res = w
        .client
        .try_confirm_proposal(&w.owner(0), &id)
        .expect_err("one confirmation per owner");
    assert_eq!(res, Ok(Error::AlreadyConfirmed));
}

#[test]
fn a_non_owner_cannot_confirm_a_proposal() {
    let env = Env::default();
    let w = wallet(&env);
    let candidate = Address::generate(&env);
    let id = w.client.propose_add_owner(&w.owner(0), &candidate);
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_confirm_proposal(&stranger, &id)
        .expect_err("non-owners cannot confirm");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

#[test]
fn confirming_an_unknown_proposal_is_rejected() {
    let env = Env::default();
    let w = wallet(&env);

    let res = w
        .client
        .try_confirm_proposal(&w.owner(0), &555)
        .expect_err("unknown proposal");
    assert_eq!(res, Ok(Error::ProposalNotFound));
}

#[test]
fn reaching_the_threshold_adds_the_owner_and_marks_the_proposal_executed() {
    let env = Env::default();
    let w = wallet(&env);
    let candidate = Address::generate(&env);
    let id = w.client.propose_add_owner(&w.owner(0), &candidate);

    w.client.confirm_proposal(&w.owner(0), &id);
    w.client.confirm_proposal(&w.owner(1), &id);

    assert!(w.client.get_owners().contains(candidate.clone()));
    assert_eq!(
        w.client.get_proposal(&id).unwrap().status,
        ProposalStatus::Executed
    );
    assert!(
        w.client.get_owner_profile(&candidate).is_some(),
        "a new owner must get a profile"
    );
}

#[test]
fn an_executed_proposal_cannot_be_executed_again() {
    let env = Env::default();
    let w = wallet(&env);
    let candidate = Address::generate(&env);
    let id = w.client.propose_add_owner(&w.owner(0), &candidate);
    w.client.confirm_proposal(&w.owner(0), &id);
    w.client.confirm_proposal(&w.owner(1), &id);

    let res = w
        .client
        .try_execute_proposal(&id)
        .expect_err("re-execution must be rejected");
    assert_eq!(res, Ok(Error::InvalidProposal));

    assert_eq!(
        w.client.get_owners().len(),
        4,
        "the owner must not be added twice"
    );
}

#[test]
fn a_proposal_below_the_threshold_cannot_be_executed() {
    let env = Env::default();
    let w = wallet_with(&env, 3, 3);
    let candidate = Address::generate(&env);
    let id = w.client.propose_add_owner(&w.owner(0), &candidate);
    w.client.confirm_proposal(&w.owner(0), &id);

    let res = w
        .client
        .try_execute_proposal(&id)
        .expect_err("one of three confirmations is not enough");
    assert_eq!(res, Ok(Error::Unauthorized));
    assert!(!w.client.get_owners().contains(candidate));
}

#[test]
fn removing_an_owner_drops_their_profile() {
    let env = Env::default();
    let w = wallet(&env);
    let victim = w.owner(2);
    let id = w.client.propose_remove_owner(&w.owner(0), &victim);

    w.client.confirm_proposal(&w.owner(0), &id);
    w.client.confirm_proposal(&w.owner(1), &id);

    assert!(!w.client.get_owners().contains(victim.clone()));
    assert!(
        w.client.get_owner_profile(&victim).is_none(),
        "a removed owner must not keep a profile"
    );
}

#[test]
fn a_removed_owner_can_no_longer_confirm() {
    // The security property behind SC-40: removal must actually revoke power.
    let env = Env::default();
    let w = wallet(&env);
    let victim = w.owner(2);

    let removal = w.client.propose_remove_owner(&w.owner(0), &victim);
    w.client.confirm_proposal(&w.owner(0), &removal);
    w.client.confirm_proposal(&w.owner(1), &removal);
    assert!(!w.client.get_owners().contains(victim.clone()));

    let tx_id = submit(&w, &w.owner(0));
    let res = w
        .client
        .try_confirm_transaction(&victim, &tx_id)
        .expect_err("a removed owner must not be able to confirm");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

#[test]
fn executing_a_threshold_proposal_changes_the_threshold() {
    let env = Env::default();
    let w = wallet(&env);
    let id = w.client.propose_change_threshold(&w.owner(0), &3);

    w.client.confirm_proposal(&w.owner(0), &id);
    w.client.confirm_proposal(&w.owner(1), &id);

    assert_eq!(w.client.get_threshold(), 3);
    assert_eq!(w.client.get_required_confirmations(), 3);
}

#[test]
fn get_proposal_returns_none_for_unknown_id() {
    let env = Env::default();
    let w = wallet(&env);
    assert!(w.client.get_proposal(&321).is_none());
}

// ---------------------------------------------------------------------------
// Freeze, unfreeze, daily limit
// ---------------------------------------------------------------------------

#[test]
fn freezing_blocks_submission_and_unfreezing_restores_it() {
    let env = Env::default();
    let w = wallet(&env);

    w.client.emergency_freeze(&w.owner(0));
    assert!(w.client.is_frozen());

    assert_eq!(submit_expecting_error(&w, &w.owner(0)), Error::WalletFrozen);

    w.client.emergency_unfreeze(&w.owner(0));
    assert!(!w.client.is_frozen());
    assert_eq!(submit(&w, &w.owner(0)), 1);
}

#[test]
fn freezing_blocks_confirmation() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.emergency_freeze(&w.owner(0));

    let res = w
        .client
        .try_confirm_transaction(&w.owner(1), &tx_id)
        .expect_err("frozen wallets reject confirmations");
    assert_eq!(res, Ok(Error::WalletFrozen));
}

#[test]
fn reads_still_work_while_frozen() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    w.client.emergency_freeze(&w.owner(0));

    assert!(w.client.is_frozen());
    assert_eq!(w.client.get_threshold(), 2);
    assert_eq!(w.client.get_owners().len(), 3);
    assert!(w.client.get_transaction(&tx_id).is_some());
}

#[test]
fn a_non_owner_cannot_freeze_or_unfreeze() {
    let env = Env::default();
    let w = wallet(&env);
    let stranger = Address::generate(&env);

    let res = w
        .client
        .try_emergency_freeze(&stranger)
        .expect_err("non-owners cannot freeze");
    assert_eq!(res, Ok(Error::NotAnOwner));

    w.client.emergency_freeze(&w.owner(0));
    let res = w
        .client
        .try_emergency_unfreeze(&stranger)
        .expect_err("non-owners cannot unfreeze");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

#[test]
fn set_daily_limit_stores_the_limit() {
    let env = Env::default();
    let w = wallet(&env);

    w.client.set_daily_limit(&w.owner(0), &5_000u128);
    // No getter is exposed; the limit is observable through its effect on
    // execution, so assert the call is accepted from an owner and rejected
    // from a stranger.
    let stranger = Address::generate(&env);
    let res = w
        .client
        .try_set_daily_limit(&stranger, &1u128)
        .expect_err("non-owners cannot change the limit");
    assert_eq!(res, Ok(Error::NotAnOwner));
}

// ---------------------------------------------------------------------------
// Authorization — no mock_all_auths
// ---------------------------------------------------------------------------

/// Builds a wallet, then clears the mocked auths so subsequent calls must
/// carry real authorization.
fn wallet_then_drop_auths(env: &Env) -> Wallet<'_> {
    let w = wallet(env);
    env.set_auths(&[]);
    w
}

#[test]
fn submit_transaction_requires_the_initiators_authorization() {
    let env = Env::default();
    let w = wallet_then_drop_auths(&env);

    let target = Address::generate(&env);
    let res = w.client.try_submit_transaction(
        &w.owner(0),
        &TransactionType::Routine,
        &target,
        &Symbol::new(&env, "noop"),
        &Vec::new(&env),
        &3600,
        &0,
    );
    assert!(
        res.is_err(),
        "submit_transaction must fail without the initiator's auth"
    );
}

#[test]
fn confirm_transaction_requires_the_confirmers_authorization() {
    let env = Env::default();
    let w = wallet(&env);
    let tx_id = submit(&w, &w.owner(0));

    env.set_auths(&[]);

    let res = w.client.try_confirm_transaction(&w.owner(1), &tx_id);
    assert!(
        res.is_err(),
        "confirm_transaction must fail without the confirmer's auth"
    );
}

#[test]
fn emergency_freeze_requires_authorization() {
    let env = Env::default();
    let w = wallet_then_drop_auths(&env);

    let res = w.client.try_emergency_freeze(&w.owner(0));
    assert!(
        res.is_err(),
        "emergency_freeze must fail without the caller's auth"
    );
}

#[test]
fn propose_add_owner_requires_the_proposers_authorization() {
    let env = Env::default();
    let w = wallet_then_drop_auths(&env);
    let candidate = Address::generate(&env);

    let res = w.client.try_propose_add_owner(&w.owner(0), &candidate);
    assert!(
        res.is_err(),
        "propose_add_owner must fail without the proposer's auth"
    );
}

// ---------------------------------------------------------------------------
// Error reachability
// ---------------------------------------------------------------------------

#[test]
fn every_error_variant_asserted_here_is_distinct() {
    // Guards against two variants collapsing onto the same discriminant during
    // a renumbering, which would make the assertions above vacuous.
    let codes = [
        Error::AlreadyInitialized as u32,
        Error::NotInitialized as u32,
        Error::Unauthorized as u32,
        Error::InvalidThreshold as u32,
        Error::InsufficientOwners as u32,
        Error::TransactionNotFound as u32,
        Error::TransactionAlreadyExecuted as u32,
        Error::TransactionExpired as u32,
        Error::AlreadyConfirmed as u32,
        Error::OwnerAlreadyExists as u32,
        Error::OwnerNotFound as u32,
        Error::ProposalNotFound as u32,
        Error::WalletFrozen as u32,
        Error::InvalidProposal as u32,
        Error::NotAnOwner as u32,
    ];

    for (i, a) in codes.iter().enumerate() {
        for b in codes.iter().skip(i + 1) {
            assert_ne!(a, b, "error discriminants must be unique");
        }
    }
}

#[test]
fn uninitialized_wallet_reports_not_initialized() {
    let env = Env::default();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);
    let stranger = Address::generate(&env);
    env.mock_all_auths();

    let target = Address::generate(&env);
    let res = client
        .try_submit_transaction(
            &stranger,
            &TransactionType::Routine,
            &target,
            &Symbol::new(&env, "noop"),
            &Vec::new(&env),
            &3600,
            &0,
        )
        .expect_err("nothing is initialized");
    assert_eq!(res, Ok(Error::NotInitialized));
}

#[test]
fn transaction_parameters_round_trip() {
    let env = Env::default();
    let w = wallet(&env);
    let target = Address::generate(&env);
    let params: Vec<soroban_sdk::Val> = Vec::from_array(&env, [42u32.into_val(&env)]);

    let tx_id = w.client.submit_transaction(
        &w.owner(0),
        &TransactionType::Transfer,
        &target,
        &Symbol::new(&env, "pay"),
        &params,
        &3600,
        &100,
    );

    let tx = w.client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.tx_type, TransactionType::Transfer);
    assert_eq!(tx.target, target);
    assert_eq!(tx.function_name, Symbol::new(&env, "pay"));
    assert_eq!(tx.parameters.len(), 1);
    assert_eq!(tx.value, 100);
}
