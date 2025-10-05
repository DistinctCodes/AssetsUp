use soroban_sdk::{Address, BytesN, String, contracttype};

use crate::types::{AssetStatus, AssetType};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Asset(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Asset {
    pub id: BytesN<32>,
    pub name: String,
    pub asset_type: AssetType,
    pub category: String,
    pub branch_id: BytesN<32>,
    pub department_id: u64,
    pub status: AssetStatus,
    pub purchase_date: u64,
    pub purchase_cost: i128,
    pub current_value: i128,
    pub warranty_expiry: u64,
    pub stellar_token_id: BytesN<32>,
    pub owner: Address,
}

// Note: Contract methods implemented in lib.rs
