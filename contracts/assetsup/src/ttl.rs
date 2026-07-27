//! Storage time-to-live policy ([SC-44]).
//!
//! Soroban charges rent and **archives entries whose TTL lapses**. An archived
//! asset registry entry is a correctness bug, not a performance concern: the
//! ownership record simply stops being readable until someone restores it.
//!
//! All TTL constants live here rather than being scattered as magic numbers at
//! call sites, so the policy can be reviewed in one place.
//!
//! ## Durability choices
//!
//! | Data | Durability | Why |
//! |---|---|---|
//! | Asset records, ownership, token balances, leases, policies | `persistent` | Must outlive any single session. Losing one loses the ownership record. |
//! | Admin, pause flag, registrar allowlist, counters, metadata | `persistent` | Contract-level configuration with the same lifetime as the contract. |
//! | — | `temporary` | Nothing in this contract is short-lived enough to justify it. Long-lived data in `temporary` is the classic archival bug. |
//!
//! ## Policy
//!
//! Every read and write of a persistent entry extends its TTL. Extending on
//! **read** as well as write is the important part: an asset that is only ever
//! queried, never modified, would otherwise expire despite being actively used.
//!
//! The threshold/extend pair follows the usual shape — if the entry has fewer
//! than `*_THRESHOLD` ledgers left, push it back out to `*_EXTEND_TO`. Setting
//! the threshold below the target means the extension is a no-op on most calls
//! and only costs rent when an entry is genuinely approaching expiry.

use soroban_sdk::{Env, IntoVal, Val};

/// Ledgers per day, at the nominal 5 second close time.
pub const LEDGERS_PER_DAY: u32 = 17_280;

/// Bump persistent entries when they have less than 30 days left...
pub const PERSISTENT_THRESHOLD: u32 = 30 * LEDGERS_PER_DAY;
/// ...back out to 90 days.
///
/// Chosen so a contract that goes untouched for a full quarter still retains
/// its registry, and so that routine traffic keeps entries alive without
/// paying to extend on every call.
pub const PERSISTENT_EXTEND_TO: u32 = 90 * LEDGERS_PER_DAY;

/// Instance storage (contract-level config) uses the same window. If the
/// instance is archived the contract is unusable regardless of what else
/// survives, so it should never be the first thing to lapse.
pub const INSTANCE_THRESHOLD: u32 = PERSISTENT_THRESHOLD;
pub const INSTANCE_EXTEND_TO: u32 = PERSISTENT_EXTEND_TO;

/// Extends a persistent entry's TTL, if it exists.
///
/// Safe to call on a key that has never been written; `extend_ttl` on a
/// missing entry would trap, so existence is checked first.
pub fn extend_persistent<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val> + Clone,
{
    let store = env.storage().persistent();
    if store.has(key) {
        store.extend_ttl(key, PERSISTENT_THRESHOLD, PERSISTENT_EXTEND_TO);
    }
}

/// Bumps the contract instance TTL.
///
/// Call from every entrypoint that touches instance storage, including reads.
pub fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_EXTEND_TO);
}

/// The extension target must be further out than the trigger point, otherwise
/// every call would pay to extend while never actually pushing the entry out.
///
/// Checked at compile time; the values are constants, so a runtime assertion
/// would be trivially true and clippy rightly rejects it.
const _: () = {
    assert!(PERSISTENT_THRESHOLD < PERSISTENT_EXTEND_TO);
    assert!(INSTANCE_THRESHOLD < INSTANCE_EXTEND_TO);
    // A quarter of headroom, so a registry is not archived during a quiet
    // period.
    assert!(PERSISTENT_EXTEND_TO == 90 * LEDGERS_PER_DAY);
    assert!(PERSISTENT_THRESHOLD >= 30 * LEDGERS_PER_DAY);
};
