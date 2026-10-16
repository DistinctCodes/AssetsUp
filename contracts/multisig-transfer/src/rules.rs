//! Approval rules, and the invariants that make one satisfiable.
//!
//! An [`ApprovalRule`] binds a category to a set of `approvers` and a
//! `required_approvals` threshold. Those two halves have to agree with each
//! other, and the checks that enforce that live here rather than inline in
//! `configure_approval_rule`, because they are properties of the rule type.
//!
//! ## The invariant
//!
//! ```text
//! 1 <= required_approvals <= approvers.len()   and   approvers.len() >= MIN_SIGNERS
//! ```
//!
//! Without it, `configure_approval_rule` accepts rules that can never be
//! satisfied. `create_transfer_request` copies `required_approvals` onto the
//! request and `approve_transfer_request` counts distinct signers against it, so
//! a threshold above the signer count means no sequence of approvals ever sets
//! the request to `Approved`. The asset then sits behind a pending request that
//! can neither execute nor be re-raised — a rule accepted by a successful
//! transaction, stranding the asset.
//!
//! The upper bound is the load-bearing half. `required_approvals == 0` was
//! already rejected; `required_approvals == 9` with three signers was not, and it
//! fails exactly the same way, silently and later.

use soroban_sdk::{BytesN, Env};

use crate::{errors::MultiSigError, storage, types::ApprovalRule};

/// The smallest signer set a rule may declare.
///
/// One is the floor implied by "the category must be able to approve at all".
/// Deployments that want a higher floor should raise this constant rather than
/// work around it, so the policy is reviewable in one place.
pub const MIN_SIGNERS: u32 = 1;

pub fn get_rule(e: &Env, category: &BytesN<32>) -> Result<ApprovalRule, MultiSigError> {
    let rules = storage::rules_map(e);
    rules
        .get(category.clone())
        .ok_or(MultiSigError::RuleNotFound)
}

/// Rejects a rule that could never be satisfied.
///
/// Call before writing the rule. Ordering matters: `InvalidThreshold` is
/// reported for a zero threshold and `ThresholdExceedsSignerCount` for one
/// above the signer count, so an integrator can tell "no threshold was set" from
/// "the threshold is unreachable" — the second is the one that silently bricks
/// assets if it slips through.
pub fn validate(rule: &ApprovalRule) -> Result<(), MultiSigError> {
    if rule.required_approvals == 0 {
        return Err(MultiSigError::InvalidThreshold);
    }

    if rule.required_approvals > rule.approvers.len() {
        return Err(MultiSigError::ThresholdExceedsSignerCount);
    }

    if rule.approvers.len() < MIN_SIGNERS {
        return Err(MultiSigError::InsufficientSigners);
    }

    Ok(())
}
