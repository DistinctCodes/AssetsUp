use crate::tests::helpers::*;
use crate::types::AssetType;
use soroban_sdk::String;

#[test]
fn test_full_asset_tokenization_workflow() {
    let env = create_env();
    let (admin, owner, investor1, investor2) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Step 1: Register asset
    let asset_id_bytes = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id_bytes.clone());
    client.register_asset(&asset, &admin);

    // Step 2: Tokenize asset
    let asset_id = 1u64;
    client.tokenize_asset(
        &asset_id,
        &String::from_str(&env, "PROP"),
        &1000000i128,
        &6u32,
        &1000i128,
        &owner,
        &String::from_str(&env, "Property Token"),
        &String::from_str(&env, "Tokenized real estate"),
        &AssetType::Physical,
    );

    // Step 3: Distribute tokens to investors
    client.transfer_tokens(&asset_id, &owner, &investor1, &400000i128);
    client.transfer_tokens(&asset_id, &owner, &investor2, &300000i128);

    // Verify ownership distribution
    assert_eq!(client.get_token_balance(&asset_id, &owner), 300000);
    assert_eq!(client.get_token_balance(&asset_id, &investor1), 400000);
    assert_eq!(client.get_token_balance(&asset_id, &investor2), 300000);

    // Step 4: Enable revenue sharing and distribute dividends
    client.enable_revenue_sharing(&asset_id);
    client.distribute_dividends(&asset_id, &10000i128);

    // Verify dividend distribution
    assert_eq!(client.get_unclaimed_dividends(&asset_id, &owner), 3000);
    assert_eq!(client.get_unclaimed_dividends(&asset_id, &investor1), 4000);
    assert_eq!(client.get_unclaimed_dividends(&asset_id, &investor2), 3000);

    // Step 5: Claim dividends
    let claimed = client.claim_dividends(&asset_id, &investor1);
    assert_eq!(claimed, 4000);
    assert_eq!(client.get_unclaimed_dividends(&asset_id, &investor1), 0);
}

#[test]
fn test_governance_and_detokenization_workflow() {
    let env = create_env();
    let (admin, owner, investor1, investor2) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Setup: Tokenize asset
    let asset_id = 1u64;
    client.tokenize_asset(
        &asset_id,
        &String::from_str(&env, "GOV"),
        &1000000i128,
        &6u32,
        &1000i128,
        &owner,
        &String::from_str(&env, "Governance Token"),
        &String::from_str(&env, "Token with voting"),
        &AssetType::Physical,
    );

    // Distribute tokens
    client.transfer_tokens(&asset_id, &owner, &investor1, &600000i128);
    client.transfer_tokens(&asset_id, &owner, &investor2, &200000i128);

    // Propose detokenization
    let proposal_id = client.propose_detokenization(&asset_id, &owner);

    // Vote on proposal
    client.cast_vote(&asset_id, &proposal_id, &investor1);

    // Check if proposal passed
    assert!(client.proposal_passed(&asset_id, &proposal_id));

    // Execute detokenization
    client.execute_detokenization(&asset_id, &proposal_id);

    // Verify asset is detokenized
    assert!(!client.is_detokenization_active(&asset_id));
}

#[test]
fn test_transfer_restrictions_workflow() {
    let env = create_env();
    let (admin, owner, investor1, investor2) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Setup: Tokenize asset
    let asset_id = 1u64;
    client.tokenize_asset(
        &asset_id,
        &String::from_str(&env, "REST"),
        &1000000i128,
        &6u32,
        &1000i128,
        &owner,
        &String::from_str(&env, "Restricted Token"),
        &String::from_str(&env, "Token with restrictions"),
        &AssetType::Physical,
    );

    // Set transfer restrictions
    client.set_transfer_restriction(&asset_id, &true);

    // Add investor1 to whitelist
    client.add_to_whitelist(&asset_id, &investor1);

    // Transfer to whitelisted address should succeed
    client.transfer_tokens(&asset_id, &owner, &investor1, &100000i128);
    assert_eq!(client.get_token_balance(&asset_id, &investor1), 100000);

    // Verify whitelist
    assert!(client.is_whitelisted(&asset_id, &investor1));
    assert!(!client.is_whitelisted(&asset_id, &investor2));
}

#[test]
fn test_multi_asset_management() {
    let env = create_env();
    let (admin, owner, _, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Register multiple assets
    for i in 1..=5 {
        let asset_id = generate_asset_id(&env, i);
        let asset = create_test_asset(&env, &owner, asset_id);
        client.register_asset(&asset, &admin);
    }

    // Verify total count
    assert_eq!(client.get_total_asset_count(), 5);

    // Verify owner has all assets
    let owner_assets = client.get_assets_by_owner(&owner);
    assert_eq!(owner_assets.len(), 5);
}

#[test]
fn test_token_locking_workflow() {
    let env = create_env();
    let (admin, owner, investor, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Setup: Tokenize and transfer
    let asset_id = 1u64;
    client.tokenize_asset(
        &asset_id,
        &String::from_str(&env, "LOCK"),
        &1000000i128,
        &6u32,
        &1000i128,
        &owner,
        &String::from_str(&env, "Lockable Token"),
        &String::from_str(&env, "Token with locking"),
        &AssetType::Physical,
    );

    client.transfer_tokens(&asset_id, &owner, &investor, &500000i128);

    // Lock investor's tokens
    let lock_until = env.ledger().timestamp() + 1000;
    client.lock_tokens(&asset_id, &investor, &lock_until, &owner);

    // Verify tokens are locked
    assert!(client.is_tokens_locked(&asset_id, &investor));

    // Unlock tokens
    client.unlock_tokens(&asset_id, &investor);

    // Verify tokens are unlocked
    assert!(!client.is_tokens_locked(&asset_id, &investor));

    // Transfer should now succeed
    client.transfer_tokens(&asset_id, &investor, &owner, &100000i128);
}

#[test]
fn test_insurance_and_asset_integration() {
    let env = create_env();
    let (admin, owner, insurer, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Register asset
    let asset_id = generate_asset_id(&env, 1);
    let asset = create_test_asset(&env, &owner, asset_id.clone());
    client.register_asset(&asset, &admin);

    // Create insurance policy for asset
    let policy_id = generate_asset_id(&env, 100);
    let policy = create_test_policy(&env, policy_id.clone(), &owner, &insurer, asset_id.clone());
    client.create_insurance_policy(&policy);

    // Verify policy exists
    let stored_policy = client.get_insurance_policy(&policy_id);
    assert!(stored_policy.is_some());

    // Verify asset has policy
    let asset_policies = client.get_asset_insurance_policies(&asset_id);
    assert_eq!(asset_policies.len(), 1);
}

#[test]
fn test_admin_operations_workflow() {
    let env = create_env();
    let (admin, new_admin, registrar, _) = create_mock_addresses(&env);
    let client = initialize_contract(&env, &admin);

    env.mock_all_auths();

    // Add authorized registrar
    client.add_authorized_registrar(&registrar);
    assert!(client.is_authorized_registrar(&registrar));

    // Pause contract
    client.pause_contract();
    assert!(client.is_paused());

    // Unpause contract
    client.unpause_contract();
    assert!(!client.is_paused());

    // Update admin
    client.update_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);

    // Verify old admin is no longer authorized registrar
    assert!(!client.is_authorized_registrar(&admin));

    // Verify new admin is authorized registrar
    assert!(client.is_authorized_registrar(&new_admin));
}
