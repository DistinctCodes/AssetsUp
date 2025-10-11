#![allow(clippy::upper_case_acronyms)]
use soroban_sdk::{Address, BytesN, contracttype};

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
    InMaintenance,
    Disposed,
}
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Subscription(BytesN<32>),
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
impl PlanType {
    /// Returns the required monthly payment amount in 7-decimal precision tokens (e.g., USDC).
    pub fn get_price_7_decimal(&self) -> i128 {
        match self {
            PlanType::Basic => 10_0000000,
            PlanType::Pro => 20_000000,
            PlanType::Enterprise => 50_0000000,
        }
    }
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
/// Main structure holding subscription details.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    /// Unique identifier for the subscription.
    pub id: BytesN<32>,
    /// Address of the user/owns the subscription.
    pub user: Address,
    /// Type of plan subscribed to.
    pub plan: PlanType,
    /// Current status of the subscription.
    pub status: SubscriptionStatus,
    /// Ledger sequence number when the subscription started.
    pub start_date: u32,
    /// Ledger sequence number when the subscription is scheduled to end.
    pub end_date: u32,
    ///  Address of the payment token used (e.g., USDC contract address).
    pub payment_token: Address,
}
