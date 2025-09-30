#![no_std]
use soroban_sdk::{Address, Env, BytesN,contract, contractimpl};

//Import types and modules
mod errors;
mod types;
mod subscription;

//Import types and contract logic
use crate::types::DataKey;
use crate::subscription::{SubscriptionContract, SubscriptionService};


#[contract]
pub struct AssetUpContract;

#[contractimpl]
impl AssetUpContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Contract is already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().persistent().get(&DataKey::Admin).unwrap()
    }

    //creates a new subscription
    pub fn create_subscription(
        env: Env,
        id: BytesN<32>,
        user: Address,
        plan: crate::types::PlanType,
        payment_token: Address,
        duration_days: u32,
    ) ->Result<crate::types::Subscription, errors::ContractError>{
        SubscriptionService::create_subscription(env, id, user, plan, payment_token, duration_days)
    } 
    /// Cancels an active subscription.
    pub fn cancel_subscription(env: Env, id:soroban_sdk::BytesN<32>) -> Result<crate::types::Subscription, errors::ContractError>{
        SubscriptionService::cancel_subscription(env, id)
    }
    /// Retrieves subscription details.
    pub fn get_subscription(env: Env, id:soroban_sdk::BytesN<32>) -> Result<crate::types::Subscription, errors::ContractError>{
        SubscriptionService::get_subscription(env, id)
    }
}
//export contract name for testing in other modules
#[cfg(test)]
mod tests{
    
}
