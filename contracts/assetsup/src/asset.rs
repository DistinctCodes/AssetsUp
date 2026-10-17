use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

use crate::types::{AssetStatus, CustomAttribute};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Asset(BytesN<32>),
    OwnerRegistry(Address),
    AssetCounter,
    /// Append-only, oldest-first list of ownership transfers for one asset.
    TransferHistory(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Asset {
    pub id: BytesN<32>,
    pub name: String,
    pub description: String,
    pub category: String,
    pub owner: Address,
    pub registration_timestamp: u64,
    pub last_transfer_timestamp: u64,
    pub status: AssetStatus,
    pub metadata_uri: String,
    pub purchase_value: i128,
    pub custom_attributes: Vec<CustomAttribute>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetInfo {
    pub id: BytesN<32>,
    pub name: String,
    pub category: String,
    pub owner: Address,
    pub status: AssetStatus,
}

/// One entry in an asset's on-chain transfer history.
///
/// Recorded on every successful [`crate::AssetUpContract::transfer_asset_ownership`]
/// call, oldest first, so integrators can reconstruct the chain of custody
/// without replaying events. `from` is the owner that transferred the asset and
/// `to` is the new owner.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRecord {
    pub from: Address,
    pub to: Address,
    pub timestamp: u64,
}

// Note: Contract methods implemented in lib.rs
