#[test]
fn test_mint_tokens_v1() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = 200u64;
    let symbol = "AST200".to_string();
    let total_supply = BigInt::from_i128(&env, 500);
    let decimals = 2u32;
    let name = "Mint Test Asset".to_string();
    let description = "Testing minting".to_string();
    let asset_type = AssetType::Digital;

    // Tokenize asset first
    let tokenized_asset = TokenizeContract::tokenize(
        env.clone(),
        asset_id,
        symbol,
        total_supply.clone(),
        decimals,
        name,
        description,
        asset_type,
        tokenizer.clone(),
    );

    // Mint additional tokens
    let mint_amount = BigInt::from_i128(&env, 200);
    let updated_asset = TokenizeContract::mint_tokens(env.clone(), asset_id, mint_amount.clone(), tokenizer.clone());

    // Verify total supply increased
    assert_eq!(updated_asset.total_supply, &total_supply + &mint_amount);

    // Verify tokenizer's ownership updated
    let ownership: OwnershipRecord = env.storage().get((b"ownership", asset_id, &tokenizer)).unwrap().unwrap();
    assert_eq!(ownership.balance, &total_supply + &mint_amount);
}

#[test]
fn test_burn_tokens_v1() {
    let env = Env::default();
    let tokenizer = Address::random(&env);

    let asset_id = 300u64;
    let symbol = "AST300".to_string();
    let total_supply = BigInt::from_i128(&env, 1000);
    let decimals = 2u32;
    let name = "Burn Test Asset".to_string();
    let description = "Testing burning".to_string();
    let asset_type = AssetType::Digital;

    // Tokenize asset first
    let tokenized_asset = TokenizeContract::tokenize(
        env.clone(),
        asset_id,
        symbol,
        total_supply.clone(),
        decimals,
        name,
        description,
        asset_type,
        tokenizer.clone(),
    );

    // Burn some tokens
    let burn_amount = BigInt::from_i128(&env, 400);
    let updated_asset = TokenizeContract::burn_tokens(env.clone(), asset_id, burn_amount.clone(), tokenizer.clone());

    // Verify total supply decreased
    assert_eq!(updated_asset.total_supply, &total_supply - &burn_amount);

    // Verify tokenizer's ownership updated
    let ownership: OwnershipRecord = env.storage().get((b"ownership", asset_id, &tokenizer)).unwrap().unwrap();
    assert_eq!(ownership.balance, &total_supply - &burn_amount);
}

#[test]
#[should_panic(expected = "Unauthorized: only tokenizer can mint")]
fn test_mint_unauthorized() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let attacker = Address::random(&env);

    let asset_id = 400u64;
    let total_supply = BigInt::from_i128(&env, 500);

    // Tokenize asset first
    TokenizeContract::tokenize(
        env.clone(),
        asset_id,
        "AST400".to_string(),
        total_supply.clone(),
        2,
        "Unauthorized Mint".to_string(),
        "Test".to_string(),
        AssetType::Digital,
        tokenizer.clone(),
    );

    // Attempt to mint from unauthorized address
    let mint_amount = BigInt::from_i128(&env, 100);
    TokenizeContract::mint_tokens(env, asset_id, mint_amount, attacker);
}

#[test]
#[should_panic(expected = "Unauthorized: only tokenizer can burn")]
fn test_burn_unauthorized() {
    let env = Env::default();
    let tokenizer = Address::random(&env);
    let attacker = Address::random(&env);

    let asset_id = 500u64;
    let total_supply = BigInt::from_i128(&env, 500);

    // Tokenize asset first
    TokenizeContract::tokenize(
        env.clone(),
        asset_id,
        "AST500".to_string(),
        total_supply.clone(),
        2,
        "Unauthorized Burn".to_string(),
        "Test".to_string(),
        AssetType::Digital,
        tokenizer.clone(),
    );

    // Attempt to burn from unauthorized address
    let burn_amount = BigInt::from_i128(&env, 100);
    TokenizeContract::burn_tokens(env, asset_id, burn_amount, attacker);
}
