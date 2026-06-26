mod asset_registry_tests;

mod detokenization;
mod dividends;
mod tokenization;
mod voting;
use crate::{Asset, AssetStatus, ContribContract, ContribContractClient};
use soroban_sdk::{testutils::Address as _, testutils::Events as _, Address, BytesN, Env, String};

fn create_env() -> Env {
    Env::default()
}

fn create_test_asset(env: &Env, owner: &Address, id: BytesN<32>) -> Asset {
    let timestamp = env.ledger().timestamp();
    Asset {
        id,
        name: String::from_str(env, "Test Asset"),
        description: String::from_str(env, "A test asset"),
        category: String::from_str(env, "Electronics"),
        owner: owner.clone(),
        registration_timestamp: timestamp,
        last_transfer_timestamp: timestamp,
        status: AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://QmTest123456789"),
        purchase_value: 1000,
    }
}

fn generate_asset_id(env: &Env, seed: u32) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = (seed >> 24) as u8;
    bytes[1] = (seed >> 16) as u8;
    bytes[2] = (seed >> 8) as u8;
    bytes[3] = seed as u8;
    BytesN::from_array(env, &bytes)
}

fn setup_contract(env: &Env) -> (ContribContractClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(ContribContract, ());
    let client = ContribContractClient::new(env, &contract_id);

    env.mock_all_auths();
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_register_asset_success() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id.clone());

    env.mock_all_auths();
    client.register_asset(&admin, &asset);

    let stored = client.get_asset(&asset_id).unwrap();
    assert_eq!(stored.id, asset_id);
    assert_eq!(stored.name, String::from_str(&env, "Test Asset"));
    assert_eq!(stored.owner, owner);
    assert_eq!(client.get_total_count(), 1);
}

#[test]
#[should_panic]
fn test_register_asset_duplicate_id() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id.clone());

    env.mock_all_auths();
    client.register_asset(&admin, &asset);

    client.register_asset(&admin, &asset);
}

#[test]
#[should_panic]
fn test_register_asset_unauthorized_registrar() {
    let env = create_env();
    let (client, _admin) = setup_contract(&env);
    let unauthorized = Address::generate(&env);
    let owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id);

    env.mock_all_auths();
    client.register_asset(&unauthorized, &asset);
}

#[test]
fn test_register_asset_increments_total_count() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);

    assert_eq!(client.get_total_count(), 0);

    let owner = Address::generate(&env);
    let asset1 = create_test_asset(&env, &owner, generate_asset_id(&env, 1));
    let asset2 = create_test_asset(&env, &owner, generate_asset_id(&env, 2));

    env.mock_all_auths();
    client.register_asset(&admin, &asset1);
    assert_eq!(client.get_total_count(), 1);

    client.register_asset(&admin, &asset2);
    assert_eq!(client.get_total_count(), 2);
}

#[test]
fn test_register_asset_emits_event() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id.clone());

    let initial_events = env.events().all().len();

    env.mock_all_auths();
    client.register_asset(&admin, &asset);

    let final_events = env.events().all().len();
    assert!(
        final_events > initial_events,
        "Expected asset registered event to be emitted"
    );
}

#[test]
fn test_add_authorized_registrar() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let new_registrar = Address::generate(&env);

    assert!(!client.is_authorized_registrar(&new_registrar));

    env.mock_all_auths();
    client.add_authorized_registrar(&admin, &new_registrar);

    assert!(client.is_authorized_registrar(&new_registrar));
}

#[test]
fn test_authorized_registrar_can_register() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let new_registrar = Address::generate(&env);
    let owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id);

    env.mock_all_auths();
    client.add_authorized_registrar(&admin, &new_registrar);

    client.register_asset(&new_registrar, &asset);

    assert_eq!(client.get_total_count(), 1);
}

#[test]
fn test_get_assets_by_owner_registry() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let owner = Address::generate(&env);
    let asset1 = create_test_asset(&env, &owner, generate_asset_id(&env, 1));
    let asset2 = create_test_asset(&env, &owner, generate_asset_id(&env, 2));

    env.mock_all_auths();
    client.register_asset(&admin, &asset1);
    client.register_asset(&admin, &asset2);

    let owner_assets = client.get_assets_by_owner(&owner);
    assert_eq!(owner_assets.len(), 2);
    assert_eq!(owner_assets.get(0).unwrap(), asset1.id);
    assert_eq!(owner_assets.get(1).unwrap(), asset2.id);
}

#[test]
fn test_audit_log_records_register_transfer_retire() {
    let env = create_env();
    let (client, admin) = setup_contract(&env);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id.clone());

    env.mock_all_auths();
    client.register_asset(&admin, &asset);
    client.transfer_asset(&asset_id, &new_owner, &owner);
    client.retire_asset(&asset_id, &new_owner);

    let logs = client.get_audit_logs(&asset_id);
    assert_eq!(logs.len(), 3);

    let first_entry = logs.get(0).unwrap();
    assert_eq!(first_entry.log_id, 1);
    assert_eq!(first_entry.action, String::from_str(&env, "register"));

    let last_entry = logs.get(2).unwrap();
    assert_eq!(last_entry.log_id, 3);
    assert_eq!(last_entry.action, String::from_str(&env, "retire"));
}
