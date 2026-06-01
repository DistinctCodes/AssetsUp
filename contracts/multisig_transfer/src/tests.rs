use super::*;
use soroban_sdk::{contract, contracterror, contractimpl, symbol_short, testutils::Address as _, Address, BytesN, Env, Vec};

#[contract]
pub struct FakeAssetsUpContract;

#[contractimpl]
impl FakeAssetsUpContract {
    pub fn transfer_tokens(
        env: Env,
        asset_id: u64,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), FakeAssetsUpError> {
        from.require_auth();
        env.events().publish((symbol_short!("asset_xfer"),), (asset_id, from.clone(), to, amount));
        Ok(())
    }
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum FakeAssetsUpError {
    TransferFailed = 1,
}

#[contract]
pub struct FailingAssetsUpContract;

#[contractimpl]
impl FailingAssetsUpContract {
    pub fn transfer_tokens(
        _env: Env,
        _asset_id: u64,
        _from: Address,
        _to: Address,
        _amount: i128,
    ) -> Result<(), FakeAssetsUpError> {
        Err(FakeAssetsUpError::TransferFailed)
    }
}

fn setup_multisig_and_contracts(env: &Env) -> (MultisigTransferContractClient<'_>, Address) {
    env.mock_all_auths();
    let contract_id = env.register(MultiSigTransferContract, ());
    let client = MultisigTransferContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let asset_registry = Address::generate(env);

    client.initialize(&admin, &asset_registry);
    (client, admin)
}

#[test]
fn test_execute_transfer_invokes_assetsup_transfer_tokens() {
    let env = Env::default();
    let (client, admin) = setup_multisig_and_contracts(&env);
    let fake_assetsup_id = env.register(FakeAssetsUpContract, ());

    client.configure_assetsup_contract(&admin, &fake_assetsup_id);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[1u8; 32]);
    let asset_category = BytesN::from_array(&env, &[2u8; 32]);
    let notes_hash = BytesN::from_array(&env, &[3u8; 32]);
    let token_id = 1u64;
    let amount = 1000i128;

    let rule = ApprovalRule {
        category: asset_category.clone(),
        required_approvals: 0,
        approvers: Vec::new(&env),
        approval_timeout_secs: 3600,
        auto_approve: true,
        priority: 0,
    };
    client.configure_approval_rule(&admin, rule);

    let request_id = client
        .create_transfer_request(
            &owner,
            &asset_id,
            &asset_category,
            &token_id,
            &amount,
            &new_owner,
            &notes_hash,
            &(env.ledger().timestamp() + 3600),
            &None,
        );

    client.execute_transfer(&owner, &request_id);

    let executed_request = client.get_request(&request_id).unwrap();
    assert_eq!(executed_request.status, RequestStatus::Executed);
}

#[test]
fn test_execute_transfer_reverts_when_assetsup_transfer_fails() {
    let env = Env::default();
    let (client, admin) = setup_multisig_and_contracts(&env);
    let fake_assetsup_id = env.register(FailingAssetsUpContract, ());

    client.configure_assetsup_contract(&admin, &fake_assetsup_id);
    let owner = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let asset_id = BytesN::from_array(&env, &[4u8; 32]);
    let asset_category = BytesN::from_array(&env, &[5u8; 32]);
    let notes_hash = BytesN::from_array(&env, &[6u8; 32]);
    let token_id = 1u64;
    let amount = 500i128;

    let rule = ApprovalRule {
        category: asset_category.clone(),
        required_approvals: 0,
        approvers: Vec::new(&env),
        approval_timeout_secs: 3600,
        auto_approve: true,
        priority: 0,
    };
    client.configure_approval_rule(&admin, rule);

    let request_id = client
        .create_transfer_request(
            &owner,
            &asset_id,
            &asset_category,
            &token_id,
            &amount,
            &new_owner,
            &notes_hash,
            &(env.ledger().timestamp() + 3600),
            &None,
        );

    let execution_result = client.execute_transfer(&owner, &request_id);
    assert!(execution_result.is_err());
}
