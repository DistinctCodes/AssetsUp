use soroban_sdk::{Address, BytesN, String, contracttype};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Branch(BytesN<32>),
    AssetList(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Branch {
    pub id: BytesN<32>,
    pub name: String,
    pub location: String,
    pub admin: Address,
}

// Note: Contract methods implemented in lib.rs
