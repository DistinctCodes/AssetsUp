use soroban_sdk::{contracterror, panic_with_error, Env};

/// Contract errors for `asset-maintenance`.
///
/// Codes follow the workspace allocation in `contracts/ERRORS.md`:
///
/// - **1–99** are *shared* across every contract and mean the same thing
///   everywhere.
/// - **500–599** belong to `asset-maintenance` alone.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Shared 1–99
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidInput = 4,
    NotFound = 5,
    ContractPaused = 6,
    MathOverflow = 7,
    MathUnderflow = 8,

    // asset-maintenance 500–599
    /// Service provider is not registered.
    ProviderNotRegistered = 500,
    /// Provider is inactive.
    ProviderInactive = 501,
    /// No maintenance schedule for this asset.
    ScheduleNotFound = 502,
    /// No warranty for this asset.
    WarrantyNotFound = 503,
    /// Warranty is not active.
    WarrantyNotActive = 504,
    /// Warranty has expired.
    WarrantyExpired = 505,
    /// Maximum claims reached for this warranty.
    MaxClaimsReached = 506,
    /// Alert index is out of bounds.
    AlertIndexOutOfBounds = 507,
    /// Asset does not exist in maintenance records.
    AssetNotFound = 508,
    /// Invalid date / cost / rating arguments.
    InvalidArguments = 509,
    /// There is no admin proposal in flight to accept or cancel.
    NoPendingAdminProposal = 510,
    /// The proposed admin is not a valid nominee (it is the current admin).
    InvalidAdmin = 511,
    /// The referenced maintenance record does not exist.
    RecordNotFound = 512,
    /// The record already carries a void or amendment annotation.
    RecordAlreadyResolved = 513,
    /// The asset was burned or detokenized and cannot be serviced.
    AssetBurned = 514,
}

pub fn handle_error(env: &Env, error: Error) -> ! {
    panic_with_error!(env, error);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_in_range() {
        assert_eq!(Error::AlreadyInitialized as u32, 1);
        assert_eq!(Error::NotInitialized as u32, 2);
        for code in [
            Error::ProviderNotRegistered as u32,
            Error::ProviderInactive as u32,
            Error::ScheduleNotFound as u32,
            Error::WarrantyNotFound as u32,
            Error::WarrantyNotActive as u32,
            Error::WarrantyExpired as u32,
            Error::MaxClaimsReached as u32,
            Error::AlertIndexOutOfBounds as u32,
            Error::AssetNotFound as u32,
            Error::InvalidArguments as u32,
            Error::NoPendingAdminProposal as u32,
            Error::InvalidAdmin as u32,
            Error::RecordNotFound as u32,
            Error::RecordAlreadyResolved as u32,
            Error::AssetBurned as u32,
        ] {
            assert!((500..600).contains(&code));
        }
    }
}
