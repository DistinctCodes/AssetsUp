use soroban_sdk::{contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError{
    //general errors
    Unauthorized=100,
    AlreadyInitialized=101,

    //Subscription errors
    SubscriptionAlreadyExists=200,
    SubscriptionNotFound=201,
    SubscriptionNotActive=202,
    SubscriptionActive=203,

    //Payment errors
    InsufficientPayment=300,
    PaymentFailed=301,
}