use soroban_sdk::{Env, Address, panic};

#[derive(Clone)]
pub struct TokenizedAsset {
    pub asset_id: String,
    pub total_supply: i128,
    pub symbol: String,
    pub decimals: u32,
    pub tokenizer: Address,
    pub valuation: i128,
    pub revenue_sharing_enabled: bool,
    pub tokenization_timestamp: u64,
}

#[derive(Clone)]
pub struct TokenMetadata {
    pub name: String,
    pub description: String,
    pub asset_type: String, // "Physical" or "Digital"
    pub ipfs_uri: String,
    pub legal_docs_hash: String,
    pub accredited_investor_required: bool,
}

#[derive(Clone)]
pub struct OwnershipRecord {
    pub owner: Address,
    pub percentage: i128, // 100% initially
}

pub fn tokenize_asset(
    env: &Env,
    asset_id: String,
    symbol: String,
    total_supply: i128,
    valuation: i128,
    metadata: TokenMetadata,
) {
    require_owner(env);

    // Check contract not paused
    require_not_paused(env);

    // Ensure asset exists
    let asset_exists: bool = env.storage().get(&format!("asset:{}", asset_id)).unwrap_or(false);
    if !asset_exists {
        panic!("Asset not found");
    }

    // Ensure not already tokenized
    let already_tokenized: bool = env.storage().get(&format!("tokenized:{}", asset_id)).unwrap_or(false);
    if already_tokenized {
        panic!("Asset already tokenized");
    }

    // Build TokenizedAsset
    let tokenizer = env.invoker();
    let tokenized = TokenizedAsset {
        asset_id: asset_id.clone(),
        total_supply,
        symbol,
        decimals: 18,
        tokenizer: tokenizer.clone(),
        valuation,
        revenue_sharing_enabled: false,
        tokenization_timestamp: env.ledger().timestamp(),
    };

    // Store tokenized asset
    env.storage().set(&format!("tokenized:{}", asset_id), &true);
    env.storage().set(&format!("tokenized_asset:{}", asset_id), &tokenized);

    // Create initial ownership record (100% to tokenizer)
    let ownership = OwnershipRecord {
        owner: tokenizer.clone(),
        percentage: 100,
    };
    env.storage().set(&format!("ownership:{}", asset_id), &ownership);

    // Emit event
    env.events().publish(("tokenize_asset", asset_id.clone()), ());
}

fn require_owner(env: &Env) {
    let caller = env.invoker();
    let owner: Address = env.storage().get("owner").unwrap();
    if caller != owner {
        panic!("Only owner can tokenize asset");
    }
}
