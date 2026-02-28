use crate::error::Error;
use crate::types::{TokenDataKey, TransferRestriction};
use soroban_sdk::{Address, Env, Vec};

/// Set transfer restrictions for an asset
pub fn set_transfer_restriction(
    env: &Env,
    asset_id: u64,
    restriction: TransferRestriction,
) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Store the restriction
    let key = TokenDataKey::TransferRestriction(asset_id);
    store.set(&key, &restriction);

    // Emit event: (asset_id, require_accredited)
    env.events().publish(
        ("transfer", "restriction_set"),
        (asset_id, restriction.require_accredited),
    );

    Ok(())
}

/// Add an address to the whitelist
pub fn add_to_whitelist(env: &Env, asset_id: u64, address: Address) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    let mut whitelist: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));

    // Check if already in whitelist
    if whitelist.iter().any(|a| a == address) {
        return Ok(());
    }

    whitelist.push_back(address.clone());
    store.set(&key, &whitelist);

    // Emit event: (asset_id, address)
    env.events()
        .publish(("transfer", "whitelist_added"), (asset_id, address));

    Ok(())
}

/// Remove an address from the whitelist
pub fn remove_from_whitelist(env: &Env, asset_id: u64, address: Address) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    let mut whitelist: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));

    // Find and remove address
    if let Some(index) = whitelist.iter().position(|a| a == address) {
        whitelist.remove(index as u32);
        store.set(&key, &whitelist);

        // Emit event: (asset_id, address)
        env.events()
            .publish(("transfer", "whitelist_removed"), (asset_id, address));
    }

    Ok(())
}

/// Check if an address is whitelisted
pub fn is_whitelisted(env: &Env, asset_id: u64, address: Address) -> Result<bool, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    let whitelist: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));

    Ok(whitelist.iter().any(|a| a == address))
}

/// Get whitelist for an asset
pub fn get_whitelist(env: &Env, asset_id: u64) -> Result<Vec<Address>, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    Ok(store.get(&key).flatten().unwrap_or_else(|| Vec::new(env)))
}

/// Validate if a transfer is allowed based on restrictions
pub fn validate_transfer(
    env: &Env,
    asset_id: u64,
    _from: Address,
    to: Address,
) -> Result<bool, Error> {
    let store = env.storage().persistent();

    // Check whitelist: if non-empty, `to` must be whitelisted
    let whitelist_key = TokenDataKey::Whitelist(asset_id);
    let whitelist: Vec<Address> = store
        .get(&whitelist_key)
        .flatten()
        .unwrap_or_else(|| Vec::new(env));

    if !whitelist.is_empty() {
        let is_listed = whitelist.iter().any(|a| a == to);
        if !is_listed {
            return Err(Error::TransferRestrictionFailed);
        }
    }

    let restriction_key = TokenDataKey::TransferRestriction(asset_id);

    // If no restrictions config, allow transfer
    let restriction: TransferRestriction = match store.get(&restriction_key) {
        Some(Some(r)) => r,
        _ => {
            return Ok(true);
        }
    };

    // If accredited investor required, check whitelist as MVP proxy
    if restriction.require_accredited {
        let is_listed = whitelist.iter().any(|a| a == to);
        if !is_listed {
            return Err(Error::AccreditedInvestorRequired);
        }
    }

    Ok(true)
}

/// Check if transfer restrictions are enabled for an asset
#[allow(dead_code)]
pub fn has_transfer_restrictions(env: &Env, asset_id: u64) -> Result<bool, Error> {
    let store = env.storage().persistent();

    let restriction_key = TokenDataKey::TransferRestriction(asset_id);
    Ok(store.has(&restriction_key))
}

/// Get transfer restrictions for an asset
#[allow(dead_code)]
pub fn get_transfer_restriction(env: &Env, asset_id: u64) -> Result<TransferRestriction, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TransferRestriction(asset_id);
    store.get(&key).ok_or(Error::AssetNotTokenized)
}

/// Clear transfer restrictions
#[allow(dead_code)]
pub fn clear_transfer_restrictions(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TransferRestriction(asset_id);
    if store.has(&key) {
        store.remove(&key);
    }

    Ok(())
}
