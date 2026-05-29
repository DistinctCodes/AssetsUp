#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, Vec};

fn setup() -> (Env, OpsceMultisigClient<'static>, Address, Address, Address, u64) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(OpsceMultisig, ());
    let client = OpsceMultisigClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone()]);

    let wallet_id = client.create_wallet(&admin, &owners, &2u32);

    (env, client, admin, owner1, owner2, wallet_id)
}

#[test]
fn test_revoke_approval_valid() {
    let (_env, client, _admin, owner1, owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);
    client.approve_transaction(&owner2, &wallet_id, &tx_id);

    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert_eq!(tx.approvals, 2);
    assert!(tx.approvers.contains(&owner1));

    // owner1 revokes their approval before execution.
    client.revoke_approval(&owner1, &wallet_id, &tx_id);

    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert_eq!(tx.approvals, 1);
    assert!(!tx.approvers.contains(&owner1));
    assert!(tx.approvers.contains(&owner2));
    assert!(!tx.executed);
}

#[test]
fn test_revoke_approval_double_revocation_fails() {
    let (_env, client, _admin, owner1, _owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);

    // First revocation succeeds.
    client.revoke_approval(&owner1, &wallet_id, &tx_id);

    // Second revocation must fail with ApprovalNotFound.
    let result = client.try_revoke_approval(&owner1, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::ApprovalNotFound)));
}

#[test]
fn test_revoke_approval_after_execution_fails() {
    let (_env, client, _admin, owner1, owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);
    client.approve_transaction(&owner2, &wallet_id, &tx_id);

    // Execute the transaction.
    client.execute_transaction(&wallet_id, &tx_id);
    let tx = client.get_transaction(&wallet_id, &tx_id).unwrap();
    assert!(tx.executed);

    // Revocation after execution must fail with AlreadyExecuted.
    let result = client.try_revoke_approval(&owner1, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::AlreadyExecuted)));
}

#[test]
fn test_revoke_approval_non_owner_fails() {
    let (env, client, _admin, owner1, _owner2, wallet_id) = setup();

    let tx_id = client.submit_transaction(&owner1, &wallet_id);
    client.approve_transaction(&owner1, &wallet_id, &tx_id);

    let intruder = Address::generate(&env);
    let result = client.try_revoke_approval(&intruder, &wallet_id, &tx_id);
    assert_eq!(result, Err(Ok(ContractError::NotAnOwner)));
}
