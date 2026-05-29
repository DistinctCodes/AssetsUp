use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MaintenanceStatus {
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MaintenanceRecordType {
    Preventive,
    Corrective,
    Emergency,
    Inspection,
    Upgrade,
    Calibration,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MaintenanceRecord {
    pub record_id: BytesN<32>,
    pub asset_id: String,
    pub record_type: MaintenanceRecordType,
    pub provider: Address,
    pub scheduled_date: u64,
    pub cost: i128,
    pub notes: String,
    pub status: MaintenanceStatus,
    pub created_at: u64,
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
    /// Stores a `MaintenanceRecord` keyed by its content-derived id.
    MaintenanceRecord(BytesN<32>),
    /// Per-asset index of `record_id`s for fast retrieval.
    MaintenanceIndex(String),
}
