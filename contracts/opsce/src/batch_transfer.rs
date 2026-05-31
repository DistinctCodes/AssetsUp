use assetsup::tokenization::{get_token_balance, transfer_tokens};
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    InsufficientBalance = 1,
    BatchLimitExceeded = 2,
    InvalidTransferAmount = 3,
    TransferFailed = 4,
}

#[contract]
pub struct BatchTokenTransferContract;

#[contractimpl]
impl BatchTokenTransferContract {
    pub fn batch_transfer_tokens(
        env: Env,
        asset_id: u64,
        transfers: Vec<(Address, i128)>,
    ) -> Result<(), ContractError> {
        if transfers.len() > 50 {
            return Err(ContractError::BatchLimitExceeded);
        }

        let sender = env.invoker();
        sender.require_auth();

        let mut total_amount: i128 = 0;
        for (_, amount) in transfers.iter() {
            if *amount <= 0 {
                return Err(ContractError::InvalidTransferAmount);
            }
            total_amount = total_amount
                .checked_add(*amount)
                .ok_or(ContractError::InvalidTransferAmount)?;
        }

        let balance = get_token_balance(&env, asset_id, sender.clone())
            .map_err(|_| ContractError::InsufficientBalance)?;
        if balance < total_amount {
            return Err(ContractError::InsufficientBalance);
        }

        for (recipient, amount) in transfers.iter() {
            transfer_tokens(&env, asset_id, sender.clone(), recipient.clone(), *amount)
                .map_err(|_| ContractError::TransferFailed)?;
            env.events().publish(
                ("token", "token_transferred"),
                (asset_id, sender.clone(), recipient.clone(), *amount),
            );
        }

        Ok(())
    }
}
