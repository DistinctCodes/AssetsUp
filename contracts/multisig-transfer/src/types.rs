//! Transfer request types and the request lifecycle.
//!
//! # Lifecycle
//!
//! A [`TransferRequest`] is always in exactly one of the five states of
//! [`RequestStatus`]. `Rejected`, `Executed` and `Cancelled` are terminal: a
//! request that reaches one of them never changes status again.
//!
//! ```text
//! create_transfer_request
//!    |
//!    +--> Pending ---- approve (count reaches threshold) ----> Approved ---- execute ----> Executed
//!    |       |                                                    |
//!    |       +---- reject ------------------> Rejected            |
//!    |       |                                                    |
//!    |       +---- cancel ------------------> Cancelled <---- cancel
//!    |
//!    +--> Approved   (directly, when the category's rule has auto_approve set)
//! ```
//!
//! | From       | Entrypoint                  | Caller                         | To         |
//! |------------|-----------------------------|--------------------------------|------------|
//! | (none)     | `create_transfer_request`   | asset owner or admin           | `Pending`  |
//! | (none)     | `create_transfer_request`   | same, rule has `auto_approve`  | `Approved` |
//! | `Pending`  | `approve_transfer_request`  | an approver for the category   | `Pending`, or `Approved` once `received_approvals >= required_approvals` |
//! | `Pending`  | `reject_transfer_request`   | an approver for the category   | `Rejected` |
//! | `Pending` or `Approved` | `cancel_transfer_request` | the initiator or the admin | `Cancelled` |
//! | `Approved` | `execute_transfer`          | anyone                         | `Executed` |
//!
//! Every other combination is refused. Approving or rejecting a request that
//! is no longer `Pending` returns `RequestNotPending`, which is why the
//! approval that meets the threshold wins over a reject that arrives after it,
//! and why a reject that lands first wins over a later approval. Executing a
//! request that is not `Approved` returns `NotEnoughApprovals`.
//!
//! A request created from a rule with `auto_approve` starts `Approved` with
//! zero recorded approvals. No approver can approve it further, since it is
//! not `Pending`.
//!
//! # Expiry is not a status
//!
//! There is no `Expired` variant. Expiry is derived from the clock each time
//! an entrypoint runs, and the stored status is left as it was:
//!
//! - `now > expires_at`: `approve_transfer_request` and `execute_transfer`
//!   return `RequestExpired`. `expires_at` itself is still valid.
//! - `now > approval_deadline`: `approve_transfer_request` returns
//!   `ApprovalDeadlinePassed`. A `Pending` request past its deadline can no
//!   longer become `Approved`. Where both limits have passed, `RequestExpired`
//!   is reported first.
//! - `now < execute_after` (when set): `execute_transfer` returns
//!   `ExecuteTooEarly`.
//!
//! `reject_transfer_request` and `cancel_transfer_request` do not check the
//! clock, so an expired request can still be rejected (if `Pending`) or
//! cancelled (if `Pending` or `Approved`).
//!
//! # The asset lock
//!
//! Creating a request locks its asset: no second request can be created for
//! it while one is outstanding (`PendingRequestExists`). The lock is released
//! only when the request becomes `Rejected`, `Executed` or `Cancelled`. A
//! request that merely expires keeps its asset locked until someone rejects or
//! cancels it.
//!
//! # Rule changes
//!
//! `required_approvals` is copied from the category's rule when the request is
//! created, so reconfiguring the rule later does not change the threshold of a
//! request already in flight.

use soroban_sdk::{contracttype, Address, BytesN, Vec};

/// Where a [`TransferRequest`] is in its lifecycle. See the module docs for
/// the full state machine and the transitions between these states.
///
/// Expiry is not represented here: it is derived from
/// [`TransferRequest::expires_at`] at call time.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    /// Waiting for approvals. The only state in which a request can be
    /// approved or rejected.
    Pending,
    /// Enough approvals have been received (or the rule auto-approves), so the
    /// request can be executed once its timelock allows. It can still be
    /// cancelled, but no longer rejected.
    Approved,
    /// An approver rejected the request. Terminal; the asset lock is released.
    Rejected,
    /// Ownership was moved in the registry. Terminal; the asset lock is
    /// released.
    Executed,
    /// The initiator or the admin cancelled the request. Terminal; the asset
    /// lock is released.
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferRequest {
    pub request_id: u64,

    pub asset_id: BytesN<32>,
    pub asset_category: BytesN<32>,

    pub current_owner: Address,
    pub new_owner: Address,

    pub initiator: Address,
    pub created_at: u64,

    /// Approvals needed to reach `Approved`, copied from the category's rule
    /// at creation and not affected by later changes to that rule.
    pub required_approvals: u32,
    /// Approvals recorded so far. Refused or duplicate approvals are not
    /// counted.
    pub received_approvals: u32,

    /// Current lifecycle state. See the module docs.
    pub status: RequestStatus,

    pub notes_hash: BytesN<32>,

    // absolute timestamps
    /// Ledger timestamp after which the request can no longer be approved or
    /// executed (`RequestExpired`). The timestamp itself is still valid. The
    /// status is not changed when this passes.
    pub expires_at: u64,
    /// Ledger timestamp after which the request can no longer be approved
    /// (`ApprovalDeadlinePassed`). Set at creation to `created_at` plus the
    /// rule's `approval_timeout_secs`, independently of `expires_at`.
    pub approval_deadline: u64,

    // optional time-lock: transfer can only execute after this time
    /// When set, `execute_transfer` returns `ExecuteTooEarly` before this
    /// ledger timestamp.
    pub execute_after: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ApprovalRule {
    pub category: BytesN<32>,
    pub required_approvals: u32,
    pub approvers: Vec<Address>,

    pub approval_timeout_secs: u64, // used to compute approval_deadline
    pub auto_approve: bool,         // optional workflow support
    pub priority: u32,
}
