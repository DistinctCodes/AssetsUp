use crate::error::Error;
use crate::types::{TokenDataKey, TransferRestriction};
use soroban_sdk::{Address, Env, Vec};

/// Set transfer restrictions for an asset (admin only)
pub fn set_restrictions(
    env: &Env,
    asset_id: u64,
    restrictions: TransferRestriction,
    caller: Address,
) {
    caller.require_auth();

    // Check if caller is admin
    let admin: Address = env
        .storage()
        .persistent()
        .get(&crate::lib::DataKey::Admin)
        .expect("Not initialized");

    if caller != admin {
        panic!("Unauthorized");
    }

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    if !env.storage().persistent().has(&key) {
        panic!("{}", Error::AssetNotTokenized as u32);
    }

    // Store the restriction
    let restriction_key = TokenDataKey::TransferRestriction(asset_id);
    env.storage()
        .persistent()
        .set(&restriction_key, &restrictions);

    // Emit event: (asset_id, require_accredited)
    env.events().publish(
        ("transfer", "restriction_set"),
        (asset_id, restrictions.require_accredited),
    );
}

/// Add an address to the whitelist
pub fn add_to_whitelist(env: &Env, asset_id: u64, address: Address, caller: Address) {
    caller.require_auth();

    // Check if caller is admin
    let admin: Address = env
        .storage()
        .persistent()
        .get(&crate::lib::DataKey::Admin)
        .expect("Not initialized");

    if caller != admin {
        panic!("Unauthorized");
    }

    let key = TokenDataKey::Whitelist(asset_id);
    let mut whitelist: Vec<Address> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    // Check if already in whitelist
    if whitelist.iter().any(|a| a == address) {
        return;
    }

    whitelist.push_back(address.clone());
    env.storage().persistent().set(&key, &whitelist);

    // Emit event: (asset_id, address)
    env.events()
        .publish(("transfer", "whitelist_added"), (asset_id, address));
}

/// Remove an address from the whitelist
pub fn remove_from_whitelist(env: &Env, asset_id: u64, address: Address, caller: Address) {
    caller.require_auth();

    // Check if caller is admin
    let admin: Address = env
        .storage()
        .persistent()
        .get(&crate::lib::DataKey::Admin)
        .expect("Not initialized");

    if caller != admin {
        panic!("Unauthorized");
    }

    let key = TokenDataKey::Whitelist(asset_id);
    let mut whitelist: Vec<Address> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    // Find and remove address
    if let Some(index) = whitelist.iter().position(|a| a == address) {
        whitelist.remove(index as u32);
        env.storage().persistent().set(&key, &whitelist);

        // Emit event: (asset_id, address)
        env.events()
            .publish(("transfer", "whitelist_removed"), (asset_id, address));
    }
}

/// Validate if a transfer is allowed based on restrictions
pub fn validate_transfer(
    env: &Env,
    asset_id: u64,
    _from: Address,
    to: Address,
) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Check whitelist: if non-empty, `to` must be whitelisted
    let whitelist_key = TokenDataKey::Whitelist(asset_id);
    let whitelist: Vec<Address> = store.get(&whitelist_key).unwrap_or_else(|| Vec::new(env));

    if !whitelist.is_empty() {
        let is_listed = whitelist.iter().any(|a| a == to);
        if !is_listed {
            return Err(Error::TransferRestrictionFailed);
        }
    }

    let restriction_key = TokenDataKey::TransferRestriction(asset_id);

    // If no restrictions config, allow transfer
    let restriction: TransferRestriction = match store.get(&restriction_key) {
        Some(r) => r,
        None => {
            return Ok(());
        }
    };

    // If accredited investor required, check whitelist as MVP proxy
    if restriction.require_accredited {
        let is_listed = whitelist.iter().any(|a| a == to);
        if !is_listed {
            return Err(Error::AccreditedInvestorRequired);
        }
    }

    Ok(())
}

/// Check if an address is whitelisted
pub fn is_whitelisted(env: &Env, asset_id: u64, address: Address) -> bool {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    let whitelist: Vec<Address> = store.get(&key).unwrap_or_else(|| Vec::new(env));

    whitelist.iter().any(|a| a == address)
}

/// Get whitelist for an asset
pub fn get_whitelist(env: &Env, asset_id: u64) -> Vec<Address> {
    let store = env.storage().persistent();

    let key = TokenDataKey::Whitelist(asset_id);
    store.get(&key).unwrap_or_else(|| Vec::new(env))
}

/// Get transfer restrictions for an asset
pub fn get_restrictions(env: &Env, asset_id: u64) -> Result<TransferRestriction, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::TransferRestriction(asset_id);
    store.get(&key).ok_or(Error::AssetNotTokenized)
}
