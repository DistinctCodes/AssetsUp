use soroban_sdk::{contracttype, Address, BytesN, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferRequest {
    pub request_id: u64,

    pub asset_id: BytesN<32>,
    pub asset_category: BytesN<32>,

    pub current_owner: Address,
    pub new_owner: Address,

    pub initiator: Address,
    pub created_at: u64,

    pub required_approvals: u32,
    pub received_approvals: u32,

    pub status: RequestStatus,

    pub notes_hash: BytesN<32>,

    // absolute timestamps
    pub expires_at: u64,
    pub approval_deadline: u64,

    // optional time-lock: transfer can only execute after this time
    pub execute_after: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ApprovalRule {
    pub category: BytesN<32>,
    pub required_approvals: u32,
    pub approvers: Vec<Address>,

    pub approval_timeout_secs: u64, // used to compute approval_deadline
    pub auto_approve: bool,         // optional workflow support
    pub priority: u32,
}
