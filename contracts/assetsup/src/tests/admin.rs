use crate::tests::helpers::*;
use soroban_sdk::{testutils::{Address as _, MockAuth}, Address};

#[test]
fn test_update_admin_success() {
    let env = create_env();
    let (admin, new_admin, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();
    client.update_admin(&new_admin);

    // Verify admin was updated
    assert_eq!(client.get_admin(), new_admin);

    // Verify new admin is authorized registrar
    assert!(client.is_authorized_registrar(&new_admin));

    // Verify old admin is no longer authorized registrar
    assert!(!client.is_authorized_registrar(&admin));
}

#[test]
#[should_panic(expected = "Error(Contract, #39)")]
fn test_update_admin_zero_address() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    let zero_address = Address::from_string(&soroban_sdk::String::from_str(
        &env,
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    ));

    env.mock_all_auths();

    // Should panic with InvalidOwnerAddress error
    client.update_admin(&zero_address);
}

#[test]
fn test_pause_unpause_contract() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Initially not paused
    assert!(!client.is_paused());

    // Pause contract
    client.pause_contract();
    assert!(client.is_paused());

    // Unpause contract
    client.unpause_contract();
    assert!(!client.is_paused());
}

#[test]
fn test_add_authorized_registrar() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Initially user1 is not authorized
    assert!(!client.is_authorized_registrar(&user1));

    // Add user1 as authorized registrar
    client.add_authorized_registrar(&user1);
    assert!(client.is_authorized_registrar(&user1));
}

#[test]
fn test_remove_authorized_registrar() {
    let env = create_env();
    let (admin, user1, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Add user1 as authorized registrar
    client.add_authorized_registrar(&user1);
    assert!(client.is_authorized_registrar(&user1));

    // Remove user1 from authorized registrars
    client.remove_authorized_registrar(&user1);
    assert!(!client.is_authorized_registrar(&user1));
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_remove_admin_from_registrars() {
    let env = create_env();
    let admin = Address::generate(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Should panic with Unauthorized error - cannot remove admin
    client.remove_authorized_registrar(&admin);
}

#[test]
fn test_propose_accept_admin_transfer_happy_path() {
    let env = create_env();
    let (admin, new_admin, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    let initial_event_count = env.events().all().len();

    env.mock_all_auths();
    client.propose_admin_transfer(&new_admin);

    assert_eq!(client.get_pending_admin(), Some(new_admin.clone()));
    assert!(env.events().all().len() > initial_event_count);

    client.accept_admin_transfer();

    assert_eq!(client.get_admin(), new_admin.clone());
    assert_eq!(client.get_pending_admin(), None);
    assert!(client.is_authorized_registrar(&new_admin));
    assert!(!client.is_authorized_registrar(&admin));
    assert!(env.events().all().len() > initial_event_count + 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_non_admin_propose_admin_transfer_fails() {
    let env = create_env();
    let (admin, non_admin, new_admin, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_auths(&[MockAuth::new(&non_admin)]);
    client.propose_admin_transfer(&new_admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_wrong_address_accept_admin_transfer_fails() {
    let env = create_env();
    let (admin, wrong_address, new_admin, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();
    client.propose_admin_transfer(&new_admin);

    env.mock_auths(&[MockAuth::new(&wrong_address)]);
    client.accept_admin_transfer();
}

#[test]
fn test_cancel_and_repropose_admin_transfer() {
    let env = create_env();
    let (admin, new_admin, replacement_admin, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();
    client.propose_admin_transfer(&new_admin);

    assert_eq!(client.get_pending_admin(), Some(new_admin.clone()));

    client.cancel_admin_transfer();
    assert_eq!(client.get_pending_admin(), None);

    client.propose_admin_transfer(&replacement_admin);
    assert_eq!(client.get_pending_admin(), Some(replacement_admin));
}
