use soroban_sdk::{Address, Env, String, Vec};

// Use a tuple key `(namespace, kind, asset_id)` to avoid serialization coupling
fn whitelist_key<'a>(env: &'a Env, asset_id: u64) -> (String, String, u64) {
    (
        String::from_str(env, "opsce"),
        String::from_str(env, "whitelist"),
        asset_id,
    )
}

fn enabled_key<'a>(env: &'a Env, asset_id: u64) -> (String, String, u64) {
    (
        String::from_str(env, "opsce"),
        String::from_str(env, "whitelist_enabled"),
        asset_id,
    )
}

/// Add an address to the whitelist for `asset_id`.
/// Note: authorization should be handled by the caller (contract wrapper).
pub fn add_to_whitelist(env: &Env, asset_id: u64, address: Address) {
    let store = env.storage().persistent();

    let key = whitelist_key(env, asset_id);
    let mut list: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));

    // Prevent duplicates
    if !list.iter().any(|a| a == address) {
        list.push_back(address.clone());
        store.set(&key, &list);
    }
}

pub fn remove_from_whitelist(env: &Env, asset_id: u64, address: Address) {
    let store = env.storage().persistent();

    let key = whitelist_key(env, asset_id);
    let mut list: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));

    if let Some(pos) = list.iter().position(|a| a == address) {
        list.remove(pos as u32);
        store.set(&key, &list);
    }
}

pub fn is_whitelisted(env: &Env, asset_id: u64, address: Address) -> bool {
    let store = env.storage().persistent();
    let key = whitelist_key(env, asset_id);
    let list: Vec<Address> = store.get(&key).flatten().unwrap_or_else(|| Vec::new(env));
    list.iter().any(|a| a == address)
}

pub fn set_whitelist_enabled(env: &Env, asset_id: u64, enabled: bool) {
    let store = env.storage().persistent();
    let key = enabled_key(env, asset_id);
    store.set(&key, &enabled);
}

pub fn is_whitelist_enabled(env: &Env, asset_id: u64) -> bool {
    let store = env.storage().persistent();
    let key = enabled_key(env, asset_id);
    store.get(&key).unwrap_or(false)
}

pub fn get_whitelist(env: &Env, asset_id: u64) -> Vec<Address> {
    let store = env.storage().persistent();
    let key = whitelist_key(env, asset_id);
    store.get(&key).flatten().unwrap_or_else(|| Vec::new(env))
}
