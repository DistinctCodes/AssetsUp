use crate::error::Error;
use crate::math;
use crate::types::{OwnershipRecord, TokenDataKey, TokenizedAsset};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::{Address, Env, Vec};

/// Configure the payment token used to pay dividends for `asset_id`.
///
/// The asset must be tokenized. This is only called through the `lib.rs`
/// entrypoint, which authenticates the tokenizer or admin first.
pub fn set_dividend_token(env: &Env, asset_id: u64, token: Address) -> Result<(), Error> {
    let store = env.storage().persistent();
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;
    store.set(&TokenDataKey::DividendToken(asset_id), &token);
    Ok(())
}

/// The configured dividend payment token, or `InvalidInput` when none has been
/// set. No holder may be credited before this is configured: doing so would
/// create dividend liabilities with no funds backing them.
pub fn get_dividend_token(env: &Env, asset_id: u64) -> Result<Address, Error> {
    env.storage()
        .persistent()
        .get(&TokenDataKey::DividendToken(asset_id))
        .ok_or(Error::InvalidInput)
}

/// Pull `amount` of the configured dividend token from `payer` into this
/// contract. A failed transfer reverts the whole invocation, so holders are
/// never credited with unbacked dividends.
pub fn collect_dividend_funds(
    env: &Env,
    asset_id: u64,
    payer: &Address,
    amount: i128,
) -> Result<(), Error> {
    let token = get_dividend_token(env, asset_id)?;
    TokenClient::new(env, &token).transfer(payer, &env.current_contract_address(), &amount);
    Ok(())
}

/// Distribute dividends proportionally to all token holders
pub fn distribute_dividends(env: &Env, asset_id: u64, total_amount: i128) -> Result<(), Error> {
    if total_amount <= 0 {
        return Err(Error::InvalidDividendAmount);
    }

    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    if !tokenized_asset.revenue_sharing_enabled {
        return Err(Error::InvalidDividendAmount);
    }

    // Get all token holders
    let holders_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders: Vec<Address> = store.get(&holders_key).ok_or(Error::AssetNotTokenized)?;

    // Distribute proportionally to each holder
    for holder in holders.iter() {
        let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
        let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

        // Proportional dividend: balance/total_supply of total_amount.
        //
        // Written naively as (balance * total_amount) / total_supply this
        // overflows whenever the intermediate product exceeds i128::MAX, even
        // though the quotient is small. Rounds down; the remainder stays with
        // the contract. See crate::math for the rounding rationale.
        let proportion = math::mul_div(
            ownership.balance,
            total_amount,
            tokenized_asset.total_supply,
        )?;

        ownership.unclaimed_dividends = math::add(ownership.unclaimed_dividends, proportion)?;

        store.set(&holder_key, &ownership);
    }

    // Emit event: (asset_id, total_amount, holder_count)
    crate::events::dividend_distributed(env, asset_id, total_amount, holders.len());

    Ok(())
}

/// Claim unclaimed dividends
pub fn claim_dividends(env: &Env, asset_id: u64, holder: Address) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get holder's ownership record
    let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Get unclaimed amount
    let unclaimed = ownership.unclaimed_dividends;

    if unclaimed <= 0 {
        return Err(Error::NoDividendsToClaim);
    }

    // Clear unclaimed dividends
    ownership.unclaimed_dividends = 0;
    store.set(&holder_key, &ownership);

    // Emit event: (asset_id, holder, amount)
    crate::events::dividend_claimed(env, asset_id, &holder, unclaimed);

    Ok(unclaimed)
}

/// Get unclaimed dividends for a holder
pub fn get_unclaimed_dividends(env: &Env, asset_id: u64, holder: Address) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

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
    let mut tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    tokenized_asset.revenue_sharing_enabled = true;
    store.set(&key, &tokenized_asset);

    Ok(())
}

/// Disable revenue sharing for an asset
pub fn disable_revenue_sharing(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TokenizedAsset(asset_id);
    let mut tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    tokenized_asset.revenue_sharing_enabled = false;
    store.set(&key, &tokenized_asset);

    Ok(())
}
