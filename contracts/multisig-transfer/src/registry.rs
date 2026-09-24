//! Cross-contract calls into the asset registry.
//!
//! These were placeholders: `asset_exists` returned `true` unconditionally,
//! `asset_is_retired` returned `false`, `get_owner` always errored, and
//! `transfer_owner` did nothing and returned `Ok`. That last one meant
//! `execute_transfer` reported success without ever moving ownership — the
//! entire purpose of this contract was a no-op.
//!
//! They now invoke the registry for real, using
//! [`Env::invoke_contract`] rather than importing the registry crate, so the
//! two contracts stay decoupled and either can be redeployed independently.
//!
//! ## Expected registry interface
//!
//! The contract at the stored `AssetRegistry` address must expose:
//!
//! ```text
//! check_asset_exists(asset_id: BytesN<32>) -> bool
//! get_asset(asset_id: BytesN<32>) -> Asset          // with .owner and .status
//! transfer_asset_ownership(asset_id: BytesN<32>, new_owner: Address, caller: Address)
//! ```
//!
//! `assetsup` satisfies this.
//!
//! ## Authorization
//!
//! `transfer_asset_ownership` authenticates its `caller` and requires it to be
//! the asset's current owner. This contract passes its **own** address as
//! `caller`, which works because a contract implicitly authorizes calls it
//! makes itself. The consequence is a deployment requirement: **assets governed
//! by this workflow must be owned by this contract's address**, which then
//! releases them once the approval threshold is met. An asset owned by an
//! ordinary account cannot be moved by this contract, and the transfer will
//! fail at the registry rather than silently succeeding.

use soroban_sdk::{Address, BytesN, Env, IntoVal, Symbol, Val, Vec};

use crate::errors::MultiSigError;

/// Status values mirrored from the registry's `AssetStatus`. Kept as a local
/// constant rather than a shared type so the crates stay decoupled; the
/// registry's discriminant order is part of the interface contract above.
const STATUS_RETIRED: u32 = 2;

pub fn asset_exists(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
) -> Result<bool, MultiSigError> {
    let args: Vec<Val> = (asset_id.clone(),).into_val(e);
    let exists: bool = e.invoke_contract(registry, &Symbol::new(e, "check_asset_exists"), args);
    Ok(exists)
}

pub fn asset_is_retired(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
) -> Result<bool, MultiSigError> {
    let info = asset_info(e, registry, asset_id)?;
    Ok(info.1 == STATUS_RETIRED)
}

pub fn get_owner(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
) -> Result<Address, MultiSigError> {
    Ok(asset_info(e, registry, asset_id)?.0)
}

/// Moves ownership in the registry.
///
/// Passes this contract's own address as `caller`; see the module docs for why
/// that requires governed assets to be owned by this contract.
pub fn transfer_owner(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
    new_owner: &Address,
) -> Result<(), MultiSigError> {
    let caller = e.current_contract_address();
    let args: Vec<Val> = (asset_id.clone(), new_owner.clone(), caller).into_val(e);

    e.invoke_contract::<()>(registry, &Symbol::new(e, "transfer_asset_ownership"), args);

    Ok(())
}

/// Reads `(owner, status)` from the registry's asset info.
///
/// `get_asset_info` returns a struct whose first two fields this contract
/// cares about. Decoding it positionally keeps the crates decoupled at the
/// cost of depending on field order, which is why the expected interface is
/// spelled out in the module docs.
fn asset_info(
    e: &Env,
    registry: &Address,
    asset_id: &BytesN<32>,
) -> Result<(Address, u32), MultiSigError> {
    if !asset_exists(e, registry, asset_id)? {
        return Err(MultiSigError::AssetNotFound);
    }

    let args: Vec<Val> = (asset_id.clone(),).into_val(e);
    let info: AssetInfo = e.invoke_contract(registry, &Symbol::new(e, "get_asset_info"), args);

    Ok((info.owner, status_code(&info.status)))
}

fn status_code(status: &AssetStatus) -> u32 {
    match status {
        AssetStatus::Active => 0,
        AssetStatus::Transferred => 1,
        AssetStatus::Retired => STATUS_RETIRED,
    }
}

/// Mirror of the registry's `AssetInfo`, declared locally so this crate does
/// not depend on the registry crate. The field order and names must match.
#[soroban_sdk::contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetInfo {
    pub id: BytesN<32>,
    pub name: soroban_sdk::String,
    pub category: soroban_sdk::String,
    pub owner: Address,
    pub status: AssetStatus,
}

/// Mirror of the registry's `AssetStatus`. Variant order is significant.
#[soroban_sdk::contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}
