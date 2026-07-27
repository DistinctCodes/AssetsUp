use soroban_sdk::contracterror;

/// Contract errors for `multisig-wallet`.
///
/// Codes follow the workspace allocation in `contracts/ERRORS.md`:
///
/// - **1–99** are *shared* across every contract and mean the same thing
///   everywhere.
/// - **300–399** belong to `multisig-wallet` alone.
///
/// Previously this enum numbered from 1 independently, so code `3` meant
/// `Unauthorized` here but `AssetAlreadyExists` in `assetsup` — a backend
/// could not interpret a bare code without also knowing which contract
/// produced it.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // ---------------------------------------------------------------
    // Shared: 1–99. Same meaning in every contract in the workspace.
    // ---------------------------------------------------------------
    /// `initialize` was called on a wallet that already has owners.
    AlreadyInitialized = 1,
    /// An entrypoint was called before the wallet was initialized.
    NotInitialized = 2,
    /// The caller authenticated but is not permitted to perform this action.
    Unauthorized = 3,
    /// An argument failed validation and no more specific code applies.
    InvalidArguments = 4,

    // ---------------------------------------------------------------
    // Transaction lifecycle: 300–319
    // ---------------------------------------------------------------
    /// No transaction exists under this id.
    TransactionNotFound = 300,
    /// The transaction has already been executed, cancelled, or expired.
    TransactionAlreadyExecuted = 301,
    /// The transaction is past its deadline.
    TransactionExpired = 302,
    /// This owner has already confirmed this transaction or proposal.
    AlreadyConfirmed = 303,
    /// The initiator may not confirm their own transaction.
    CannotConfirmOwnTransaction = 304,

    // ---------------------------------------------------------------
    // Owner and threshold governance: 320–339
    // ---------------------------------------------------------------
    /// The requested threshold is zero, or exceeds the owner count.
    InvalidThreshold = 320,
    /// The wallet would be left with fewer than two owners, or with a
    /// threshold its remaining owners could never reach.
    InsufficientOwners = 321,
    /// This address is already an owner.
    OwnerAlreadyExists = 322,
    /// This address is not an owner of the wallet.
    OwnerNotFound = 323,
    /// No proposal exists under this id.
    ProposalNotFound = 324,
    /// The proposal is malformed, or not in a state that allows this action.
    InvalidProposal = 325,
    /// The caller is not an owner and may not take part in the wallet.
    NotAnOwner = 326,
    /// The requested threshold exceeds the number of owners.
    ThresholdTooHigh = 327,

    // ---------------------------------------------------------------
    // Emergency controls and limits: 340–349
    // ---------------------------------------------------------------
    /// The wallet is frozen; mutating operations are rejected.
    WalletFrozen = 340,
    /// The transaction would exceed the configured daily spend limit.
    DailyLimitExceeded = 341,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_errors_occupy_the_shared_range() {
        // These codes must match assetsup and multisig-transfer exactly.
        assert_eq!(Error::AlreadyInitialized as u32, 1);
        assert_eq!(Error::NotInitialized as u32, 2);
        assert_eq!(Error::Unauthorized as u32, 3);
        assert_eq!(Error::InvalidArguments as u32, 4);
    }

    #[test]
    fn contract_specific_errors_stay_inside_the_wallet_block() {
        let codes = [
            Error::TransactionNotFound as u32,
            Error::TransactionAlreadyExecuted as u32,
            Error::TransactionExpired as u32,
            Error::AlreadyConfirmed as u32,
            Error::CannotConfirmOwnTransaction as u32,
            Error::InvalidThreshold as u32,
            Error::InsufficientOwners as u32,
            Error::OwnerAlreadyExists as u32,
            Error::OwnerNotFound as u32,
            Error::ProposalNotFound as u32,
            Error::InvalidProposal as u32,
            Error::NotAnOwner as u32,
            Error::ThresholdTooHigh as u32,
            Error::WalletFrozen as u32,
            Error::DailyLimitExceeded as u32,
        ];
        for code in codes {
            assert!(
                (300..400).contains(&code),
                "multisig-wallet error code is outside its allocated 300-399 block"
            );
        }
    }
}
