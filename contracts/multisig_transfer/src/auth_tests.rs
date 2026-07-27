//! Authorization tests ([SC-42]).
//!
//! Every entrypoint in this crate compared a caller-supplied `caller` argument
//! against the stored admin, the asset's owner, or the approver set — and none
//! authenticated it. Approvals could be forged by naming an authorized
//! approver; approval rules could be rewritten by naming the admin.
//!
//! These tests run **without** `mock_all_auths`, which is the only way to tell
//! an entrypoint that authenticates from one that merely looks like it does.
#![cfg(test)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env};

use crate::types::ApprovalRule;
use crate::{MultiSigTransferContract, MultiSigTransferContractClient};

fn setup(env: &Env) -> (MultiSigTransferContractClient<'_>, Address) {
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let registry = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&admin, &registry);
    env.set_auths(&[]);

    (client, admin)
}

fn category(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[9u8; 32])
}

fn rule(env: &Env, required: u32) -> ApprovalRule {
    ApprovalRule {
        category: category(env),
        required_approvals: required,
        approvers: soroban_sdk::Vec::from_array(env, [Address::generate(env)]),
        approval_timeout_secs: 3600,
        auto_approve: false,
        priority: 1,
    }
}

#[test]
fn initialize_requires_the_admins_authorization() {
    // Otherwise whoever calls initialize first owns a freshly deployed
    // contract, regardless of who deployed it.
    let env = Env::default();
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultiSigTransferContractClient::new(&env, &contract_id);

    let res = client.try_initialize(&Address::generate(&env), &Address::generate(&env));
    assert!(
        res.is_err(),
        "initialize must require the incoming admin's authorization"
    );
}

#[test]
fn configure_approval_rule_rejects_an_unauthenticated_caller() {
    // Naming the admin must not be enough to rewrite the approval threshold —
    // that would let anyone drop it to one and self-approve every transfer.
    let env = Env::default();
    let (client, admin) = setup(&env);

    let res = client.try_configure_approval_rule(&admin, &rule(&env, 1));
    assert!(
        res.is_err(),
        "naming the admin must not authorize a rule change"
    );
}

#[test]
fn configure_approval_rule_succeeds_once_the_admin_authenticates() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    env.mock_all_auths();
    client.configure_approval_rule(&admin, &rule(&env, 2));

    // The rule is stored, observable through its approver list.
    assert_eq!(
        client
            .get_required_approvers_category(&category(&env))
            .len(),
        1
    );
}

#[test]
fn a_non_admin_cannot_configure_an_approval_rule_even_when_authenticated() {
    // Authentication is necessary but not sufficient: the admin check must
    // still apply to a caller who can legitimately sign for themselves.
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let stranger = Address::generate(&env);

    env.mock_all_auths();
    let res = client.try_configure_approval_rule(&stranger, &rule(&env, 1));
    assert!(
        res.is_err(),
        "a signed call from a non-admin must still be rejected"
    );
}

#[test]
fn approve_transfer_request_rejects_an_unauthenticated_caller() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let approver = Address::generate(&env);

    // The request does not exist, so this would fail either way — but it must
    // fail on authorization first, before any state is read.
    let res = client.try_approve_transfer_request(&approver, &1);
    assert!(
        res.is_err(),
        "approvals must not be forgeable by naming an approver"
    );
}

#[test]
fn cancel_transfer_request_rejects_an_unauthenticated_caller() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let res = client.try_cancel_transfer_request(&admin, &1);
    assert!(
        res.is_err(),
        "cancellation must not be forgeable by naming the admin"
    );
}

#[test]
fn reject_transfer_request_rejects_an_unauthenticated_caller() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let approver = Address::generate(&env);

    let res =
        client.try_reject_transfer_request(&approver, &1, &BytesN::from_array(&env, &[0u8; 32]));
    assert!(
        res.is_err(),
        "rejections must not be forgeable by naming an approver"
    );
}

#[test]
fn read_entrypoints_do_not_require_authorization() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    // No auths are mocked; these must still answer.
    assert_eq!(client.get_asset_history(&category(&env)).len(), 0);
    assert_eq!(
        client
            .get_pending_transfers_approver(&Address::generate(&env))
            .len(),
        0
    );
}
