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

use soroban_sdk::{BytesN, Env};

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