//! KYC verification module
//!
//! Implements the on-chain KYC workflow:
//!
//! - Whitelisted oracles submit results via `submit_kyc_result`.
//! - Asset-transfer style functions can call `require_kyc` as a guard.
//! - Approval expires after the stored `expiry` ledger timestamp; once expired
//!   `get_kyc_status` reports `Expired` and `require_kyc` rejects.
//!
//! The KYC functions are exposed as additional methods on the crate's
//! [`OpsceContract`](crate::provider_rating::OpsceContract) via a second
//! `#[contractimpl]` block.

use soroban_sdk::{contractimpl, contracttype, Address, Env, Symbol};

use crate::error::ContractError;
use crate::provider_rating::{read_admin, OpsceContract};

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

#[contractimpl]
impl OpsceContract {
    /// Whitelist a KYC oracle. Admin only.
    pub fn add_kyc_oracle(env: Env, oracle: Address) -> Result<(), ContractError> {
        let admin = read_admin(&env)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&KycDataKey::Oracle(oracle), &true);
        Ok(())
    }

    /// Remove a KYC oracle from the whitelist. Admin only.
    pub fn remove_kyc_oracle(env: Env, oracle: Address) -> Result<(), ContractError> {
        let admin = read_admin(&env)?;
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&KycDataKey::Oracle(oracle), &false);
        Ok(())
    }

    pub fn is_kyc_oracle(env: Env, oracle: Address) -> bool {
        env.storage()
            .persistent()
            .get(&KycDataKey::Oracle(oracle))
            .unwrap_or(false)
    }

    /// Submit the outcome of an off-chain KYC check.
    ///
    /// `oracle` must be whitelisted via [`add_kyc_oracle`] and must authorize
    /// the call. `status` must be either `Approved` or `Rejected`; all other
    /// variants return `Err(ContractError::InvalidKycStatus)`.
    pub fn submit_kyc_result(
        env: Env,
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
                    .publish((Symbol::new(&env, "kyc_approved"), address), expiry);
            }
            KycStatus::Rejected => {
                env.events()
                    .publish((Symbol::new(&env, "kyc_rejected"), address), expiry);
            }
            _ => {}
        }

        Ok(())
    }

    /// Guard helper for transfer-style functions.
    ///
    /// Returns `Ok(())` only when the address has an `Approved` KYC record
    /// whose expiry timestamp is still in the future. Otherwise returns
    /// `Err(ContractError::KycNotApproved)`.
    pub fn require_kyc(env: Env, address: Address) -> Result<(), ContractError> {
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

    /// Returns the current effective status and expiry timestamp for an
    /// address. An approved record whose expiry has passed is reported as
    /// `Expired`. Unknown addresses return `Pending` with expiry `0`.
    pub fn get_kyc_status(env: Env, address: Address) -> KycStatusInfo {
        match env
            .storage()
            .persistent()
            .get::<_, KycRecord>(&KycDataKey::Record(address))
        {
            Some(record) => {
                let now = env.ledger().timestamp();
                let status = if matches!(record.status, KycStatus::Approved) && now > record.expiry
                {
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
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use crate::provider_rating::{OpsceContract, OpsceContractClient};
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{Address, Env};

    struct Fixture {
        env: Env,
        client: OpsceContractClient<'static>,
        oracle: Address,
        user: Address,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(OpsceContract, ());
        let client = OpsceContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let user = Address::generate(&env);

        client.init(&admin);
        client.add_kyc_oracle(&oracle);

        Fixture {
            env,
            client,
            oracle,
            user,
        }
    }

    #[test]
    fn oracle_can_submit_approval_and_status_is_visible() {
        let fx = setup();
        let now = fx.env.ledger().timestamp();
        let expiry = now + 1_000;

        fx.client
            .submit_kyc_result(&fx.oracle, &fx.user, &KycStatus::Approved, &expiry);

        // Status reflects the approval with the stored expiry.
        let info = fx.client.get_kyc_status(&fx.user);
        assert_eq!(info.status, KycStatus::Approved);
        assert_eq!(info.expiry, expiry);

        // require_kyc is now satisfied.
        fx.client.require_kyc(&fx.user);
    }

    #[test]
    fn approval_expires_after_stored_timestamp() {
        let fx = setup();
        let now = fx.env.ledger().timestamp();
        let expiry = now + 100;

        fx.client
            .submit_kyc_result(&fx.oracle, &fx.user, &KycStatus::Approved, &expiry);

        // Move ledger time past the expiry.
        fx.env.ledger().with_mut(|l| {
            l.timestamp = expiry + 1;
        });

        // get_kyc_status surfaces Expired.
        let info = fx.client.get_kyc_status(&fx.user);
        assert_eq!(info.status, KycStatus::Expired);
        assert_eq!(info.expiry, expiry);

        // require_kyc rejects an expired approval.
        let result = fx.client.try_require_kyc(&fx.user);
        assert!(result.is_err());
    }

    #[test]
    fn non_oracle_caller_is_rejected() {
        let fx = setup();
        let imposter = Address::generate(&fx.env);
        let expiry = fx.env.ledger().timestamp() + 1_000;

        let result = fx.client.try_submit_kyc_result(
            &imposter,
            &fx.user,
            &KycStatus::Approved,
            &expiry,
        );
        assert!(result.is_err());

        // No record was written, so require_kyc still rejects.
        let guard = fx.client.try_require_kyc(&fx.user);
        assert!(guard.is_err());

        // And status remains Pending.
        let info = fx.client.get_kyc_status(&fx.user);
        assert_eq!(info.status, KycStatus::Pending);
        assert_eq!(info.expiry, 0);
    }

    #[test]
    fn rejected_status_blocks_require_kyc_and_emits_event() {
        let fx = setup();
        let expiry = fx.env.ledger().timestamp() + 500;

        fx.client
            .submit_kyc_result(&fx.oracle, &fx.user, &KycStatus::Rejected, &expiry);

        let info = fx.client.get_kyc_status(&fx.user);
        assert_eq!(info.status, KycStatus::Rejected);

        let guard = fx.client.try_require_kyc(&fx.user);
        assert!(guard.is_err());
    }
}
