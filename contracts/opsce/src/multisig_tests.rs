use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

#[contract]
pub struct NoopContract;

#[contractimpl]
impl NoopContract {
    pub fn noop(_env: Env) {}
}

fn build_owner_vector(env: &Env, owners: &[Address]) -> Vec<Address> {
    let mut vec = Vec::new(env);
    for owner in owners {
        vec.push_back(owner.clone());
    }
    vec
}

fn setup_wallet(env: &Env, owners: &[Address], threshold: u32) -> MultisigWalletClient {
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let owners_vec = build_owner_vector(env, owners);
    client.initialize(&admin, &owners_vec, &threshold);
    client
}

fn noop_target(env: &Env) -> Address {
    env.register(NoopContract, ())
}

fn submit_dummy_transaction(
    client: &MultisigWalletClient,
    owner: &Address,
    target: &Address,
    env: &Env,
) -> u64 {
    client.submit_transaction(
        owner,
        &TransactionType::Routine,
        target,
        &Symbol::new(env, "noop"),
        &Vec::new(env),
        &3600u64,
        &0u128,
    )
}

#[test]
fn test_initialize_duplicate_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone()];
    let client = setup_wallet(&env, &owners, 2);

    let admin = Address::generate(&env);
    let duplicate_init = client.try_initialize(
        &admin,
        &build_owner_vector(&env, &owners),
        &2u32,
    );

    assert!(duplicate_init.is_err());
    assert_eq!(duplicate_init.unwrap_err(), Error::AlreadyInitialized);
}

#[test]
fn test_submit_transaction_non_owner_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let non_owner = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone()];
    let client = setup_wallet(&env, &owners, 2);
    let target = noop_target(&env);

    let res = client.try_submit_transaction(
        &non_owner,
        &TransactionType::Routine,
        &target,
        &Symbol::new(&env, "noop"),
        &Vec::new(&env),
        &3600u64,
        &0u128,
    );

    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), Error::NotAnOwner);
}

#[test]
fn test_approve_transaction_accumulates_and_duplicate_confirmation_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone(), owner3.clone()];
    let client = setup_wallet(&env, &owners, 2);
    let target = noop_target(&env);

    let tx_id = submit_dummy_transaction(&client, &owner1, &target, &env);
    client.confirm_transaction(&owner1, &tx_id);

    let tx = client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 1);
    assert_eq!(tx.status, TransactionStatus::Pending);

    let duplicate = client.try_confirm_transaction(&owner1, &tx_id);
    assert!(duplicate.is_err());
    assert_eq!(duplicate.unwrap_err(), Error::AlreadyConfirmed);
}

#[test]
fn test_execute_transaction_at_threshold_and_reexecution_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone(), owner3.clone()];
    let client = setup_wallet(&env, &owners, 2);
    let target = noop_target(&env);

    let tx_id = submit_dummy_transaction(&client, &owner1, &target, &env);

    let below_threshold = client.try_execute_transaction(&tx_id);
    assert!(below_threshold.is_err());
    assert_eq!(below_threshold.unwrap_err(), Error::Unauthorized);

    client.confirm_transaction(&owner1, &tx_id);
    client.confirm_transaction(&owner2, &tx_id);

    let tx = client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.status, TransactionStatus::Executed);

    let reexecute = client.try_execute_transaction(&tx_id);
    assert!(reexecute.is_err());
    assert_eq!(reexecute.unwrap_err(), Error::TransactionAlreadyExecuted);
}

#[test]
fn test_revoke_approval_reduces_confirmation_and_execution_fails_after_revocation() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone(), owner3.clone()];
    let client = setup_wallet(&env, &owners, 3);
    let target = noop_target(&env);

    let tx_id = submit_dummy_transaction(&client, &owner1, &target, &env);

    client.confirm_transaction(&owner1, &tx_id);
    client.confirm_transaction(&owner2, &tx_id);

    let tx = client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 2);
    assert_eq!(tx.status, TransactionStatus::Pending);

    client.revoke_confirmation(&owner1, &tx_id);
    let tx_after_revoke = client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx_after_revoke.confirmations_count, 1);
    assert_eq!(tx_after_revoke.status, TransactionStatus::Pending);

    let result = client.try_execute_transaction(&tx_id);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::Unauthorized);
}

#[test]
fn test_add_owner_and_remove_owner_non_owner_calls_fail_and_remove_last_owner_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let owners = [owner1.clone(), owner2.clone(), owner3.clone()];
    let client = setup_wallet(&env, &owners, 2);
    let non_owner = Address::generate(&env);

    let add_by_non_owner = client.try_propose_add_owner(&non_owner, &Address::generate(&env));
    assert!(add_by_non_owner.is_err());
    assert_eq!(add_by_non_owner.unwrap_err(), Error::NotAnOwner);

    let new_owner = Address::generate(&env);
    let proposal_id = client.propose_add_owner(&owner1, &new_owner);
    client.confirm_proposal(&owner1, &proposal_id);
    client.confirm_proposal(&owner2, &proposal_id);

    let owners_after_add = client.get_owners();
    assert!(owners_after_add.contains(new_owner.clone()));
    assert_eq!(owners_after_add.len(), 4);

    let proposal_remove_id = client.propose_remove_owner(&owner1, &new_owner);
    client.confirm_proposal(&owner1, &proposal_remove_id);
    client.confirm_proposal(&owner2, &proposal_remove_id);

    let owners_after_remove = client.get_owners();
    assert!(!owners_after_remove.contains(new_owner));
    assert_eq!(owners_after_remove.len(), 3);

    let two_owner_wallet = setup_wallet(&env, &[owner1.clone(), owner2.clone()], 2);
    let remove_last = two_owner_wallet.try_propose_remove_owner(&owner1, &owner2);
    assert!(remove_last.is_err());
    assert_eq!(remove_last.unwrap_err(), Error::InsufficientOwners);
}

#[test]
fn test_two_of_three_and_three_of_five_threshold_scenarios() {
    let env = Env::default();
    env.mock_all_auths();

    // 2-of-3 scenario
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);
    let owners_3 = [owner1.clone(), owner2.clone(), owner3.clone()];
    let client_3 = setup_wallet(&env, &owners_3, 2);
    let target_3 = noop_target(&env);
    let tx_id_3 = submit_dummy_transaction(&client_3, &owner1, &target_3, &env);
    client_3.confirm_transaction(&owner1, &tx_id_3);
    client_3.confirm_transaction(&owner2, &tx_id_3);
    assert_eq!(client_3.get_transaction(&tx_id_3).unwrap().status, TransactionStatus::Executed);

    // 3-of-5 scenario
    let owner4 = Address::generate(&env);
    let owner5 = Address::generate(&env);
    let owners_5 = [owner1.clone(), owner2.clone(), owner3.clone(), owner4.clone(), owner5.clone()];
    let client_5 = setup_wallet(&env, &owners_5, 3);
    let target_5 = noop_target(&env);
    let tx_id_5 = submit_dummy_transaction(&client_5, &owner1, &target_5, &env);
    client_5.confirm_transaction(&owner1, &tx_id_5);
    client_5.confirm_transaction(&owner2, &tx_id_5);
    client_5.confirm_transaction(&owner3, &tx_id_5);
    assert_eq!(client_5.get_transaction(&tx_id_5).unwrap().status, TransactionStatus::Executed);
}
