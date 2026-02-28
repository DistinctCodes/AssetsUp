use soroban_sdk::{Address, BytesN, Env};

use crate::{errors::MultiSigError};

/// NOTE:
/// Replace these methods with your real Asset Registry contract interface.
/// This contract assumes registry supports:
/// - asset_exists(asset_id) -> bool
/// - is_retired(asset_id) -> bool
/// - get_owner(asset_id) -> Address
/// - transfer(asset_id, new_owner)
pub fn asset_exists(e: &Env, registry: &Address, asset_id: &BytesN<32>) -> Result<bool, MultiSigError> {
    // implement using generated client for registry
    // registry_client.asset_exists(asset_id)
    let _ = (e, registry, asset_id);
    Ok(true) // placeholder
}

pub fn asset_is_retired(e: &Env, registry: &Address, asset_id: &BytesN<32>) -> Result<bool, MultiSigError> {
    let _ = (e, registry, asset_id);
    Ok(false) // placeholder
}

pub fn get_owner(e: &Env, registry: &Address, asset_id: &BytesN<32>) -> Result<Address, MultiSigError> {
    let _ = (e, registry, asset_id);
    Err(MultiSigError::RegistryCallFailed)
}

pub fn transfer_owner(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
    new_owner: &Address,
) -> Result<(), MultiSigError> {
    let _ = (e, registry, asset_id, new_owner);
    // registry_client.transfer(asset_id, new_owner)
    Ok(())
}
