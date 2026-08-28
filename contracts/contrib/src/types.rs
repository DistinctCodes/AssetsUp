use soroban_sdk::contracttype;

/// Represents the current operational status of an asset.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetStatus {
    Active,
    Transferred,
    Retired,
}
