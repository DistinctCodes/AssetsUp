use crate::error::Error;
use crate::types::{DataKey, PlanType, Subscription, SubscriptionStatus};
use soroban_sdk::{Address, BytesN, Env, token};

const LEDGERS_PER_DAY: u32 = 17280; //constants for ledgers
pub struct SubscriptionService;

impl SubscriptionService {
    pub fn create_subscription(
        env: Env,
        id: BytesN<32>,
        user: Address,
        plan: PlanType,
        payment_token: Address,
        duration_days: u32,
    ) -> Result<Subscription, Error> {
        // 1. Authorization check
        //user.require_auth();

        // 2. Existence check
        let sub_key = DataKey::Subscription(id.clone());
        if env.storage().persistent().has(&sub_key) {
            return Err(Error::SubscriptionAlreadyExists);
        }

        // 3. Payment Logic
        let token_client = token::Client::new(&env, &payment_token);
        let amount = plan.get_price_7_decimal();
        let recipient = env.current_contract_address();

        // simualate token transfer from user to contract(payment)
        //User has executed an 'approve' call on the token contract
        //The contract pulls the token
        token_client.transfer_from(&user, &user, &recipient, &amount);

        // 4. Calculate Dates
        let current_ledger = env.ledger().sequence();
        //let seconds_in_day=24*60*60;
        //let ledgers_in_day=seconds_in_day/env.ledger().close_time_resolution();
        let duration_ledgers = duration_days.saturating_mul(LEDGERS_PER_DAY);
        let start_date = current_ledger;
        let end_date = current_ledger.saturating_add(duration_ledgers);

        // 5. Create and store subscription object
        let new_subscription = Subscription {
            id,
            user,
            plan,
            status: SubscriptionStatus::Active,
            payment_token,
            start_date,
            end_date,
        };

        env.storage().persistent().set(&sub_key, &new_subscription);

        Ok(new_subscription)
    }

    pub fn cancel_subscription(env: Env, id: BytesN<32>) -> Result<Subscription, Error> {
        let sub_key = DataKey::Subscription(id.clone());

        //1. Retrieve subscription
        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&sub_key)
            .ok_or(Error::SubscriptionNotFound)?;

        //2. Authorization check(only the subscriber can cancel)
        subscription.user.require_auth();

        // 3. Status check
        if subscription.status != SubscriptionStatus::Active {
            return Err(Error::SubscriptionNotActive);
        }

        // 4. Update status and date
        subscription.status = SubscriptionStatus::Cancelled;
        //subscription.end_date = env.ledger().sequence(); //end immediately

        // 5.Store update
        env.storage().persistent().set(&sub_key, &subscription);

        Ok(subscription)
    }

    pub fn get_subscription(env: Env, id: BytesN<32>) -> Result<Subscription, Error> {
        let sub_key = DataKey::Subscription(id.clone());
        env.storage()
            .persistent()
            .get(&sub_key)
            .ok_or(Error::SubscriptionNotFound)
    }
}
