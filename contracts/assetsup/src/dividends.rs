use crate::error::Error;
use crate::types::{OwnershipRecord, TokenDataKey, TokenizedAsset};
use soroban_sdk::{Address, Env, Vec};

/// Distribute dividends proportionally to all token holders
pub fn distribute_dividends(
    env: &Env,
    asset_id: u64,
    total_amount: i128,
) -> Result<(), Error> {
    if total_amount <= 0 {
        return Err(Error::InvalidDividendAmount);
    }

    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    if !tokenized_asset.revenue_sharing_enabled {
        return Err(Error::InvalidDividendAmount);
    }

    // Get all token holders
    let holders_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders: Vec<Address> = store
        .get(&holders_key)
        .ok_or(Error::AssetNotTokenized)?;

    // Distribute proportionally to each holder
    for holder in holders.iter() {
        let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
        let mut ownership: OwnershipRecord = store
            .get(&holder_key)
            .ok_or(Error::HolderNotFound)?;

        // Calculate proportional dividend: (balance / total_supply) * total_amount
        let proportion = (ownership.balance * total_amount) / tokenized_asset.total_supply;

        // Add to unclaimed dividends
        ownership.unclaimed_dividends += proportion;

        store.set(&holder_key, &ownership);
    }

    // Emit event: (asset_id, total_amount, holder_count)
    env.events().publish(
        ("dividend", "distributed"),
        (asset_id, total_amount, holders.len() as u32),
    );

    Ok(())
}

/// Claim unclaimed dividends
pub fn claim_dividends(
    env: &Env,
    asset_id: u64,
    holder: Address,
) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    // Get holder's ownership record
    let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
    let mut ownership: OwnershipRecord = store
        .get(&holder_key)
        .ok_or(Error::HolderNotFound)?;

    // Get unclaimed amount
    let unclaimed = ownership.unclaimed_dividends;

    if unclaimed <= 0 {
        return Err(Error::NoDividendsToClaim);
    }

    // Clear unclaimed dividends
    ownership.unclaimed_dividends = 0;
    store.set(&holder_key, &ownership);

    // Emit event: (asset_id, holder, amount)
    env.events().publish(
        ("dividend", "claimed"),
        (asset_id, holder, unclaimed),
    );

    Ok(unclaimed)
}

/// Get unclaimed dividends for a holder
pub fn get_unclaimed_dividends(
    env: &Env,
    asset_id: u64,
    holder: Address,
) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    // Get holder's ownership record
    let holder_key = TokenDataKey::TokenHolder(asset_id, holder);
    match store.get::<_, OwnershipRecord>(&holder_key) {
        Some(ownership) => Ok(ownership.unclaimed_dividends),
        None => Ok(0),
    }
}

/// Enable revenue sharing for an asset
pub fn enable_revenue_sharing(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TokenizedAsset(asset_id);
    let mut tokenized_asset: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    tokenized_asset.revenue_sharing_enabled = true;
    store.set(&key, &tokenized_asset);

    Ok(())
}

/// Disable revenue sharing for an asset
pub fn disable_revenue_sharing(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TokenizedAsset(asset_id);
    let mut tokenized_asset: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    tokenized_asset.revenue_sharing_enabled = false;
    store.set(&key, &tokenized_asset);

    Ok(())
}
