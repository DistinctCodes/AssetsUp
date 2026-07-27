use soroban_sdk::{contracterror, panic_with_error, Env};

/// Contract errors for `assetsup`.
///
/// Codes follow the workspace allocation in `contracts/ERRORS.md`:
///
/// - **1–99** are *shared* across every contract in the workspace and mean the
///   same thing everywhere.
/// - **100–199** belong to `assetsup` alone.
///
/// Because the ranges do not overlap, a code identifies its origin contract on
/// its own. Previously every crate numbered from 1 independently, so code `1`
/// meant `AlreadyInitialized` here but `NotInitialized` in `multisig-transfer`
/// — the exact opposite condition.
///
/// A published code is permanent. Retiring a variant leaves its number unused;
/// it is never reassigned, because a backend built against the old meaning
/// would silently misinterpret the new one.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // ---------------------------------------------------------------
    // Shared: 1–99. Mirrored at the same codes by every other crate.
    // ---------------------------------------------------------------
    /// An initialize entrypoint was called on a contract that already holds
    /// state.
    AlreadyInitialized = 1,
    /// An entrypoint was called before the contract was initialized.
    NotInitialized = 2,
    /// The caller authenticated but is not permitted to perform this action.
    Unauthorized = 3,
    /// An argument failed validation and no more specific code applies.
    InvalidInput = 4,
    /// A referenced entity does not exist and no more specific code applies.
    NotFound = 5,
    /// A mutating entrypoint was called while the emergency pause is active.
    ContractPaused = 6,
    /// An arithmetic operation would exceed the type's range.
    MathOverflow = 7,
    /// A subtraction would go below the type's minimum.
    MathUnderflow = 8,

    // ---------------------------------------------------------------
    // Registry: 100–119
    // ---------------------------------------------------------------
    /// No admin is stored, so the contract is not usable.
    AdminNotFound = 100,
    /// An asset with this id is already registered.
    AssetAlreadyExists = 101,
    /// No asset is registered under this id.
    AssetNotFound = 102,
    /// A branch with this id already exists.
    BranchAlreadyExists = 103,
    /// No branch is registered under this id.
    BranchNotFound = 104,
    /// A subscription already exists for this account.
    SubscriptionAlreadyExists = 105,
    /// The payment supplied is missing or does not cover the amount due.
    InvalidPayment = 106,
    /// The contract has not been initialized with its metadata.
    ContractNotInitialized = 107,

    // ---------------------------------------------------------------
    // Tokenization and balances: 120–139
    // ---------------------------------------------------------------
    /// This asset has already been tokenized.
    AssetAlreadyTokenized = 120,
    /// This asset has not been tokenized, so it has no token supply.
    AssetNotTokenized = 121,
    /// The requested total supply is zero or negative.
    InvalidTokenSupply = 122,
    /// The requested decimal precision is outside the permitted range.
    InvalidTokenDecimals = 123,
    /// The holder's balance is lower than the amount requested.
    InsufficientBalance = 124,
    /// Fewer tokens are locked than the amount being unlocked.
    InsufficientLockedTokens = 125,
    /// The holder's tokens are locked and cannot be moved yet.
    TokensAreLocked = 126,
    /// A transfer restriction on this asset rejected the transfer.
    TransferRestrictionFailed = 127,
    /// The address is not on this asset's transfer whitelist.
    NotWhitelisted = 128,
    /// This asset may only be held by accredited investors.
    AccreditedInvestorRequired = 129,
    /// The address's jurisdiction is not permitted to hold this asset.
    GeographicRestriction = 130,
    /// No ownership record exists for this holder.
    HolderNotFound = 131,

    // ---------------------------------------------------------------
    // Voting: 140–149
    // ---------------------------------------------------------------
    /// The voter's balance is below the minimum voting threshold.
    InsufficientVotingPower = 140,
    /// This address has already voted on this proposal.
    AlreadyVoted = 141,
    /// No proposal exists under this id.
    ProposalNotFound = 142,
    /// The proposal is malformed or in a state that does not allow this action.
    InvalidProposal = 143,
    /// The voting period for this proposal has closed.
    VotingPeriodEnded = 144,

    // ---------------------------------------------------------------
    // Dividends: 150–159
    // ---------------------------------------------------------------
    /// The holder has no unclaimed dividends.
    NoDividendsToClaim = 150,
    /// The distribution amount is zero or negative, or revenue sharing is off.
    InvalidDividendAmount = 151,

    // ---------------------------------------------------------------
    // Detokenization and valuation: 160–169
    // ---------------------------------------------------------------
    /// The detokenization proposal has not reached its approval threshold.
    DetokenizationNotApproved = 160,
    /// A detokenization proposal is already open for this asset.
    DetokenizationAlreadyProposed = 161,
    /// The supplied valuation is zero or negative.
    InvalidValuation = 162,

    // ---------------------------------------------------------------
    // Validation: 170–179
    // ---------------------------------------------------------------
    /// The asset name is empty or too long.
    InvalidAssetName = 170,
    /// The purchase value is negative.
    InvalidPurchaseValue = 171,
    /// The metadata URI is empty or malformed.
    InvalidMetadataUri = 172,
    /// The owner address is the zero address, or otherwise not usable.
    InvalidOwnerAddress = 173,

    // ---------------------------------------------------------------
    // Leasing and insurance: 180–199
    // ---------------------------------------------------------------
    /// No lease exists under this id.
    LeaseNotFound = 180,
    /// A lease already exists under this id.
    LeaseAlreadyExists = 181,
    /// The asset is already out on an active lease.
    AssetAlreadyLeased = 182,
    /// The lease is not in a state that permits this action.
    InvalidLeaseStatus = 183,
    /// The lease has already started and can no longer be modified this way.
    LeaseAlreadyStarted = 184,
    /// The lease has not yet reached its end date.
    LeaseNotExpired = 185,
    /// The supplied start and end timestamps are inconsistent.
    InvalidTimestamps = 186,
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

    #[test]
    fn shared_errors_occupy_the_shared_range() {
        // 1-99 must mean the same thing in every contract; these codes are
        // mirrored by multisig-wallet and multisig-transfer.
        assert_eq!(Error::AlreadyInitialized as u32, 1);
        assert_eq!(Error::NotInitialized as u32, 2);
        assert_eq!(Error::Unauthorized as u32, 3);
        assert_eq!(Error::InvalidInput as u32, 4);
        assert_eq!(Error::NotFound as u32, 5);
        assert_eq!(Error::ContractPaused as u32, 6);
        assert_eq!(Error::MathOverflow as u32, 7);
        assert_eq!(Error::MathUnderflow as u32, 8);
    }

    #[test]
    fn contract_specific_errors_stay_inside_the_assetsup_block() {
        // Every non-shared variant must fall in 100-199 so a bare code
        // identifies assetsup as its origin.
        let codes = [
            Error::AdminNotFound as u32,
            Error::AssetAlreadyExists as u32,
            Error::AssetNotFound as u32,
            Error::BranchAlreadyExists as u32,
            Error::BranchNotFound as u32,
            Error::SubscriptionAlreadyExists as u32,
            Error::InvalidPayment as u32,
            Error::ContractNotInitialized as u32,
            Error::AssetAlreadyTokenized as u32,
            Error::AssetNotTokenized as u32,
            Error::InvalidTokenSupply as u32,
            Error::InvalidTokenDecimals as u32,
            Error::InsufficientBalance as u32,
            Error::InsufficientLockedTokens as u32,
            Error::TokensAreLocked as u32,
            Error::TransferRestrictionFailed as u32,
            Error::NotWhitelisted as u32,
            Error::AccreditedInvestorRequired as u32,
            Error::GeographicRestriction as u32,
            Error::HolderNotFound as u32,
            Error::InsufficientVotingPower as u32,
            Error::AlreadyVoted as u32,
            Error::ProposalNotFound as u32,
            Error::InvalidProposal as u32,
            Error::VotingPeriodEnded as u32,
            Error::NoDividendsToClaim as u32,
            Error::InvalidDividendAmount as u32,
            Error::DetokenizationNotApproved as u32,
            Error::DetokenizationAlreadyProposed as u32,
            Error::InvalidValuation as u32,
            Error::InvalidAssetName as u32,
            Error::InvalidPurchaseValue as u32,
            Error::InvalidMetadataUri as u32,
            Error::InvalidOwnerAddress as u32,
            Error::LeaseNotFound as u32,
            Error::LeaseAlreadyExists as u32,
            Error::AssetAlreadyLeased as u32,
            Error::InvalidLeaseStatus as u32,
            Error::LeaseAlreadyStarted as u32,
            Error::LeaseNotExpired as u32,
            Error::InvalidTimestamps as u32,
        ];

        for code in codes {
            assert!(
                (100..200).contains(&code),
                "assetsup error code is outside its allocated 100-199 block"
            );
        }
    }
}
