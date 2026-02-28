use crate::audit;
use crate::error::Error;
use crate::types::{OwnershipRecord, TokenDataKey, TokenMetadata, TokenizedAsset};
use soroban_sdk::{Address, BytesN, Env, String, Vec};

/// Helper function to convert u64 asset_id to BytesN<32> for audit logging
fn asset_id_to_bytes(env: &Env, asset_id: u64) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    let id_bytes = asset_id.to_be_bytes();
    // Place the u64 bytes at the end of the 32-byte array
    bytes[24..32].copy_from_slice(&id_bytes);
    BytesN::from_array(env, &bytes)
}

/// Initialize tokenization by creating tokenized asset
/// Only contract admin or asset owner can tokenize
#[allow(clippy::too_many_arguments)]
pub fn tokenize_asset(
    env: &Env,
    asset_id: u64,
    symbol: String,
    total_supply: i128,
    decimals: u32,
    min_voting_threshold: i128,
    tokenizer: Address,
    metadata: TokenMetadata,
) -> Result<TokenizedAsset, Error> {
    // Validate inputs
    if total_supply <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    // Check if asset is already tokenized
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);
    if store.has(&key) {
        return Err(Error::AssetAlreadyTokenized);
    }

    // Create tokenized asset
    let timestamp = env.ledger().timestamp();
    let tokenized_asset = TokenizedAsset {
        asset_id,
        total_supply,
        symbol: symbol.clone(),
        decimals,
        locked_tokens: 0,
        tokenizer: tokenizer.clone(),
        valuation: total_supply,
        token_holders_count: 1,
        tokens_in_circulation: total_supply,
        min_voting_threshold,
        revenue_sharing_enabled: false,
        tokenization_timestamp: timestamp,
        detokenize_threshold: 50, // 50% majority
    };

    // Store tokenized asset
    store.set(&key, &tokenized_asset);

    // Store metadata
    let metadata_key = TokenDataKey::TokenMetadata(asset_id);
    store.set(&metadata_key, &metadata);

    // Initialize tokenizer as first holder with full supply
    let ownership = OwnershipRecord {
        owner: tokenizer.clone(),
        balance: total_supply,
        acquisition_timestamp: timestamp,
        average_purchase_price: 1,
        voting_power: total_supply,
        dividend_entitlement: total_supply,
        unclaimed_dividends: 0,
        ownership_percentage: 10000, // 100% in basis points
    };

    let holder_key = TokenDataKey::TokenHolder(asset_id, tokenizer.clone());
    store.set(&holder_key, &ownership);

    // Initialize token holders list
    let mut holders: Vec<Address> = Vec::new(env);
    holders.push_back(tokenizer.clone());
    let holders_list_key = TokenDataKey::TokenHoldersList(asset_id);
    store.set(&holders_list_key, &holders);

    // Append audit log (convert u64 asset_id to BytesN<32>)
    let asset_id_bytes = asset_id_to_bytes(env, asset_id);
    audit::append_audit_log(
        env,
        &asset_id_bytes,
        String::from_str(env, "ASSET_TOKENIZED"),
        tokenizer.clone(),
        String::from_str(env, "Asset tokenized with tokens"),
    );

    // Emit event: (asset_id, supply, symbol, decimals, tokenizer)
    env.events().publish(
        ("token", "asset_tokenized"),
        (asset_id, total_supply, symbol, decimals, tokenizer),
    );

    Ok(tokenized_asset)
}

/// Mint additional tokens
/// Only tokenizer can mint
pub fn mint_tokens(
    env: &Env,
    asset_id: u64,
    amount: i128,
    minter: Address,
) -> Result<TokenizedAsset, Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);

    // Get tokenized asset
    let mut tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Only tokenizer can mint
    if tokenized_asset.tokenizer != minter {
        return Err(Error::Unauthorized);
    }

    // Update total supply
    tokenized_asset.total_supply += amount;
    tokenized_asset.tokens_in_circulation += amount;

    // Update tokenizer's ownership
    let holder_key = TokenDataKey::TokenHolder(asset_id, minter.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    ownership.balance += amount;
    ownership.voting_power = ownership.balance;
    ownership.dividend_entitlement = ownership.balance;

    // Recalculate ownership percentage
    ownership.ownership_percentage = (ownership.balance * 10000) / tokenized_asset.total_supply;

    store.set(&holder_key, &ownership);
    store.set(&key, &tokenized_asset.clone());

    // Append audit log
    let asset_id_bytes = asset_id_to_bytes(env, asset_id);
    audit::append_audit_log(
        env,
        &asset_id_bytes,
        String::from_str(env, "TOKENS_MINTED"),
        minter.clone(),
        String::from_str(env, "Tokens minted"),
    );

    // Emit event: (asset_id, amount, new_supply)
    env.events().publish(
        ("token", "tokens_minted"),
        (asset_id, amount, tokenized_asset.total_supply),
    );

    Ok(tokenized_asset)
}

/// Burn tokens
/// Only tokenizer can burn, and only from their own account
pub fn burn_tokens(
    env: &Env,
    asset_id: u64,
    amount: i128,
    burner: Address,
) -> Result<TokenizedAsset, Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);

    // Get tokenized asset
    let mut tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Only tokenizer can burn
    if tokenized_asset.tokenizer != burner {
        return Err(Error::Unauthorized);
    }

    // Get burner's balance
    let holder_key = TokenDataKey::TokenHolder(asset_id, burner.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    if ownership.balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Update balances
    ownership.balance -= amount;
    ownership.voting_power = ownership.balance;
    ownership.dividend_entitlement = ownership.balance;

    // Recalculate ownership percentage
    ownership.ownership_percentage = (ownership.balance * 10000) / tokenized_asset.total_supply;

    tokenized_asset.total_supply -= amount;
    tokenized_asset.tokens_in_circulation -= amount;

    store.set(&holder_key, &ownership);
    store.set(&key, &tokenized_asset.clone());

    // Append audit log
    let asset_id_bytes = asset_id_to_bytes(env, asset_id);
    audit::append_audit_log(
        env,
        &asset_id_bytes,
        String::from_str(env, "TOKENS_BURNED"),
        burner.clone(),
        String::from_str(env, "Tokens burned"),
    );

    // Emit event: (asset_id, amount, new_supply)
    env.events().publish(
        ("token", "tokens_burned"),
        (asset_id, amount, tokenized_asset.total_supply),
    );

    Ok(tokenized_asset)
}

/// Transfer tokens from one address to another
pub fn transfer_tokens(
    env: &Env,
    asset_id: u64,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Check if from address has locked tokens
    let lock_key = TokenDataKey::TokenLockedUntil(asset_id, from.clone());
    if let Some(lock_time) = store.get::<_, u64>(&lock_key) {
        if env.ledger().timestamp() < lock_time {
            return Err(Error::TokensAreLocked);
        }
    }

    // Get from balance
    let from_holder_key = TokenDataKey::TokenHolder(asset_id, from.clone());
    let mut from_ownership: OwnershipRecord =
        store.get(&from_holder_key).ok_or(Error::HolderNotFound)?;

    if from_ownership.balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Get to balance (or create new holder)
    let to_holder_key = TokenDataKey::TokenHolder(asset_id, to.clone());
    let mut to_ownership: OwnershipRecord = match store.get(&to_holder_key) {
        Some(ownership) => ownership,
        None => {
            // Create new holder
            let timestamp = env.ledger().timestamp();
            OwnershipRecord {
                owner: to.clone(),
                balance: 0,
                acquisition_timestamp: timestamp,
                average_purchase_price: 1,
                voting_power: 0,
                dividend_entitlement: 0,
                unclaimed_dividends: 0,
                ownership_percentage: 0,
            }
        }
    };

    // Update balances
    from_ownership.balance -= amount;
    from_ownership.voting_power = from_ownership.balance;
    from_ownership.dividend_entitlement = from_ownership.balance;
    from_ownership.ownership_percentage =
        (from_ownership.balance * 10000) / tokenized_asset.total_supply;

    to_ownership.balance += amount;
    to_ownership.voting_power = to_ownership.balance;
    to_ownership.dividend_entitlement = to_ownership.balance;
    to_ownership.ownership_percentage =
        (to_ownership.balance * 10000) / tokenized_asset.total_supply;

    store.set(&from_holder_key, &from_ownership);
    store.set(&to_holder_key, &to_ownership);

    // Add to holder list if new
    let holders_list_key = TokenDataKey::TokenHoldersList(asset_id);
    let mut holders: Vec<Address> = store
        .get(&holders_list_key)
        .ok_or(Error::AssetNotTokenized)?;

    let is_new_holder = !holders.iter().any(|h| h == to);
    if is_new_holder {
        holders.push_back(to.clone());
        store.set(&holders_list_key, &holders);
    }

    // Append audit log
    let asset_id_bytes = asset_id_to_bytes(env, asset_id);
    audit::append_audit_log(
        env,
        &asset_id_bytes,
        String::from_str(env, "TOKENS_TRANSFERRED"),
        from.clone(),
        String::from_str(env, "Tokens transferred to recipient"),
    );

    // Emit event: (asset_id, from, to, amount)
    env.events().publish(
        ("token", "tokens_transferred"),
        (asset_id, from.clone(), to.clone(), amount),
    );

    Ok(())
}

/// Get token balance for an address
pub fn get_token_balance(env: &Env, asset_id: u64, holder: Address) -> Result<i128, Error> {
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenHolder(asset_id, holder);

    match store.get::<_, OwnershipRecord>(&key) {
        Some(ownership) => Ok(ownership.balance),
        None => Ok(0),
    }
}

/// Get all token holders for an asset
pub fn get_token_holders(env: &Env, asset_id: u64) -> Result<Vec<Address>, Error> {
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenHoldersList(asset_id);

    store.get(&key).ok_or(Error::AssetNotTokenized)
}

/// Lock tokens until a specific timestamp.
/// Only the tokenizer of the asset can lock a holder's tokens.
pub fn lock_tokens(
    env: &Env,
    asset_id: u64,
    holder: Address,
    until_timestamp: u64,
    caller: Address,
) -> Result<(), Error> {
    // Verify asset is tokenized
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Only tokenizer can lock
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    if tokenized_asset.tokenizer != caller {
        return Err(Error::Unauthorized);
    }

    let lock_key = TokenDataKey::TokenLockedUntil(asset_id, holder.clone());
    store.set(&lock_key, &until_timestamp);

    // Emit event: (asset_id, holder, until_timestamp)
    env.events().publish(
        ("token", "tokens_locked"),
        (asset_id, holder, until_timestamp),
    );

    Ok(())
}

/// Unlock tokens (remove lock)
pub fn unlock_tokens(env: &Env, asset_id: u64, holder: Address) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    let lock_key = TokenDataKey::TokenLockedUntil(asset_id, holder.clone());

    // Remove lock record
    if store.has(&lock_key) {
        store.remove(&lock_key);
    }

    // Emit event: (asset_id, holder)
    env.events()
        .publish(("token", "tokens_unlocked"), (asset_id, holder));

    Ok(())
}

/// Returns true if the holder's tokens are currently locked (lock timestamp is in the future).
pub fn is_tokens_locked(env: &Env, asset_id: u64, holder: Address) -> bool {
    let store = env.storage().persistent();
    let lock_key = TokenDataKey::TokenLockedUntil(asset_id, holder);
    match store.get::<_, u64>(&lock_key) {
        Some(lock_until) => env.ledger().timestamp() < lock_until,
        None => false,
    }
}

/// Calculate ownership percentage for a holder (in basis points)
pub fn calculate_ownership_percentage(
    env: &Env,
    asset_id: u64,
    holder: Address,
) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Get asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get holder balance
    let holder_key = TokenDataKey::TokenHolder(asset_id, holder);
    let ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Calculate percentage: (balance / total_supply) * 10000
    if tokenized_asset.total_supply <= 0 {
        return Ok(0);
    }

    Ok((ownership.balance * 10000) / tokenized_asset.total_supply)
}

/// Get tokenized asset details
pub fn get_tokenized_asset(env: &Env, asset_id: u64) -> Result<TokenizedAsset, Error> {
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);

    store.get(&key).ok_or(Error::AssetNotTokenized)
}

/// Get token metadata
#[allow(dead_code)]
pub fn get_token_metadata(env: &Env, asset_id: u64) -> Result<TokenMetadata, Error> {
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenMetadata(asset_id);

    store.get(&key).ok_or(Error::AssetNotTokenized)
}

/// Update asset valuation
pub fn update_valuation(env: &Env, asset_id: u64, new_valuation: i128) -> Result<(), Error> {
    if new_valuation <= 0 {
        return Err(Error::InvalidValuation);
    }

    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);

    let mut tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    tokenized_asset.valuation = new_valuation;
    store.set(&key, &tokenized_asset);

    // Emit event: (asset_id, new_valuation)
    env.events()
        .publish(("token", "valuation_updated"), (asset_id, new_valuation));

    Ok(())
}
