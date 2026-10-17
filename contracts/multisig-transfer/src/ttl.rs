//! Storage time-to-live policy for `multisig-transfer`.
//!
//! Soroban charges rent and **archives entries whose TTL lapses**. An archived
//! request is a correctness bug, not a performance concern: the transfer record
//! simply stops being readable, and worse, an archived entry in
//! `AssetPendingRequest` still looks occupied to `create_transfer_request`, so
//! the asset stays wedged with no visible reason.
//!
//! This mirrors the policy in `contracts/assetsup/src/ttl.rs` — same constants,
//! same rationale — so the two contracts can be reviewed against each other.
//! All TTL numbers live here rather than as magic values at call sites.
//!
//! ## Why every entrypoint bumps
//!
//! A contract whose storage is only extended on *writes* still loses data. The
//! common case for this crate is a request that is created, approved to
//! threshold, executed, and then only ever **read** by an indexer. Nothing
//! writes it again, so a write-only policy would let it lapse out from under a
//! perfectly healthy asset.
//!
//! So `extend_all` runs at the top of every entrypoint, including the read-only
//! queries. That makes the invariant easy to state: *no entrypoint can cause an
//! entry to approach expiry.*
//!
//! ## The coarse-grained caveat
//!
//! `Requests`, `AssetHistory` and friends are stored as a single `Map` under one
//! `DataKey`, so TTL is per-map, not per-request. One busy request keeps the
//! whole map alive. That is deliberate — it errs toward keeping data, and it is
//! the same trade-off `assetsup` makes. The per-request rows that *are*
! individually keyed, namely the approval flags in `approvals.rs`, are extended
//! on both read and write instead.
//!
//! Genuinely abandoned approvals are handled by expiry rather than by TTL: a
//! request whose approval window closes short of its threshold is swept and its
//! asset lock released. TTL alone would archive the record without releasing
//! the lock, which is worse than doing nothing.

use soroban_sdk::{Env, IntoVal, Val};

use crate::storage::DataKey;

/// Ledgers per day, at the nominal 5 second close time.
pub const LEDGERS_PER_DAY: u32 = 17_280;

/// Bump persistent entries when they have less than 30 days left...
pub const PERSISTENT_THRESHOLD: u32 = 30 * LEDGERS_PER_DAY;
/// ...back out to 90 days.
///
/// Chosen so a contract that goes untouched for a full quarter still retains its
/// request history, and so routine traffic keeps entries alive without paying to
/// extend on every call.
pub const PERSISTENT_EXTEND_TO: u32 = 90 * LEDGERS_PER_DAY;

/// Extends a persistent entry's TTL, if it exists.
///
/// Safe to call on a key that has never been written; `extend_ttl` on a missing
/// entry would trap, so existence is checked first.
pub fn extend_persistent<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val> + Clone,
{
    let store = env.storage().persistent();
    if store.has(key) {
        store.extend_ttl(key, PERSISTENT_THRESHOLD, PERSISTENT_EXTEND_TO);
    }
}

/// Extends every fixed-key persistent entry this contract owns.
///
/// Called at the top of every entrypoint, reads included. See the module docs
/// for why reads bump too.
pub fn extend_all(env: &Env) {
    extend_persistent(env, &DataKey::Admin);
    extend_persistent(env, &DataKey::AssetRegistry);
    extend_persistent(env, &DataKey::NextRequestId);
    extend_persistent(env, &DataKey::Requests);
    extend_persistent(env, &DataKey::Rules);
    extend_persistent(env, &DataKey::PendingApprovals);
    extend_persistent(env, &DataKey::ApprovalFlags);
    extend_persistent(env, &DataKey::ApprovalSignatures);
    extend_persistent(env, &DataKey::AssetPendingRequest);
    extend_persistent(env, &DataKey::AssetHistory);
}

/// The extension target must be further out than the trigger point, otherwise
/// every call would pay to extend while never actually pushing the entry out.
///
/// Checked at compile time; the values are constants, so a runtime assertion
/// would be trivially true and clippy rightly rejects it.
const _: () = {
    assert!(PERSISTENT_THRESHOLD < PERSISTENT_EXTEND_TO);
    assert!(PERSISTENT_EXTEND_TO == 90 * LEDGERS_PER_DAY);
    assert!(PERSISTENT_THRESHOLD >= 30 * LEDGERS_PER_DAY);
};