#![cfg(test)]

use crate::{Asset, AssetStatus, ContribContract, ContribContractClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

fn setup_test(env: &Env) -> (ContribContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);
    client.initialize(&admin);
    (client, admin)
}

fn create_asset_data(env: &Env, id: u8, owner: &Address) -> Asset {
    let mut id_bytes = [0u8; 32];
    id_bytes[0] = id;
    Asset {
        id: BytesN::from_array(env, &id_bytes),
        name: String::from_str(env, "Test Asset"),
        description: String::from_str(env, "Description"),
        category: String::from_str(env, "Category"),
        owner: owner.clone(),
        registration_timestamp: env.ledger().timestamp(),
        last_transfer_timestamp: 0,
        status: AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://..."),
        purchase_value: 1000,
    }
}

#[test]
fn test_register_asset_success() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);

    let info = client.get_asset_info(&asset.id);
    assert_eq!(info.id, asset.id);
    assert_eq!(info.owner, owner);
    assert_eq!(info.status, AssetStatus::Active);
}

#[test]
#[should_panic(expected = "Asset already exists")]
fn test_register_asset_duplicate_panic() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.register_asset(&admin, &asset);
}

#[test]
fn test_transfer_asset_success() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.transfer_asset(&asset.id, &new_owner, &owner);

    let info = client.get_asset_info(&asset.id);
    assert_eq!(info.owner, new_owner);
    assert_eq!(info.status, AssetStatus::Transferred);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_transfer_asset_unauthorized_panic() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let malicious = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.transfer_asset(&asset.id, &new_owner, &malicious);
}

#[test]
#[should_panic(expected = "Asset is retired")]
fn test_transfer_asset_retired_panic() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.retire_asset(&asset.id, &owner);
    client.transfer_asset(&asset.id, &new_owner, &owner);
}

#[test]
fn test_retire_asset_success() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.retire_asset(&asset.id, &owner);

    let info = client.get_asset_info(&asset.id);
    assert_eq!(info.status, AssetStatus::Retired);
}

#[test]
#[should_panic(expected = "Already retired")]
fn test_retire_asset_already_retired_panic() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.retire_asset(&asset.id, &owner);
    client.retire_asset(&asset.id, &owner);
}

#[test]
#[should_panic(expected = "Asset not found")]
fn test_get_asset_info_not_found_panic() {
    let env = Env::default();
    let (client, _admin) = setup_test(&env);
    let mut id_bytes = [0u8; 32];
    id_bytes[0] = 99;
    let id = BytesN::from_array(&env, &id_bytes);

    client.get_asset_info(&id);
}

#[test]
fn test_pause_unpause_flow() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);

    env.mock_all_auths();

    // Pause
    client.pause_contract(&admin);
    assert!(client.is_paused());

    // Unpause
    client.unpause_contract(&admin);
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_fail_when_paused() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.pause_contract(&admin);
    client.register_asset(&admin, &asset);
}

#[test]
fn test_unpause_works() {
    let env = Env::default();
    let (client, admin) = setup_test(&env);
    let owner = Address::generate(&env);
    let asset = create_asset_data(&env, 1, &owner);

    env.mock_all_auths();
    client.pause_contract(&admin);
    client.unpause_contract(&admin);
    assert!(!client.is_paused());

    client.register_asset(&admin, &asset);
    let info = client.get_asset_info(&asset.id);
    assert_eq!(info.id, asset.id);
}
