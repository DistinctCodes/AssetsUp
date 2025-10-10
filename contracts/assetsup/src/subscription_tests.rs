#![cfg(test)]

extern crate std;
use soroban_sdk::{
    testutils::{Address as _, MockAuth},
    token,
    vec,
    Address, BytesN, Env, Symbol, IntoVal,
};

use crate::{
    errors::ContractError,
    types::{PlanType, Subscription, SubscriptionStatus},
};
//import shared helper
use super::common::setup_test_environment;

// Subscription Test Cases
fn test_subscription_creation(){
    let (env,client, _admin, token_client)=setup_test_environment();
    let subscriber= Address::generate(&env);
    let sub_id = BytesN::from_array(&env, &[1; 32]);
    let plan=PlanType::Basic;
    let amount=plan.get_price_7_decimal();

    // 1. Fund the subscriber and set allowance
    token_client.with_admin(&Address::generate(&env)).mint(&subscriber, &amount);
    token_client.with_source(&subscribe).approve(&subscriber, &client_contract_id,&amount, &amount);

    // 2. Create subscription
    let sub:Subsciption=client.mock_auths(&[MockAuth{
        address: subscriber.clone(),
        invoke: &vec![
            &env,
            (
                &token_client.contract_id(),
                &Symbol::new(&env, "transfer_from"),
                vec![
                    &env,
                    subscriber.to_val(),
                    subscriber.to_val(),
                    client_contract_id.to_val(&env),
                    amount.to_val(),
                ],
            ),
        ],
    }])
    .create_subscription(&sub_id, &subscriber, &plan, &token_client.contract_id(), 30);

    // 3. Assert properties
    assert_eq!(sub.id, sub_id);
    assert_eq!(sub.status, SubscriptionStatus::Active);
    assert_eq!(sub.start_date, 100);
    // 30 days*24h*60.*60s/5s/ledger=518400 ledgers
    assert_eq!(sub.end_date, 100+518400);

    // 4. Check contract balance(payment successful)
    assert_eq!(token_client.balance(&client.contract_id),amount);

    // 5. Try to create again(fails with SubscriptionAlreadyExists)
    let result=client
    .mock_auths(&[MockAuth{
        address: subscriber.clone(),
        invoke: &vec![
            &env,
            (
                &token_client.contract_id,
                &Symbol::new(&env,"transfer_from"),
                vec![
                    &env,
                    subscriber.to_val(),
                    subscriber.to_val(),
                    client_contract_id.to_val(&env),
                    amount.to_val(),
                ],
            ),
            ],
    }])
    .try_cancel_subscription(&sub_id, &subscriber, &plan, &token_client.contract_id,30);

    assert_eq!(result.unwrap_err().as_error().unwrap(), ContractError::SubscriptionNotActive.into());

}

#[test]
fn test_subscription_cancellation(){
    let (env,client, _admin, token_client)=setup_test_environment();
    let subscriber= Address::generate(&env);
    let sub_id = BytesN::from_array(&env, &[2; 32]);
    let plan=PlanType::Premium;
    let amount=plan.get_price_7_decimal();

    // 1. Create subscription
    token_client.with_admin(&Address::generate(&env)).mint(&subscriber, &amount);
    token_client.with_source(&subscribe).approve(&subscriber, &client_contract_id, &amount);

    client.mock_auths(&[MockAuth{
        address: subscriber.clone(),
        invoke: &vec![
            &env,
            (
                &token_client.contract_id(),
                &Symbol::new(&env, "transfer_from"),
                vec![
                    &env,
                    subscriber.to_val(),
                    subscriber.to_val(),
                    client_contract_id.to_val(&env),
                    amount.to_val(),
                ],
            ),
        ],
    }])
    .create_subscription(&sub_id, &subscriber, &plan, &token_client.contract_id(), 30);

    // Advance ledger sequence to simulate time passage
    env.ledger().set_sequence(200);

    // 2. Cancel the subscription
    let cancelled_sub: Subscription=client
    .mock_auths(&[MockAuth{
        address: subscriber.clone(),
        invoke: &vec![],
    }])
    .cancel_subscription(&sub_id);

    // 3. Assert properties
    assert_eq!(cancelled_sub.status, SubscriptionStatus::Cancelled);
    assert_eq!(cancelled_sub.end_date, 200); //should be current ledger sequence


    let result=client
    .mock_auths(&[MockAuth{
        address: subscriber.clone(),
        invoke: &vec![&env],
    }])
    .try_cancel_subscription(&sub_id);

    assert_eq!(result.unwrap_err().as_error().unwrap(), ContractError::SubscriptionNotActive.into());

}

#[test]
fn test_get_subscription_not_found() {
    let (env, client, _admin, _token_client) = setup_test_environment();
    let sub_id = BytesN::from_array(&env, &[3; 32]);

    // try to get a non-existent subscription
    let result = client.get_subscription(&sub_id);
    assert_eq!(
        result.unwrap_err().as_error().unwrap(), 
        ContractError::SubscriptionNotFound.into()
    );
}