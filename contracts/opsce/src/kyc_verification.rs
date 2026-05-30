//! KYC verification module
//!
//! Implements the on-chain KYC workflow:
//!
//! - Whitelisted oracles submit results via [`submit_kyc_result`].
//! - Asset-transfer style functions can call [`require_kyc`] as a guard.
//! - Approval expires after the stored `expiry` ledger timestamp; once
//!   expired, [`get_kyc_status`] reports `Expired` and [`require_kyc`]
//!   rejects.

use soroban_sdk::{contracttype, Address, Env, Symbol};

use crate::error::ContractError;
use crate::provider_rating::read_admin;

/// Lifecycle of a KYC record.
///
/// `Expired` is a derived state surfaced by `get_kyc_status` when an
/// `Approved` record's expiry has passed; it cannot be submitted directly.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KycStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycRecord {
    pub address: Address,
    pub status: KycStatus,
    /// Ledger timestamp after which the KYC approval is no longer valid.
    pub expiry: u64,
    pub updated_at: u64,
}

/// Read model returned by `get_kyc_status`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KycStatusInfo {
    pub status: KycStatus,
    pub expiry: u64,
}

#[contracttype]
pub enum KycDataKey {
    /// Stores `bool` true when an address is whitelisted as a KYC oracle.
    Oracle(Address),
    /// Stores the `KycRecord` for an address.
    Record(Address),
}

/// Whitelist a KYC oracle. Admin only.
pub fn add_kyc_oracle(env: &Env, oracle: Address) -> Result<(), ContractError> {
    let admin = read_admin(env)?;
    admin.require_auth();
    env.storage()
        .persistent()
        .set(&KycDataKey::Oracle(oracle), &true);
    Ok(())
}

/// Remove a KYC oracle from the whitelist. Admin only.
pub fn remove_kyc_oracle(env: &Env, oracle: Address) -> Result<(), ContractError> {
    let admin = read_admin(env)?;
    admin.require_auth();
    env.storage()
        .persistent()
        .set(&KycDataKey::Oracle(oracle), &false);
    Ok(())
}

pub fn is_kyc_oracle(env: &Env, oracle: Address) -> bool {
    env.storage()
        .persistent()
        .get(&KycDataKey::Oracle(oracle))
        .unwrap_or(false)
}

/// Submit the outcome of an off-chain KYC check.
///
/// `oracle` must be whitelisted via [`add_kyc_oracle`] and must authorize the
/// call. `status` must be either `Approved` or `Rejected`; all other variants
/// return `Err(ContractError::InvalidKycStatus)`.
pub fn submit_kyc_result(
    env: &Env,
    oracle: Address,
    address: Address,
    status: KycStatus,
    expiry: u64,
) -> Result<(), ContractError> {
    oracle.require_auth();

    // Reject any caller that is not on the oracle whitelist.
    let is_oracle: bool = env
        .storage()
        .persistent()
        .get(&KycDataKey::Oracle(oracle.clone()))
        .unwrap_or(false);
    if !is_oracle {
        return Err(ContractError::NotOracle);
    }

    // Only Approved and Rejected may be submitted.
    match status {
        KycStatus::Approved | KycStatus::Rejected => {}
        _ => return Err(ContractError::InvalidKycStatus),
    }

    let record = KycRecord {
        address: address.clone(),
        status: status.clone(),
        expiry,
        updated_at: env.ledger().timestamp(),
    };
    env.storage()
        .persistent()
        .set(&KycDataKey::Record(address.clone()), &record);

    // Emit the appropriate event.
    match status {
        KycStatus::Approved => {
            env.events()
                .publish((Symbol::new(env, "kyc_approved"), address), expiry);
        }
        KycStatus::Rejected => {
            env.events()
                .publish((Symbol::new(env, "kyc_rejected"), address), expiry);
        }
        _ => {}
    }

    Ok(())
}

/// Guard helper for transfer-style functions.
///
/// Returns `Ok(())` only when the address has an `Approved` KYC record whose
/// expiry timestamp is still in the future. Otherwise returns
/// `Err(ContractError::KycNotApproved)`.
pub fn require_kyc(env: &Env, address: Address) -> Result<(), ContractError> {
    let record: KycRecord = env
        .storage()
        .persistent()
        .get(&KycDataKey::Record(address))
        .ok_or(ContractError::KycNotApproved)?;

    match record.status {
        KycStatus::Approved => {
            if env.ledger().timestamp() > record.expiry {
                Err(ContractError::KycNotApproved)
            } else {
                Ok(())
            }
        }
        _ => Err(ContractError::KycNotApproved),
    }
}

/// Returns the current effective status and expiry timestamp for an address.
/// An approved record whose expiry has passed is reported as `Expired`.
/// Unknown addresses return `Pending` with expiry `0`.
pub fn get_kyc_status(env: &Env, address: Address) -> KycStatusInfo {
    match env
        .storage()
        .persistent()
        .get::<_, KycRecord>(&KycDataKey::Record(address))
    {
        Some(record) => {
            let now = env.ledger().timestamp();
            let status = if matches!(record.status, KycStatus::Approved) && now > record.expiry {
                KycStatus::Expired
            } else {
                record.status
            };
            KycStatusInfo {
                status,
                expiry: record.expiry,
            }
        }
        None => KycStatusInfo {
            status: KycStatus::Pending,
            expiry: 0,
        },
    }
}
