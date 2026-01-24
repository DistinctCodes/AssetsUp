use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidThreshold = 4,
    InsufficientOwners = 5,
    TransactionNotFound = 6,
    TransactionAlreadyExecuted = 7,
    TransactionExpired = 8,
    AlreadyConfirmed = 9,
    CannotConfirmOwnTransaction = 10,
    OwnerAlreadyExists = 11,
    OwnerNotFound = 12,
    ProposalNotFound = 13,
    WalletFrozen = 14,
    DailyLimitExceeded = 15,
    InvalidProposal = 16,
    NotAnOwner = 17,
    ThresholdTooHigh = 18,
    InvalidArguments = 19,
}
