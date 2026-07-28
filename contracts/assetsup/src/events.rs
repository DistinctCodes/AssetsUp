//! Typed contract events for `assetsup`.
//!
//! See `contracts/EVENTS.md` for the workspace-wide convention. Struct names
//! are `<Subject><PastTenseVerb>`; the SDK derives topic 0 from the name in
//! `lower_snake_case`. The primary entity identifier is marked `#[topic]` so
//! downstream systems can index on it.
//!
//! Note that the registry keys assets by `BytesN<32>` while tokenization,
//! dividends, and voting key them by `u64`; the event types reflect whichever
//! id space the emitting entrypoint uses.

use soroban_sdk::{contractevent, Address, BytesN, Env, String};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/// The contract was initialized with an admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

/// An asset was registered by an authorized registrar.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRegistered {
    #[topic]
    pub asset_id: BytesN<32>,
    pub owner: Address,
    pub timestamp: u64,
}

/// An asset's metadata was updated.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetUpdated {
    #[topic]
    pub asset_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// Ownership of an asset moved to a new owner.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetTransferred {
    #[topic]
    pub asset_id: BytesN<32>,
    pub old_owner: Address,
    pub new_owner: Address,
    pub timestamp: u64,
}

/// An asset was retired and can no longer be transferred or updated.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetRetired {
    #[topic]
    pub asset_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// An admin transfer was nominated. The role does **not** move until the
/// proposed address accepts.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposed {
    #[topic]
    pub proposed_admin: Address,
    pub current_admin: Address,
    pub timestamp: u64,
}

/// A pending admin nomination was withdrawn by the current admin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminProposalCancelled {
    #[topic]
    pub proposed_admin: Address,
    pub current_admin: Address,
    pub timestamp: u64,
}

/// The contract admin was changed, after the incoming address accepted.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminChanged {
    #[topic]
    pub new_admin: Address,
    pub old_admin: Address,
    pub timestamp: u64,
}

/// An address was granted registrar rights.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistrarAdded {
    #[topic]
    pub registrar: Address,
    pub timestamp: u64,
}

/// An address had its registrar rights revoked.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistrarRemoved {
    #[topic]
    pub registrar: Address,
    pub timestamp: u64,
}

/// The contract was paused; mutating entrypoints now reject.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractPaused {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

/// The contract was unpaused and resumed normal operation.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractUnpaused {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

/// An asset was tokenized into fractional shares.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetTokenized {
    #[topic]
    pub asset_id: u64,
    pub total_supply: i128,
    pub symbol: String,
    pub decimals: u32,
    pub tokenizer: Address,
}

/// New tokens were minted for a tokenized asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensMinted {
    #[topic]
    pub asset_id: u64,
    pub amount: i128,
    pub total_supply: i128,
}

/// Tokens were burned, reducing the supply of a tokenized asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensBurned {
    #[topic]
    pub asset_id: u64,
    pub amount: i128,
    pub total_supply: i128,
}

/// Tokens moved between two holders.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensTransferred {
    #[topic]
    pub asset_id: u64,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

/// A holder's tokens were locked until a given timestamp.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensLocked {
    #[topic]
    pub asset_id: u64,
    pub holder: Address,
    pub until_timestamp: u64,
}

/// A holder's tokens were unlocked.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensUnlocked {
    #[topic]
    pub asset_id: u64,
    pub holder: Address,
    pub timestamp: u64,
}

/// A tokenized asset's valuation was updated.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValuationUpdated {
    #[topic]
    pub asset_id: u64,
    pub new_valuation: i128,
}

/// A tokenized asset was fully detokenized.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetDetokenized {
    #[topic]
    pub asset_id: u64,
    pub proposal_id: u64,
    pub total_supply: i128,
}

// ---------------------------------------------------------------------------
// Dividends and voting
// ---------------------------------------------------------------------------

/// A dividend was distributed across an asset's token holders.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DividendDistributed {
    #[topic]
    pub asset_id: u64,
    pub total_amount: i128,
    pub holder_count: u32,
}

/// A holder claimed their accrued dividends.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DividendClaimed {
    #[topic]
    pub asset_id: u64,
    pub holder: Address,
    pub amount: i128,
}

/// A token holder cast a weighted vote on a proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteCast {
    #[topic]
    pub asset_id: u64,
    pub proposal_id: u64,
    pub voter: Address,
    pub voting_power: i128,
}

// ---------------------------------------------------------------------------
// Transfer restrictions
// ---------------------------------------------------------------------------

/// A transfer restriction was set on an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RestrictionSet {
    #[topic]
    pub asset_id: u64,
    pub require_accredited: bool,
}

/// An address was added to an asset's transfer whitelist.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WhitelistAdded {
    #[topic]
    pub asset_id: u64,
    pub address: Address,
}

/// An address was removed from an asset's transfer whitelist.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WhitelistRemoved {
    #[topic]
    pub asset_id: u64,
    pub address: Address,
}

// ---------------------------------------------------------------------------
// Leasing
// ---------------------------------------------------------------------------

/// A lease was created over an asset.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseCreated {
    #[topic]
    pub lease_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub lessor: Address,
    pub lessee: Address,
    pub timestamp: u64,
}

/// A leased asset was returned.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseReturned {
    #[topic]
    pub lease_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// A lease was cancelled before its end date.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseCancelled {
    #[topic]
    pub lease_id: BytesN<32>,
    pub caller: Address,
    pub timestamp: u64,
}

/// A lease reached its end date and expired.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseExpired {
    #[topic]
    pub lease_id: BytesN<32>,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Emission helpers
// ---------------------------------------------------------------------------

pub fn contract_initialized(env: &Env, admin: &Address) {
    ContractInitialized {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_registered(env: &Env, asset_id: &BytesN<32>, owner: &Address) {
    AssetRegistered {
        asset_id: asset_id.clone(),
        owner: owner.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_updated(env: &Env, asset_id: &BytesN<32>, caller: &Address) {
    AssetUpdated {
        asset_id: asset_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_transferred(
    env: &Env,
    asset_id: &BytesN<32>,
    old_owner: &Address,
    new_owner: &Address,
) {
    AssetTransferred {
        asset_id: asset_id.clone(),
        old_owner: old_owner.clone(),
        new_owner: new_owner.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_retired(env: &Env, asset_id: &BytesN<32>, caller: &Address) {
    AssetRetired {
        asset_id: asset_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_proposed(env: &Env, current_admin: &Address, proposed_admin: &Address) {
    AdminProposed {
        proposed_admin: proposed_admin.clone(),
        current_admin: current_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_proposal_cancelled(env: &Env, current_admin: &Address, proposed_admin: &Address) {
    AdminProposalCancelled {
        proposed_admin: proposed_admin.clone(),
        current_admin: current_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn admin_changed(env: &Env, old_admin: &Address, new_admin: &Address) {
    AdminChanged {
        new_admin: new_admin.clone(),
        old_admin: old_admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn registrar_added(env: &Env, registrar: &Address) {
    RegistrarAdded {
        registrar: registrar.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn registrar_removed(env: &Env, registrar: &Address) {
    RegistrarRemoved {
        registrar: registrar.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_paused(env: &Env, admin: &Address) {
    ContractPaused {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn contract_unpaused(env: &Env, admin: &Address) {
    ContractUnpaused {
        admin: admin.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn asset_tokenized(
    env: &Env,
    asset_id: u64,
    total_supply: i128,
    symbol: String,
    decimals: u32,
    tokenizer: Address,
) {
    AssetTokenized {
        asset_id,
        total_supply,
        symbol,
        decimals,
        tokenizer,
    }
    .publish(env);
}

pub fn tokens_minted(env: &Env, asset_id: u64, amount: i128, total_supply: i128) {
    TokensMinted {
        asset_id,
        amount,
        total_supply,
    }
    .publish(env);
}

pub fn tokens_burned(env: &Env, asset_id: u64, amount: i128, total_supply: i128) {
    TokensBurned {
        asset_id,
        amount,
        total_supply,
    }
    .publish(env);
}

pub fn tokens_transferred(env: &Env, asset_id: u64, from: &Address, to: &Address, amount: i128) {
    TokensTransferred {
        asset_id,
        from: from.clone(),
        to: to.clone(),
        amount,
    }
    .publish(env);
}

pub fn tokens_locked(env: &Env, asset_id: u64, holder: &Address, until_timestamp: u64) {
    TokensLocked {
        asset_id,
        holder: holder.clone(),
        until_timestamp,
    }
    .publish(env);
}

pub fn tokens_unlocked(env: &Env, asset_id: u64, holder: &Address) {
    TokensUnlocked {
        asset_id,
        holder: holder.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn valuation_updated(env: &Env, asset_id: u64, new_valuation: i128) {
    ValuationUpdated {
        asset_id,
        new_valuation,
    }
    .publish(env);
}

pub fn asset_detokenized(env: &Env, asset_id: u64, proposal_id: u64, total_supply: i128) {
    AssetDetokenized {
        asset_id,
        proposal_id,
        total_supply,
    }
    .publish(env);
}

pub fn dividend_distributed(env: &Env, asset_id: u64, total_amount: i128, holder_count: u32) {
    DividendDistributed {
        asset_id,
        total_amount,
        holder_count,
    }
    .publish(env);
}

pub fn dividend_claimed(env: &Env, asset_id: u64, holder: &Address, amount: i128) {
    DividendClaimed {
        asset_id,
        holder: holder.clone(),
        amount,
    }
    .publish(env);
}

pub fn vote_cast(env: &Env, asset_id: u64, proposal_id: u64, voter: &Address, voting_power: i128) {
    VoteCast {
        asset_id,
        proposal_id,
        voter: voter.clone(),
        voting_power,
    }
    .publish(env);
}

pub fn restriction_set(env: &Env, asset_id: u64, require_accredited: bool) {
    RestrictionSet {
        asset_id,
        require_accredited,
    }
    .publish(env);
}

pub fn whitelist_added(env: &Env, asset_id: u64, address: &Address) {
    WhitelistAdded {
        asset_id,
        address: address.clone(),
    }
    .publish(env);
}

pub fn whitelist_removed(env: &Env, asset_id: u64, address: &Address) {
    WhitelistRemoved {
        asset_id,
        address: address.clone(),
    }
    .publish(env);
}

pub fn lease_created(
    env: &Env,
    lease_id: &BytesN<32>,
    asset_id: &BytesN<32>,
    lessor: &Address,
    lessee: &Address,
) {
    LeaseCreated {
        lease_id: lease_id.clone(),
        asset_id: asset_id.clone(),
        lessor: lessor.clone(),
        lessee: lessee.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_returned(env: &Env, lease_id: &BytesN<32>, caller: &Address) {
    LeaseReturned {
        lease_id: lease_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_cancelled(env: &Env, lease_id: &BytesN<32>, caller: &Address) {
    LeaseCancelled {
        lease_id: lease_id.clone(),
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn lease_expired(env: &Env, lease_id: &BytesN<32>) {
    LeaseExpired {
        lease_id: lease_id.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}
