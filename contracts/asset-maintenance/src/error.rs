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
        ] {
            assert!((500..600).contains(&code));
        }
    }
}
