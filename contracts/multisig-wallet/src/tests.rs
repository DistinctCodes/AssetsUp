use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, Symbol, Vec};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);
    let threshold = 2;

    client.initialize(&admin, &owners, &threshold);

    assert_eq!(client.get_owners(), owners);
    assert_eq!(client.get_threshold(), threshold);
    assert!(!client.is_frozen());
}

#[test]
fn test_submit_and_confirm_transaction() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);
    let threshold = 2;

    client.initialize(&admin, &owners, &threshold);

    let target = Address::generate(&env);
    let tx_id = client.submit_transaction(
        &owner1,
        &TransactionType::Routine,
        &target,
        &Symbol::new(&env, "some_function"),
        &Vec::new(&env),
        &3600,
        &0,
    );

    assert_eq!(tx_id, 1);

    client.confirm_transaction(&owner1, &tx_id);
    let tx = client.get_transaction(&tx_id).unwrap();
    assert_eq!(tx.confirmations_count, 1);
    assert_eq!(tx.status, TransactionStatus::Pending);

    // Second confirmation should trigger execution
    // Note: execute_transaction will fail because target contract doesn't exist
    // But we can check if it tries to execute
}

#[test]
fn test_ownership_proposal() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);
    let threshold = 2;

    client.initialize(&admin, &owners, &threshold);

    let new_owner = Address::generate(&env);
    let proposal_id = client.propose_add_owner(&owner1, &new_owner);

    client.confirm_proposal(&owner1, &proposal_id);
    client.confirm_proposal(&owner2, &proposal_id);

    let updated_owners = client.get_owners();
    assert!(updated_owners.contains(new_owner));
}

#[test]
fn test_emergency_freeze() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);
    client.initialize(&admin, &owners, &2);

    client.emergency_freeze(&owner1);
    assert!(client.is_frozen());

    let target = Address::generate(&env);
    // Submit should fail when frozen
    let res = client.try_submit_transaction(
        &owner1,
        &TransactionType::Routine,
        &target,
        &Symbol::new(&env, "func"),
        &Vec::new(&env),
        &3600,
        &0,
    );
    assert!(res.is_err());
}
