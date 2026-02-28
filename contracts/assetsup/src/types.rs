#![allow(clippy::upper_case_acronyms)]
use soroban_sdk::{Address, BigInt, BytesN, String, Vec, contracttype};

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
    /// Stores vote tally (BigInt) for (asset_id, proposal_id)
    VoteTally(u64, u64),
    /// Stores TransferRestriction for asset_id
    TransferRestriction(u64),
    /// Stores Vec<Address> whitelist for asset_id
    Whitelist(u64),
    /// Stores unclaimed dividend for (asset_id, holder_address)
    UnclaimedDividend(u64, Address),
    /// Stores detokenization proposal status
    DetokenizationProposal(u64),
}

/// Events emitted by the contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContractEvent {
    AssetTokenized {
        asset_id: u64,
        supply: BigInt,
        symbol: String,
        decimals: u32,
        tokenizer: Address,
    },
    TokensMinted {
        asset_id: u64,
        amount: BigInt,
        new_supply: BigInt,
    },
    TokensBurned {
        asset_id: u64,
        amount: BigInt,
        new_supply: BigInt,
    },
    TokensTransferred {
        asset_id: u64,
        from: Address,
        to: Address,
        amount: BigInt,
    },
    TokensLocked {
        asset_id: u64,
        holder: Address,
        until_timestamp: u64,
    },
    TokensUnlocked {
        asset_id: u64,
        holder: Address,
    },
    DividendDistributed {
        asset_id: u64,
        total_amount: BigInt,
        holder_count: u32,
    },
    DividendClaimed {
        asset_id: u64,
        holder: Address,
        amount: BigInt,
    },
    VoteCast {
        asset_id: u64,
        proposal_id: u64,
        voter: Address,
        weight: BigInt,
    },
    AssetDetokenized {
        asset_id: u64,
        proposal_id: u64,
    },
    ValuationUpdated {
        asset_id: u64,
        new_valuation: BigInt,
    },
    TransferRestrictionSet {
        asset_id: u64,
        require_accredited: bool,
    },
    WhitelistAddressAdded {
        asset_id: u64,
        address: Address,
    },
    WhitelistAddressRemoved {
        asset_id: u64,
        address: Address,
    },
}

/// Represents a tokenized asset on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenizedAsset {
    /// Original asset ID (reference to registry)
    pub asset_id: u64,
    /// Total number of tokens issued
    pub total_supply: BigInt,
    /// Token symbol (unique per asset)
    pub symbol: String,
    /// Number of decimals for fractional ownership
    pub decimals: u32,
    /// Total tokens currently locked (non-transferable)
    pub locked_tokens: BigInt,
    /// Tokenizer / asset owner
    pub tokenizer: Address,
    /// Asset valuation (in stroops)
    pub valuation: BigInt,
    /// Number of unique token holders
    pub token_holders_count: u32,
    /// Tokens currently in circulation (not burned)
    pub tokens_in_circulation: BigInt,
    /// Minimum tokens required to vote
    pub min_voting_threshold: BigInt,
    /// Revenue sharing enabled flag
    pub revenue_sharing_enabled: bool,
    /// Timestamp when asset was tokenized
    pub tokenization_timestamp: u64,
    /// Percentage required for detokenization (basis points, e.g., 5000 = 50%)
    pub detokenization_required_threshold: u32,
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
    pub balance: BigInt,
    /// Timestamp of first acquisition
    pub acquisition_timestamp: u64,
    /// Average price per token at acquisition
    pub average_purchase_price: BigInt,
    /// Voting power (weighted by balance)
    pub voting_power: BigInt,
    /// Entitlement to dividends
    pub dividend_entitlement: BigInt,
    /// Unclaimed dividends pending
    pub unclaimed_dividends: BigInt,
    /// Ownership percentage in basis points (e.g., 5000 = 50%)
    pub ownership_percentage: BigInt,
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

/// Detokenization proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DetokenizationProposal {
    Active {
        proposal_id: u64,
        proposer: Address,
        created_at: u64,
    },
    Executed {
        proposal_id: u64,
        executed_at: u64,
    },
    Rejected {
        proposal_id: u64,
        rejected_at: u64,
    },
}
