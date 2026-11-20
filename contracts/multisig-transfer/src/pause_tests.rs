//! Emergency pause tests ([#1643]).
#![cfg(test)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env};

use crate::errors::MultiSigError;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

fn setup(env: &Env) -> (MultiSigTransferContractClient<'_>, Address) {
    env.mock_all_auths();
    let id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(env, &id);
    let admin = Address::generate(env);
    client.initialize(&admin, &Address::generate(env));
    (client, admin)
}

#[test]
fn only_the_admin_can_pause_and_unpause() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let other = Address::generate(&env);

    assert!(!client.is_paused());
    assert_eq!(client.try_pause(&other).err().unwrap().unwrap(), MultiSigError::Unauthorized);
    client.pause(&admin);
    assert!(client.is_paused());
    assert_eq!(client.try_unpause(&other).err().unwrap().unwrap(), MultiSigError::Unauthorized);
    client.unpause(&admin);
    assert!(!client.is_paused());
}

#[test]
fn mutating_entrypoints_fail_while_paused() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let who = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[1u8; 32]);
    client.pause(&admin);

    let create = client.try_create_transfer_request(&who, &hash, &hash, &who, &hash, &0u64, &None);
    assert_eq!(create.err().unwrap().unwrap(), MultiSigError::ContractPaused);
    assert_eq!(
        client.try_approve_transfer_request(&who, &1u64).err().unwrap().unwrap(),
        MultiSigError::ContractPaused
    );
    assert_eq!(
        client.try_reject_transfer_request(&who, &1u64, &hash).err().unwrap().unwrap(),
        MultiSigError::ContractPaused
    );
    assert_eq!(
        client.try_execute_transfer(&who, &1u64).err().unwrap().unwrap(),
        MultiSigError::ContractPaused
    );
}

#[test]
fn cancel_and_reads_still_work_while_paused() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let who = Address::generate(&env);
    client.pause(&admin);

    // Cancel is not blocked by the pause: it reaches the request lookup.
    assert_eq!(
        client.try_cancel_transfer_request(&who, &1u64).err().unwrap().unwrap(),
        MultiSigError::RequestNotFound
    );
    assert!(client.is_paused());
}
