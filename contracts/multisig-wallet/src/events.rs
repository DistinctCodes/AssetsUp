//! Typed contract events for `multisig-wallet`.
//!
//! See `contracts/EVENTS.md` for the workspace-wide convention. Struct names
//! are `<Subject><PastTenseVerb>`; the SDK derives topic 0 from the name in
//! `lower_snake_case`. The identifier a consumer would filter on (`tx_id`,
//! `proposal_id`, an owner address) is marked `#[topic]`.

use soroban_sdk::{contractevent, Address, Env, Vec};

use crate::types::{ProposalType, TransactionType};

/// The wallet was initialized with its owner set and threshold.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WalletInitialized {
    #[topic]
    pub admin: Address,
    pub owners: Vec<Address>,
    pub threshold: u32,
    pub timestamp: u64,
}

/// An owner submitted a transaction for confirmation.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionSubmitted {
    #[topic]
    pub tx_id: u64,
    pub initiator: Address,
    pub tx_type: TransactionType,
    pub timestamp: u64,
}

/// An owner confirmed a pending transaction.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionConfirmed {
    #[topic]
    pub tx_id: u64,
    pub confirmer: Address,
    pub confirmations_count: u32,
    pub timestamp: u64,
}

/// An owner withdrew a previously given confirmation.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfirmationRevoked {
    #[topic]
    pub tx_id: u64,
    pub revoker: Address,
    pub timestamp: u64,
}

/// A transaction reached its threshold and was executed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionExecuted {
    #[topic]
    pub tx_id: u64,
    pub initiator: Address,
    pub timestamp: u64,
}

/// A pending transaction was cancelled before execution.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionCancelled {
    #[topic]
    pub tx_id: u64,
    pub caller: Address,
    pub timestamp: u64,
}

/// An owner raised a governance proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalSubmitted {
    #[topic]
    pub proposal_id: u64,
    pub proposer: Address,
    pub proposal_type: ProposalType,
    pub timestamp: u64,
}

/// An owner confirmed a governance proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalConfirmed {
    #[topic]
    pub proposal_id: u64,
    pub confirmer: Address,
    pub confirmations_count: u32,
    pub timestamp: u64,
}

/// An owner was added to the wallet by an executed proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnerAdded {
    #[topic]
    pub owner: Address,
    pub proposer: Address,
    pub timestamp: u64,
}

/// An owner was removed from the wallet by an executed proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnerRemoved {
    #[topic]
    pub owner: Address,
    pub proposer: Address,
    pub timestamp: u64,
}

/// The confirmation threshold was changed by an executed proposal.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ThresholdChanged {
    pub old_threshold: u32,
    pub new_threshold: u32,
    pub timestamp: u64,
}

/// The wallet was frozen; all mutating operations now reject.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WalletFrozen {
    #[topic]
    pub caller: Address,
    pub timestamp: u64,
}

/// The wallet was unfrozen and resumed normal operation.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WalletUnfrozen {
    #[topic]
    pub caller: Address,
    pub timestamp: u64,
}

/// The daily spend limit was changed.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DailyLimitChanged {
    #[topic]
    pub caller: Address,
    pub limit: u128,
    pub timestamp: u64,
}

/// A transaction was rejected because it would exceed the daily spend limit.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DailyLimitReached {
    pub limit: u128,
    pub attempted_total: u128,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Emission helpers
// ---------------------------------------------------------------------------

pub fn wallet_initialized(env: &Env, admin: &Address, owners: &Vec<Address>, threshold: u32) {
    WalletInitialized {
        admin: admin.clone(),
        owners: owners.clone(),
        threshold,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn transaction_submitted(env: &Env, tx_id: u64, initiator: &Address, tx_type: TransactionType) {
    TransactionSubmitted {
        tx_id,
        initiator: initiator.clone(),
        tx_type,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn transaction_confirmed(env: &Env, tx_id: u64, confirmer: &Address, count: u32) {
    TransactionConfirmed {
        tx_id,
        confirmer: confirmer.clone(),
        confirmations_count: count,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn confirmation_revoked(env: &Env, tx_id: u64, revoker: &Address) {
    ConfirmationRevoked {
        tx_id,
        revoker: revoker.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn transaction_executed(env: &Env, tx_id: u64, initiator: &Address) {
    TransactionExecuted {
        tx_id,
        initiator: initiator.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn transaction_cancelled(env: &Env, tx_id: u64, caller: &Address) {
    TransactionCancelled {
        tx_id,
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn proposal_submitted(
    env: &Env,
    proposal_id: u64,
    proposer: &Address,
    proposal_type: ProposalType,
) {
    ProposalSubmitted {
        proposal_id,
        proposer: proposer.clone(),
        proposal_type,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn proposal_confirmed(env: &Env, proposal_id: u64, confirmer: &Address, count: u32) {
    ProposalConfirmed {
        proposal_id,
        confirmer: confirmer.clone(),
        confirmations_count: count,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn owner_added(env: &Env, owner: &Address, proposer: &Address) {
    OwnerAdded {
        owner: owner.clone(),
        proposer: proposer.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn owner_removed(env: &Env, owner: &Address, proposer: &Address) {
    OwnerRemoved {
        owner: owner.clone(),
        proposer: proposer.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn threshold_changed(env: &Env, old_threshold: u32, new_threshold: u32) {
    ThresholdChanged {
        old_threshold,
        new_threshold,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn wallet_frozen(env: &Env, caller: &Address) {
    WalletFrozen {
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn wallet_unfrozen(env: &Env, caller: &Address) {
    WalletUnfrozen {
        caller: caller.clone(),
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn daily_limit_changed(env: &Env, caller: &Address, limit: u128) {
    DailyLimitChanged {
        caller: caller.clone(),
        limit,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub fn daily_limit_reached(env: &Env, limit: u128, attempted_total: u128) {
    DailyLimitReached {
        limit,
        attempted_total,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}
