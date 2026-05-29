use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    WalletNotFound = 1,
    TransactionNotFound = 2,
    NotAnOwner = 3,
    AlreadyApproved = 4,
    ApprovalNotFound = 5,
    AlreadyExecuted = 6,
    InsufficientApprovals = 7,
    InvalidThreshold = 8,
    InsufficientOwners = 9,
}
