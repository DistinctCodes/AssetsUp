#![allow(clippy::upper_case_acronyms)]
use soroban_sdk::{String, contracttype};

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
