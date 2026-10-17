//! Approval rules, their approver sets, and the diff between two of them.
//!
//! An [`ApprovalRule`] binds a category to a set of `approvers` and a
//! `required_approvals` threshold. The approver set is the security-critical
//! half: it decides who can authorize an ownership transfer. This module owns
//! the question "who changed?" so the event stream can answer it.
//!
//! ## Why the diff lives here
//!
//! Signers are not stored in a standalone registry — the set *is*
//! `ApprovalRule.approvers`, and it is replaced wholesale by
//! `configure_approval_rule`. Emitting from `lib.rs` would mean comparing two
//! ad-hoc lists inline, which is exactly the kind of thing that misses the
//! removal case. Keeping `added_approvers` / `removed_approvers` beside the
//! rule type makes the comparison testable on its own.
//!
//! ## First write
//!
//! `previous` is `None` the first time a category is configured. Everything in
//! `next` is an addition and nothing is a removal, which falls out of treating
//! `None` as "the empty set" rather than special-casing it at the call site.
//!
//! Approval rules and their collection windows.
//!
//! An [`ApprovalRule`] carries `approval_timeout_secs`: the length of the
//! window an admin grants a rule's approvers to reach `required_approvals`.
//! This module owns everything derived from that number so the arithmetic lives
//! in one place.
//!
//! ## Why the window matters
//!
//! `approval_deadline` is enforced on the *approve* path — a late approval is
//! rejected — but nothing used to move the request anywhere. A request whose
//! threshold was never reached stayed `Pending` indefinitely, which kept the
//! asset locked in `AssetPendingRequest` forever: one under-approved fleet
//! transfer could never be retried and could never execute.
//!
//! Closing the window is therefore not enough on its own; it has to be paired
//! with a terminal transition. [`window_closed`] answers "is the window shut",
//! and `expire_transfer_request` in `lib.rs` performs the cancel that follows.
//!
//! ## Open vs. closed at the boundary
//!
//! A window is open while `now <= deadline` and closed once `now > deadline`,
//! matching the existing `now > req.approval_deadline` guard in
//! `approve_transfer_request`. Keeping the two comparisons identical means an
//! approval and an expiry can never both succeed on the same ledger.

use soroban_sdk::{Address, BytesN, Env, Vec};

use crate::approvals::is_authorized_approver;
use crate::{errors::MultiSigError, storage, types::ApprovalRule};

pub fn get_rule(e: &Env, category: &BytesN<32>) -> Result<ApprovalRule, MultiSigError> {
    let rules = storage::rules_map(e);
    rules
        .get(category.clone())
        .ok_or(MultiSigError::RuleNotFound)
}

/// The last ledger timestamp at which a request created at `created_at` may
/// still gather approvals.
///
/// `saturating_add` because `created_at + approval_timeout_secs` is attacker
/// influenced (an admin supplies the timeout), and a wrap would silently move
/// the deadline into the past and cancel live requests.
pub fn approval_deadline(created_at: u64, rule: &ApprovalRule) -> u64 {
    created_at.saturating_add(rule.approval_timeout_secs)
}

/// Whether the approval window has shut, given the deadline stored on the
/// request at creation time.
///
/// The deadline is read from the request rather than recomputed from `now`: a
/// request's window is fixed when it is created, so a rule edited mid-flight
/// does not retroactively move a request's deadline. Recomputing it here from
/// `now` would compare `now` against `now + timeout` and never close, which is
/// exactly the "threshold never reached, asset locked forever" bug this
/// module exists to close.
///
/// The comparison is `>` to match the existing `now > req.approval_deadline`
/// guard in `approve_transfer_request`, so an approval and an expiry can never
/// both succeed on the same ledger.
pub fn window_closed(now: u64, deadline: u64) -> bool {
    now > deadline
}

/// Approvers present in `next` that were absent from `previous`.
///
/// `previous` is `None` when the rule is created for the first time, in which
/// case every approver is new.
///
/// Duplicates inside `next` are collapsed so a rule listing the same address
/// twice yields one `ApproverAdded`, not two. A duplicate cannot inflate a
/// threshold — `ensure_not_double_approved` blocks a second approval from the
/// same address — but it would otherwise double-count in the event stream.
pub fn added_approvers(e: &Env, previous: &Option<ApprovalRule>, next: &ApprovalRule) -> Vec<Address> {
    let mut out = Vec::new(e);

    for candidate in next.approvers.iter() {
        if already_listed(&out, &candidate) {
            continue;
        }
        let already_authorized = match previous {
            Some(prev) => is_authorized_approver(&prev.approvers, &candidate),
            None => false,
        };
        if !already_authorized {
            out.push_back(candidate);
        }
    }

    out
}

/// Approvers present in `previous` that are absent from `next`.
///
/// Asymmetric with [`added_approvers`]: a brand-new rule has nothing to remove.
pub fn removed_approvers(
    e: &Env,
    previous: &Option<ApprovalRule>,
    next: &ApprovalRule,
) -> Vec<Address> {
    let mut out = Vec::new(e);

    let prev = match previous {
        Some(prev) => prev,
        None => return out,
    };

    for candidate in prev.approvers.iter() {
        if already_listed(&out, &candidate) {
            continue;
        }
        if !is_authorized_approver(&next.approvers, &candidate) {
            out.push_back(candidate);
        }
    }

    out
}

/// Whether `list` already contains `candidate`.
///
/// Written out rather than calling `Vec::contains` so the comparison matches
/// `approvals::is_authorized_approver` exactly; if the SDK's equality ever
/// diverged from that, the diff and the authorization check would disagree
/// about who is a signer.
fn already_listed(list: &Vec<Address>, candidate: &Address) -> bool {
    list.iter().any(|listed| listed == *candidate)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn rule_with(env: &Env, approvers: &[Address]) -> ApprovalRule {
        ApprovalRule {
            category: BytesN::from_array(env, &[1u8; 32]),
            required_approvals: 1,
            approvers: Vec::from_slice(env, approvers),
            approval_timeout_secs: 3600,
            auto_approve: false,
            priority: 1,
        }
    }

    #[test]
    fn a_new_rule_reports_every_approver_as_added() {
        let env = Env::default();
        let a = Address::generate(&env);
        let b = Address::generate(&env);

        let next = rule_with(&env, &[a.clone(), b.clone()]);
        let added = added_approvers(&env, &None, &next);
        assert_eq!(added, Vec::from_slice(&env, &[a, b]));
    }

    #[test]
    fn a_new_rule_reports_nothing_as_removed() {
        let env = Env::default();
        let next = rule_with(&env, &[Address::generate(&env)]);
        assert_eq!(removed_approvers(&env, &None, &next).len(), 0);
    }

    #[test]
    fn an_unchanged_approver_set_reports_no_change() {
        let env = Env::default();
        let a = Address::generate(&env);
        let b = Address::generate(&env);

        let rule = rule_with(&env, &[a.clone(), b.clone()]);
        let previous = Some(rule.clone());

        assert_eq!(added_approvers(&env, &previous, &rule).len(), 0);
        assert_eq!(removed_approvers(&env, &previous, &rule).len(), 0);
    }

    #[test]
    fn a_swap_reports_one_removal_and_one_addition() {
        let env = Env::default();
        let staying = Address::generate(&env);
        let leaving = Address::generate(&env);
        let joining = Address::generate(&env);

        let previous = Some(rule_with(&env, &[staying.clone(), leaving.clone()]));
        let next = rule_with(&env, &[staying.clone(), joining.clone()]);

        assert_eq!(
            added_approvers(&env, &previous, &next),
            Vec::from_slice(&env, &[joining])
        );
        assert_eq!(
            removed_approvers(&env, &previous, &next),
            Vec::from_slice(&env, &[leaving])
        );
    }

    #[test]
    fn duplicate_entries_in_the_new_rule_emit_one_event_each() {
        // A duplicate cannot inflate the threshold (ensure_not_double_approved
        // blocks a second approval from one address) but it would otherwise
        // double-count in the event stream.
        let env = Env::default();
        let a = Address::generate(&env);

        let next = rule_with(&env, &[a.clone(), a.clone()]);
        assert_eq!(added_approvers(&env, &None, &next).len(), 1);
    }

    #[test]
    fn lowering_the_threshold_alone_emits_no_signer_events() {
        // The threshold is security-relevant but is not a signer change, and
        // already has its own event.
        let env = Env::default();
        let a = Address::generate(&env);

        let previous = rule_with(&env, &[a.clone()]);
        let mut next = rule_with(&env, &[a.clone()]);
        next.required_approvals = 2;

        let previous = Some(previous);
        assert_eq!(added_approvers(&env, &previous, &next).len(), 0);
        assert_eq!(removed_approvers(&env, &previous, &next).len(), 0);
    }
}