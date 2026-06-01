#![cfg(test)]
extern crate std;

use crate::kyc_verification::KycStatus;
use crate::{OpsceContract, OpsceContractClient};
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
    assert!(result.is_err(), "expired KYC should be rejected");
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
    assert!(result.is_err(), "non-oracle submission must be rejected");

    // No record was written, so require_kyc still rejects.
    let guard = fx.client.try_require_kyc(&fx.user);
    assert!(guard.is_err());

    // And status remains Pending.
    let info = fx.client.get_kyc_status(&fx.user);
    assert_eq!(info.status, KycStatus::Pending);
    assert_eq!(info.expiry, 0);
}

#[test]
fn rejected_status_blocks_require_kyc() {
    let fx = setup();
    let expiry = fx.env.ledger().timestamp() + 500;

    fx.client
        .submit_kyc_result(&fx.oracle, &fx.user, &KycStatus::Rejected, &expiry);

    let info = fx.client.get_kyc_status(&fx.user);
    assert_eq!(info.status, KycStatus::Rejected);

    let guard = fx.client.try_require_kyc(&fx.user);
    assert!(guard.is_err());
}
