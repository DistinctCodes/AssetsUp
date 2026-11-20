use crate::tests::helpers::*;
use soroban_sdk::{BytesN, Vec};

fn register_n(env: &soroban_sdk::Env, n: u32) -> (soroban_sdk::Address, crate::AssetUpContractClient<'_>) {
    let (admin, owner, _, _) = create_mock_addresses(env);
    let client = initialize_contract(env, &admin);
    env.mock_all_auths();
    for i in 1..=n {
        let id = generate_asset_id(env, i);
        client.register_asset(&create_test_asset(env, &owner, id), &admin);
    }
    (owner, client)
}

#[test]
fn owner_assets_page_windows_and_clamps() {
    let env = create_env();
    let (owner, client) = register_n(&env, 5);

    assert_eq!(client.get_assets_by_owner_page(&owner, &0, &2).len(), 2);
    assert_eq!(client.get_assets_by_owner_page(&owner, &4, &10).len(), 1);
    assert_eq!(client.get_assets_by_owner_page(&owner, &9, &10).len(), 0);
    assert_eq!(client.get_assets_by_owner_page(&owner, &0, &0).len(), 0);
    // The un-paged getter is the first (capped) page.
    assert_eq!(client.get_assets_by_owner(&owner).len(), 5);
}

#[test]
fn batch_get_asset_info_is_positional() {
    let env = create_env();
    let (_owner, client) = register_n(&env, 2);

    let known = generate_asset_id(&env, 1);
    let unknown = generate_asset_id(&env, 200);
    let ids: Vec<BytesN<32>> = Vec::from_array(&env, [unknown, known.clone()]);

    let out = client.batch_get_asset_info(&ids);
    assert_eq!(out.len(), 2);
    assert!(out.get(0).unwrap().is_none());
    assert_eq!(out.get(1).unwrap().unwrap().id, known);
}

#[test]
#[should_panic(expected = "Error(Contract, #108)")]
fn batch_get_asset_info_rejects_oversized_batch() {
    let env = create_env();
    let (_owner, client) = register_n(&env, 1);

    let mut ids: Vec<BytesN<32>> = Vec::new(&env);
    for _ in 0..=crate::MAX_BATCH_SIZE {
        ids.push_back(generate_asset_id(&env, 1));
    }
    client.batch_get_asset_info(&ids);
}
