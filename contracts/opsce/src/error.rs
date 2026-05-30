//! Shared contract error type for the opsce crate.
//!
//! All modules in the crate (provider rating, KYC verification, ...) report
//! failures through this single enum so callers and tests have a uniform
//! error surface.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    // -- Lifecycle --
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,

    // -- Provider rating --
    /// Rating is outside the allowed 1..=5 range.
    InvalidRating = 4,
    /// The maintenance record has already been rated.
    AlreadyRated = 5,
    /// Maintenance record id was not found.
    RecordNotFound = 6,
    /// Maintenance record exists but is not yet marked complete.
    RecordNotComplete = 7,
    /// Provider profile is not registered.
    ProviderNotFound = 8,

    // -- KYC verification --
    /// The caller is not registered as a KYC oracle.
    NotOracle = 20,
    /// `submit_kyc_result` was called with a status that is not Approved or
    /// Rejected.
    InvalidKycStatus = 21,
    /// The address has no Approved (or non-expired) KYC record.
    KycNotApproved = 22,
}
