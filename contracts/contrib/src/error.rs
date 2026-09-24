use soroban_sdk::{contracterror, panic_with_error, Env};

/// Contract errors for `contrib`.
///
/// Codes follow the workspace allocation in `contracts/ERRORS.md`:
///
/// - **1–99** are *shared* across every contract and mean the same thing
///   everywhere.
/// - **200–299** belong to `contrib` alone.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // ---------------------------------------------------------------
    // Shared: 1–99. Same meaning in every contract in the workspace.
    // ---------------------------------------------------------------
    /// `initialize` was called on a contract that already has state.
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
    // Registry / assets: 200–219
    // ---------------------------------------------------------------
    /// No asset is registered under this id.
    AssetNotFound = 200,
    /// An asset with this id is already registered.
    AssetAlreadyExists = 201,
    /// The asset is retired and cannot be transferred or mutated.
    AssetRetired = 202,

    // ---------------------------------------------------------------
    // Insurance: 220–239
    // ---------------------------------------------------------------
    /// No insurance policy exists under this id.
    PolicyNotFound = 220,
    /// No insurance claim exists under this id.
    ClaimNotFound = 221,

    // ---------------------------------------------------------------
    // Lease: 240–249
    // ---------------------------------------------------------------
    /// No lease exists under this id.
    LeaseNotFound = 240,

    // ---------------------------------------------------------------
    // Escrow: 250–259
    // ---------------------------------------------------------------
    /// No escrow exists under this id.
    EscrowNotFound = 250,

    // ---------------------------------------------------------------
    // KYC: 260–269
    // ---------------------------------------------------------------
    /// No KYC record exists for this address.
    KycRecordNotFound = 260,

    // ---------------------------------------------------------------
    // Staking: 270–279
    // ---------------------------------------------------------------
    /// No stake exists for this address / period.
    StakeNotFound = 270,
    /// Reward period data is missing.
    RewardPeriodNotFound = 271,
}

/// Panic with a typed contract error so clients can match on the code.
pub fn handle_error(env: &Env, error: Error) -> ! {
    panic_with_error!(env, error);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_errors_occupy_the_shared_range() {
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
    fn contract_specific_errors_stay_inside_the_contrib_block() {
        let codes = [
            Error::AssetNotFound as u32,
            Error::AssetAlreadyExists as u32,
            Error::AssetRetired as u32,
            Error::PolicyNotFound as u32,
            Error::ClaimNotFound as u32,
            Error::LeaseNotFound as u32,
            Error::EscrowNotFound as u32,
            Error::KycRecordNotFound as u32,
            Error::StakeNotFound as u32,
            Error::RewardPeriodNotFound as u32,
        ];
        for code in codes {
            assert!(
                (200..300).contains(&code),
                "contrib error code is outside its allocated 200-299 block"
            );
        }
    }
}
