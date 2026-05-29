use soroban_sdk::{contracttype, Address, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Wallet {
    pub id: u64,
    pub owners: Vec<Address>,
    pub threshold: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transaction {
    pub id: u64,
    pub wallet_id: u64,
    pub initiator: Address,
    pub approvers: Vec<Address>,
    pub approvals: u32,
    pub executed: bool,
}

/// Storage keys for the opsce multisig contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores a `Wallet` keyed by its `wallet_id`.
    Wallet(u64),
    /// Stores a `Transaction` keyed by `(wallet_id, tx_id)`.
    Transaction(u64, u64),
    /// Auto-incrementing transaction id per wallet.
    NextTxId(u64),
    /// Auto-incrementing wallet id (instance scope).
    NextWalletId,
}
