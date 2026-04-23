#![no_std]

use crate::error::Error;
use crate::types::{
    OwnershipRecord, Proposal, ProposalStatus, TokenDataKey, TokenizedAsset, VoteTally,
};
use soroban_sdk::{Address, Env, String, Vec};

/// Lock tokens — reduces transferable balance and increases locked_balance.
/// Admin or token owner only. Panics if insufficient transferable balance.
pub fn lock_tokens(
    env: &Env,
    asset_id: u64,
    owner: Address,
    amount: i128,
    caller: Address,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();

    // Verify asset is tokenized
    let token_key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&token_key).ok_or(Error::AssetNotTokenized)?;

    // Admin OR token owner can call
    let admin = crate::lib::get_admin(env)?;
    if caller != admin && caller != owner {
        return Err(Error::Unauthorized);
    }

    // Get holder record
    let holder_key = TokenDataKey::TokenHolder(asset_id, owner.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Ensure sufficient transferable balance
    if ownership.balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Move tokens from balance to locked_balance
    ownership.balance -= amount;
    ownership.locked_balance += amount;
    ownership.voting_power = ownership.balance; // locked tokens cannot vote
    ownership.dividend_entitlement = ownership.balance;

    // Update total locked count on asset
    let mut asset_clone = tokenized_asset.clone();
    asset_clone.locked_tokens += amount;
    store.set(&token_key, &asset_clone);

    store.set(&holder_key, &ownership);

    // Emit event
    env.events()
        .publish(("token", "tokens_locked"), (asset_id, owner, amount));

    Ok(())
}

/// Unlock tokens — moves amount from locked_balance back to transferable balance.
/// Admin or token owner only. Panics if insufficient locked balance.
pub fn unlock_tokens(
    env: &Env,
    asset_id: u64,
    owner: Address,
    amount: i128,
    caller: Address,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();

    // Verify asset is tokenized
    let token_key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&token_key).ok_or(Error::AssetNotTokenized)?;

    // Admin OR token owner can call
    let admin = crate::lib::get_admin(env)?;
    if caller != admin && caller != owner {
        return Err(Error::Unauthorized);
    }

    // Get holder record
    let holder_key = TokenDataKey::TokenHolder(asset_id, owner.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Ensure sufficient locked balance
    if ownership.locked_balance < amount {
        return Err(Error::InsufficientLockedTokens);
    }

    // Move tokens from locked_balance to balance
    ownership.locked_balance -= amount;
    ownership.balance += amount;
    ownership.voting_power = ownership.balance;
    ownership.dividend_entitlement = ownership.balance;

    // Update total locked count on asset
    let mut asset_clone = tokenized_asset.clone();
    asset_clone.locked_tokens -= amount;
    store.set(&token_key, &asset_clone);

    store.set(&holder_key, &ownership);

    // Emit event
    env.events()
        .publish(("token", "tokens_unlocked"), (asset_id, owner, amount));

    Ok(())
}
