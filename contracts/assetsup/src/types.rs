use soroban_sdk::{contracttype, Address, BytesN};

/// Defines all persistent data storage keys for the contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    /// Store a Subscription object keyed by its ID (BytesN<32>)
    Subscription(BytesN<32>), 
}
/// Defines the available plan types and their associated pricing information.
/// In a real application, prices would likely be stored in state, but are hardocoded for simplicity.
#[contracttype]
#[derive(Copy,Clone,Debug,Eq,PartialEq)]
pub enum PlanType{
    Basic=1,
    Premium=2,
}
impl PlanType{
    /// Returns the required monthly payment amount in 7-decimal precision tokens (e.g., USDC).
    pub fn get_price_7_decimal(&self) -> i128{
        match self{
            PlanType::Basic=>10, // $10.00
            PlanType::Premium=>20, // $50.00
        }
    }
}

/// Defines the possible states of a subscription.
#[contracttype]
#[derive(Copy,Clone,Debug,Eq,PartialEq)]
pub enum SubscriptionStatus{
    Active=1,
    Cancelled=2,
    Expired=3,
}

/// Main structure holding subscription details.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription{
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