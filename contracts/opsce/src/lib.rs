#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

pub mod error;
pub mod multisig_revoke;
pub mod types;

#[cfg(test)]
mod tests;

pub use crate::error::ContractError;
pub use crate::types::{DataKey, Transaction, Wallet};

#[contract]
pub struct OpsceMultisig;

#[contractimpl]
impl OpsceMultisig {
    /// Create a new multisig wallet and return its `wallet_id`.
    pub fn create_wallet(
        env: Env,
        admin: Address,
        owners: Vec<Address>,
        threshold: u32,
    ) -> Result<u64, ContractError> {
        admin.require_auth();

        if owners.len() < 2 {
            return Err(ContractError::InsufficientOwners);
        }
        if threshold == 0 || threshold > owners.len() {
            return Err(ContractError::InvalidThreshold);
        }

        let wallet_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextWalletId)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::NextWalletId, &(wallet_id + 1));

        let wallet = Wallet {
            id: wallet_id,
            owners,
            threshold,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Wallet(wallet_id), &wallet);
        env.storage()
            .persistent()
            .set(&DataKey::NextTxId(wallet_id), &1u64);

        Ok(wallet_id)
    }

    /// Submit a new transaction proposal for a wallet. Returns its `tx_id`.
    pub fn submit_transaction(
        env: Env,
        initiator: Address,
        wallet_id: u64,
    ) -> Result<u64, ContractError> {
        initiator.require_auth();

        let wallet: Wallet = env
            .storage()
            .persistent()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(ContractError::WalletNotFound)?;

        if !wallet.owners.contains(&initiator) {
            return Err(ContractError::NotAnOwner);
        }

        let tx_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::NextTxId(wallet_id))
            .unwrap_or(1);
        env.storage()
            .persistent()
            .set(&DataKey::NextTxId(wallet_id), &(tx_id + 1));

        let tx = Transaction {
            id: tx_id,
            wallet_id,
            initiator,
            approvers: Vec::new(&env),
            approvals: 0,
            executed: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Transaction(wallet_id, tx_id), &tx);

        Ok(tx_id)
    }

    /// Approve a pending transaction.
    pub fn approve_transaction(
        env: Env,
        caller: Address,
        wallet_id: u64,
        tx_id: u64,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let wallet: Wallet = env
            .storage()
            .persistent()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(ContractError::WalletNotFound)?;

        if !wallet.owners.contains(&caller) {
            return Err(ContractError::NotAnOwner);
        }

        let mut tx: Transaction = env
            .storage()
            .persistent()
            .get(&DataKey::Transaction(wallet_id, tx_id))
            .ok_or(ContractError::TransactionNotFound)?;

        if tx.executed {
            return Err(ContractError::AlreadyExecuted);
        }
        if tx.approvers.contains(&caller) {
            return Err(ContractError::AlreadyApproved);
        }

        tx.approvers.push_back(caller);
        tx.approvals += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Transaction(wallet_id, tx_id), &tx);

        Ok(())
    }

    /// Execute the transaction once the approval threshold has been reached.
    pub fn execute_transaction(
        env: Env,
        wallet_id: u64,
        tx_id: u64,
    ) -> Result<(), ContractError> {
        let wallet: Wallet = env
            .storage()
            .persistent()
            .get(&DataKey::Wallet(wallet_id))
            .ok_or(ContractError::WalletNotFound)?;

        let mut tx: Transaction = env
            .storage()
            .persistent()
            .get(&DataKey::Transaction(wallet_id, tx_id))
            .ok_or(ContractError::TransactionNotFound)?;

        if tx.executed {
            return Err(ContractError::AlreadyExecuted);
        }
        if tx.approvals < wallet.threshold {
            return Err(ContractError::InsufficientApprovals);
        }

        tx.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Transaction(wallet_id, tx_id), &tx);

        Ok(())
    }

    /// Revoke a previously submitted approval (see [`multisig_revoke::revoke_approval`]).
    pub fn revoke_approval(
        env: Env,
        caller: Address,
        wallet_id: u64,
        tx_id: u64,
    ) -> Result<(), ContractError> {
        multisig_revoke::revoke_approval(&env, caller, wallet_id, tx_id)
    }

    /// Read-only getter for tests / clients.
    pub fn get_transaction(env: Env, wallet_id: u64, tx_id: u64) -> Option<Transaction> {
        env.storage()
            .persistent()
            .get(&DataKey::Transaction(wallet_id, tx_id))
    }
}
