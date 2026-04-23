#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String};

/// Represents the current operational status of an asset.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}

/// Represents a registered asset in the system.
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
}

/// Storage keys for type-safe contract state access.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Asset(BytesN<32>),
    OwnerAssets(Address),
    TotalCount,
    Admin,
    Paused,
}

/// Stub trait that will be expanded in later issues.
pub trait ContractTrait {
    /// Initialize the contract.
    fn initialize(env: Env);
}

#[contract]
pub struct ContribContract;

#[contractimpl]
impl ContractTrait for ContribContract {
    fn initialize(_env: Env) {
        // Stub implementation to be expanded later
    }
}
