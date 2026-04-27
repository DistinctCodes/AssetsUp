#![allow(clippy::upper_case_acronyms)]
use soroban_sdk::{contracttype, Address, String, Vec};

/// Represents the current operational status of an asset.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}

/// Proposal status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

/// Vote tally result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteTally {
    pub yes_votes: i128,
    pub no_votes: i128,
    pub yes_percentage: i128,
    pub no_percentage: i128,
    pub total_eligible_supply: i128,
}

/// Storage keys for type-safe contract state access.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TokenDataKey {
    /// Stores TokenizedAsset for an asset
    TokenizedAsset(u64),
    /// Ownership record: (asset_id, holder_address)
    TokenHolder(u64, Address),
    /// List of all token holders for an asset
    TokenHoldersList(u64),
    /// Proposal by ID
    Proposal(u64),
    /// Next proposal ID counter
    NextProposalId,
    /// Vote record: (proposal_id, voter_address)
    VoteRecord(u64, Address),
    /// Accumulated yes votes for a proposal
    ProposalYesVotes(u64),
    /// Accumulated no votes for a proposal
    ProposalNoVotes(u64),
    /// Detokenization proposal by asset ID
    DetokenizationProposal(u64),
    /// Transfer restriction by asset ID
    TransferRestriction(u64),
    /// Whitelist for an asset
    Whitelist(u64),
}

/// Represents a tokenized asset on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenizedAsset {
    /// Original asset ID (reference to registry)
    pub asset_id: u64,
    /// Total number of tokens issued
    pub total_supply: i128,
    /// Token symbol
    pub symbol: String,
    /// Number of decimals
    pub decimals: u32,
    /// Total tokens currently locked (non-transferable)
    pub locked_tokens: i128,
    /// Tokenizer / asset owner
    pub tokenizer: Address,
    /// Asset valuation
    pub valuation: i128,
    /// Number of unique token holders
    pub token_holders_count: u32,
    /// Tokens currently in circulation (not burned)
    pub tokens_in_circulation: i128,
    /// Minimum tokens required to vote
    pub min_voting_threshold: i128,
    /// Revenue sharing enabled flag
    pub revenue_sharing_enabled: bool,
    /// Timestamp when asset was tokenized
    pub tokenization_timestamp: u64,
    /// Percentage required for detokenization
    pub detokenize_threshold: u32,
}

/// Ownership record for a token holder
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnershipRecord {
    pub owner: Address,
    /// Current transferable token balance
    pub balance: i128,
    /// Locked tokens (cannot be transferred)
    pub locked_balance: i128,
    /// Timestamp of first acquisition
    pub acquisition_timestamp: u64,
    /// Average price per token
    pub average_purchase_price: i128,
    /// Voting power (transferable balance)
    pub voting_power: i128,
    /// Entitlement to dividends
    pub dividend_entitlement: i128,
    /// Unclaimed dividends
    pub unclaimed_dividends: i128,
    /// Ownership percentage in basis points
    pub ownership_percentage: i128,
}

/// Governance proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub proposal_id: u64,
    pub asset_id: u64,
    pub proposal_type: String,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub deadline: u64,
    pub min_threshold: i128,
    pub status: ProposalStatus,
}

/// Detokenization status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DetokenizationStatus {
    Active,
    Executed,
    Rejected,
}

/// Detokenization proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DetokenizationProposal {
    pub proposal_id: u64,
    pub asset_id: u64,
    pub proposer: Address,
    pub deadline: u64,
    pub status: DetokenizationStatus,
}

/// Transfer restriction
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRestriction {
    pub require_accredited: bool,
    pub geographic_allowed: Vec<String>,
}
