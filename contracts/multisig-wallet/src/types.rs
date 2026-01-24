use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransactionType {
    Transfer,
    Update,
    Admin,
    Emergency,
    Routine,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Executed,
    Expired,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transaction {
    pub id: u64,
    pub tx_type: TransactionType,
    pub target: Address,
    pub function_name: String,
    pub parameters: Vec<soroban_sdk::Val>,
    pub initiator: Address,
    pub created_at: u64,
    pub deadline: u64,
    pub required_confirmations: u32,
    pub confirmations_count: u32,
    pub status: TransactionStatus,
    pub execution_timestamp: u64,
    pub value: u128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OwnerType {
    Primary,
    Secondary,
    Emergency,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnerProfile {
    pub address: Address,
    pub added_at: u64,
    pub added_by: Address,
    pub owner_type: OwnerType,
    pub voting_weight: u32,
    pub is_active: bool,
    pub total_confirmations: u32,
    pub last_activity: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalType {
    AddOwner,
    RemoveOwner,
    ChangeThreshold,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnershipProposal {
    pub id: u64,
    pub proposal_type: ProposalType,
    pub target_address: Option<Address>,
    pub new_threshold: Option<u32>,
    pub proposer: Address,
    pub timestamp: u64,
    pub confirmations_received: u32,
    pub status: ProposalStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Owners,              // Vec<Address>
    OwnerProfile(Address),
    Threshold,           // u32
    NextTxId,            // u64
    Transaction(u64),
    Confirmation(u64, Address), // bool
    DailyLimit,          // u128
    DailySpent(u64),     // day_timestamp -> u128
    Frozen,              // bool
    NextProposalId,      // u64
    Proposal(u64),
    ProposalConfirmation(u64, Address),
    Admin,               // Address (for initialization)
}
