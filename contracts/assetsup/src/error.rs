use soroban_sdk::{contracterror, panic_with_error, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    AdminNotFound = 2,
    AssetAlreadyExists = 3,
    AssetNotFound = 4,
    BranchAlreadyExists = 5,
    BranchNotFound = 6,
    SubscriptionAlreadyExists = 7,
    Unauthorized = 8,
    InvalidPayment = 9,
    // Tokenization errors
    AssetAlreadyTokenized = 10,
    AssetNotTokenized = 11,
    InvalidTokenSupply = 12,
    InvalidTokenDecimals = 13,
    InsufficientBalance = 14,
    InsufficientLockedTokens = 15,
    TokensAreLocked = 16,
    TransferRestrictionFailed = 17,
    NotWhitelisted = 18,
    AccreditedInvestorRequired = 19,
    GeographicRestriction = 20,
    // Voting errors
    InsufficientVotingPower = 21,
    AlreadyVoted = 22,
    ProposalNotFound = 23,
    InvalidProposal = 24,
    VotingPeriodEnded = 25,
    // Dividend errors
    NoDividendsToClaim = 26,
    InvalidDividendAmount = 27,
    // Detokenization errors
    DetokenizationNotApproved = 28,
    DetokenizationAlreadyProposed = 29,
    // Valuation errors
    InvalidValuation = 30,
    // Holder enumeration errors
    HolderNotFound = 31,
    // Math errors
    MathOverflow = 32,
    MathUnderflow = 33,
    // Contract state errors
    ContractPaused = 34,
    ContractNotInitialized = 35,
    // Validation errors
    InvalidAssetName = 36,
    InvalidPurchaseValue = 37,
    InvalidMetadataUri = 38,
    InvalidOwnerAddress = 39,

    LeaseNotFound = 40,
    LeaseAlreadyExists = 41,
    AssetAlreadyLeased = 42,
    InvalidLeaseStatus = 43,
    LeaseAlreadyStarted = 44,
    LeaseNotExpired = 45,
    InvalidTimestamps = 46,
}

pub fn handle_error(env: &Env, error: Error) -> ! {
    panic_with_error!(env, error);
}

#[allow(dead_code)]
pub fn dummy_function(_env: Env, asset_exists: bool) -> Result<(), Error> {
    if asset_exists {
        Err(Error::AssetAlreadyExists)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_dummy_function_asset_exists() {
        let env = Env::default();
        let result = dummy_function(env.clone(), true);
        assert_eq!(result, Err(Error::AssetAlreadyExists));
    }

    #[test]
    fn test_dummy_function_asset_not_exists() {
        let env = Env::default();
        let result = dummy_function(env.clone(), false);
        assert_eq!(result, Ok(()));
    }
}
