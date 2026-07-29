//! Contract upgrade and storage migration ([SC-49]).
//!
//! `assetsup` is **upgradeable**: the admin may replace the contract's WASM in
//! place with [`AssetUpContract::upgrade`], keeping the same contract id and
//! all existing storage. That is the right posture for a contract holding an
//! asset registry — the alternative, redeploying, means a new contract id and
//! either abandoning or manually re-importing every ownership record.
//!
//! Upgradeability is a trade: it means a compromised admin key can replace the
//! contract with arbitrary code. See `contracts/UPGRADE.md` for the runbook and
//! the mitigations.
//!
//! ## Storage versioning
//!
//! Replacing the WASM does **not** touch storage. If a new version changes a
//! stored layout, the old bytes are still there and will be decoded by the new
//! code — which is how upgrades lose data.
//!
//! [`StorageVersion`] records the layout the stored data conforms to.
//! [`AssetUpContract::migrate`] advances it, applying whatever transformation
//! each step needs, and is **idempotent**: running it twice is a no-op, so a
//! retried or duplicated migration transaction cannot corrupt state.

use soroban_sdk::{Address, BytesN, Env};

use crate::error::Error;
use crate::events;
use crate::DataKey;

/// The storage layout version this build of the contract expects.
///
/// Bump this **in the same change** that alters a stored type, and add the
/// corresponding arm to [`migrate_from`]. A build whose `CURRENT_VERSION` is
/// ahead of the stored version will refuse to serve until `migrate` has run.
pub const CURRENT_VERSION: u32 = 1;

/// Reads the stored layout version.
///
/// Contracts initialized before versioning existed have no stored value; they
/// are treated as version 1, which is the layout they were written with.
pub fn stored_version(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::StorageVersion)
        .unwrap_or(CURRENT_VERSION)
}

pub fn set_version(env: &Env, version: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::StorageVersion, &version);
}

/// Applies the migration steps between `from` and [`CURRENT_VERSION`].
///
/// Each arm transforms one version to the next. Steps are applied in order so
/// a contract several versions behind catches up in a single call.
///
/// Returns the version actually reached.
pub fn migrate_from(env: &Env, from: u32) -> Result<u32, Error> {
    if from > CURRENT_VERSION {
        // The stored data was written by a newer build than this one. Refusing
        // is the only safe answer: this code cannot know the newer layout.
        return Err(Error::InvalidProposal);
    }

    let mut version = from;

    // Migration steps go here as the layout evolves, for example:
    //
    //     if version == 1 {
    //         // v1 -> v2: Asset gained a `warranty_expires` field. Existing
    //         // records decode with the default, so nothing to rewrite, but
    //         // the version must still advance.
    //         version = 2;
    //     }
    //
    // Each arm must be safe to skip when `version` is already past it, which
    // is what makes the whole function idempotent.

    if version < CURRENT_VERSION {
        version = CURRENT_VERSION;
    }

    set_version(env, version);
    Ok(version)
}

/// Emits the upgrade event.
pub fn emit_upgraded(env: &Env, admin: &Address, new_wasm_hash: &BytesN<32>, version: u32) {
    events::contract_upgraded(env, admin, new_wasm_hash, version);
}

/// Emits the migration event.
pub fn emit_migrated(env: &Env, from: u32, to: u32) {
    events::contract_migrated(env, from, to);
}
