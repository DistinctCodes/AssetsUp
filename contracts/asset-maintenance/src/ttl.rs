//! Storage time-to-live policy for `asset-maintenance`.
//!
//! Soroban charges rent and **archives entries whose TTL lapses**. For this
//! contract that is a correctness bug rather than a performance concern: an
//! archived [`MaintenanceHistory`](crate::DataKey::MaintenanceHistory) entry is
//! audit evidence that simply stops being readable until someone restores it.
//!
//! ## Durability
//!
//! Every key in [`DataKey`](crate::DataKey) is persistent:
//!
//! | Data | Durability | Why |
//! |---|---|---|
//! | `MaintenanceHistory`, `AssetStats`, `MaintenanceSchedule`, `Warranty`, `Alerts` | `persistent` | Long-lived per-asset records. Losing one loses audit evidence. |
//! | `Admin`, `AssetRegistry`, `Provider` | `persistent` | Contract-level configuration with the same lifetime as the contract. |
//!
//! ## Policy
//!
//! Entries are extended on **write and on read**. Extending on read is the
//! important half: an asset that is only ever queried, never serviced again,
//! would otherwise be archived despite being actively referenced.
//!
//! The threshold/extend pair follows the usual shape — if an entry has fewer
//! than `*_THRESHOLD` ledgers left, push it back out to `*_EXTEND_TO`. A
//! threshold below the target makes the extension a no-op on most calls, so it
//! only costs rent when an entry is genuinely approaching expiry.

use soroban_sdk::{Env, IntoVal, Val};

/// Ledgers per day, at the nominal 5 second close time.
pub const LEDGERS_PER_DAY: u32 = 17_280;

/// Bump persistent entries when they have less than 30 days left...
pub const PERSISTENT_THRESHOLD: u32 = 30 * LEDGERS_PER_DAY;
/// ...back out to 90 days.
pub const PERSISTENT_EXTEND_TO: u32 = 90 * LEDGERS_PER_DAY;

/// Instance storage (contract-level config) uses the same window.
pub const INSTANCE_THRESHOLD: u32 = PERSISTENT_THRESHOLD;
pub const INSTANCE_EXTEND_TO: u32 = PERSISTENT_EXTEND_TO;

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

/// Bumps the contract instance TTL.
pub fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_EXTEND_TO);
}

/// The extension target must be further out than the trigger point, otherwise
/// every call would pay to extend while never actually pushing the entry out.
const _: () = {
    assert!(PERSISTENT_THRESHOLD < PERSISTENT_EXTEND_TO);
    assert!(INSTANCE_THRESHOLD < INSTANCE_EXTEND_TO);
};
