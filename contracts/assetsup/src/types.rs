#![allow(clippy::upper_case_acronyms)]
use soroban_sdk::{Address, BytesN, String, Vec, contracttype};

/// Represents the fundamental type of asset being managed
/// Distinguishes between physical and digital assets for different handling requirements
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetType {
    Physical,
    Digital,
}

/// Represents the current operational status of an asset
/// Used to track asset lifecycle and availability for use
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}

/// Represents different types of actions that can be performed on assets
/// Used for audit trails and tracking asset lifecycle events
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    Procured,
    Transferred,
    Maintained,
    Disposed,
    CheckedIn,
    CheckedOut,
    Inspected,
}

/// Represents different subscription plan tiers
/// Used to determine feature access and usage limits
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PlanType {
    Basic,
    Pro,
    Enterprise,
}

/// Represents the current status of a subscription
/// Used to control access to platform features
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Expired,
    Cancelled,
}

/// Represents custom attributes for assets (key-value pairs)
/// Used for storing additional metadata about assets
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CustomAttribute {
    pub key: String,
    pub value: String,
}

/// Metadata about the contract itself
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractMetadata {
    pub version: String,
    pub name: String,
    pub description: String,
    pub created_at: u64,
}

// =====================
// Tokenization / Fractional Ownership Types (V1 & V2)
// =====================

/// Data keys for contract storage
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TokenDataKey {
    /// Stores TokenizedAsset
    TokenizedAsset(u64),
    /// Stores OwnershipRecord for (asset_id, holder_address)
    TokenHolder(u64, Address),
    /// Stores Vec<Address> of all token holders for an asset
    TokenHoldersList(u64),
    /// Stores lock timestamp for (asset_id, holder_address)
    TokenLockedUntil(u64, Address),
    /// Stores vote record for (asset_id, proposal_id, voter_address)
    VoteRecord(u64, u64, Address),
    /// Stores vote tally (i128) for (asset_id, proposal_id)
    VoteTally(u64, u64),
    /// Stores TransferRestriction for asset_id
    TransferRestriction(u64),
    /// Stores Vec<Address> whitelist for asset_id
    Whitelist(u64),
    /// Stores unclaimed dividend for (asset_id, holder_address)
    UnclaimedDividend(u64, Address),
    /// Stores detokenization proposal status
    DetokenizationProposal(u64),
    /// Stores TokenMetadata for asset_id
    TokenMetadata(u64),
}

/// Represents a tokenized asset on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenizedAsset {
    /// Original asset ID (reference to registry)
    pub asset_id: u64,
    /// Total number of tokens issued
    pub total_supply: i128,
    /// Token symbol (unique per asset)
    pub symbol: String,
    /// Number of decimals for fractional ownership
    pub decimals: u32,
    /// Total tokens currently locked (non-transferable)
    pub locked_tokens: i128,
    /// Tokenizer / asset owner
    pub tokenizer: Address,
    /// Asset valuation (in stroops)
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
    /// Percentage required for detokenization (e.g. 50 = 50%)
    pub detokenize_threshold: u32,
}

/// Metadata associated with a tokenized asset
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    pub name: String,
    pub description: String,
    pub asset_type: AssetType,
    /// IPFS URI for extended metadata
    pub ipfs_uri: Option<String>,
    /// Hash of legal documentation
    pub legal_docs_hash: Option<BytesN<32>>,
    /// Hash of valuation report
    pub valuation_report_hash: Option<BytesN<32>>,
    /// Whether accredited investor status is required
    pub accredited_investor_required: bool,
    /// Geographic restrictions (ISO country codes)
    pub geographic_restrictions: Vec<String>,
}

/// Represents ownership record of a token holder
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnershipRecord {
    pub owner: Address,
    /// Current token balance
    pub balance: i128,
    /// Timestamp of first acquisition
    pub acquisition_timestamp: u64,
    /// Average price per token at acquisition
    pub average_purchase_price: i128,
    /// Voting power (weighted by balance)
    pub voting_power: i128,
    /// Entitlement to dividends
    pub dividend_entitlement: i128,
    /// Unclaimed dividends pending
    pub unclaimed_dividends: i128,
    /// Ownership percentage in basis points (e.g., 5000 = 50%)
    pub ownership_percentage: i128,
}

/// Transfer restrictions for tokens
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRestriction {
    /// Whether accredited investor status is required
    pub require_accredited: bool,
    /// Geographic restrictions (ISO country codes)
    pub geographic_allowed: Vec<String>,
}

// =====================
// DetokenizationProposal — Option B: wrapper structs preserve named fields
// while satisfying #[contracttype]'s restriction on enum variant fields.
// =====================

/// Data for an active detokenization proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActiveProposal {
    pub proposal_id: u64,
    pub proposer: Address,
    pub created_at: u64,
}

/// Data for an executed detokenization proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutedProposal {
    pub proposal_id: u64,
    pub executed_at: u64,
}

/// Data for a rejected detokenization proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RejectedProposal {
    pub proposal_id: u64,
    pub rejected_at: u64,
}

/// Detokenization proposal — each variant wraps its own named struct
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DetokenizationProposal {
    Active(ActiveProposal),
    Executed(ExecutedProposal),
    Rejected(RejectedProposal),
}
