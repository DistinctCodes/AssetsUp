use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

use crate::types::{AssetStatus, CustomAttribute};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Asset(BytesN<32>),
    OwnerRegistry(Address),
    AssetCounter,
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

// Note: Contract methods implemented in lib.rs
