use soroban_sdk::{contracterror, panic_with_error, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    AdminNotFound = 2,
    AssetAlreadyExists = 3,
    AssetNotFound = 4,
    Unauthorized = 5,
    // Tokenization errors
    AssetAlreadyTokenized = 6,
    AssetNotTokenized = 7,
    InvalidTokenSupply = 8,
    InsufficientBalance = 9,
    InsufficientLockedTokens = 10,
    HolderNotFound = 11,
    // Voting errors
    InsufficientVotingPower = 12,
    AlreadyVoted = 13,
    ProposalNotFound = 14,
    InvalidProposal = 15,
    VotingPeriodEnded = 16,
    // Misc
    ContractPaused = 17,
    InvalidAssetName = 18,
    InvalidPurchaseValue = 19,
    InvalidMetadataUri = 20,
    InvalidOwnerAddress = 21,
}

pub fn handle_error(env: &Env, error: Error) -> ! {
    panic_with_error!(env, error);
}
