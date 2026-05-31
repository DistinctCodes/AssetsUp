use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::error::ContractError;
use crate::types::{DataKey, Transaction, Wallet};

/// Revoke a previously submitted approval for a pending transaction.
///
/// Acceptance criteria:
/// - Caller must be an existing owner of the wallet (`NotAnOwner`).
/// - If caller has not approved the transaction, returns `ApprovalNotFound`.
/// - If the transaction is already executed, returns `AlreadyExecuted`.
/// - Decrements the approval count and removes the caller from the approvers list.
/// - Emits an `approval_revoked` event with `tx_id` and revoker `Address`.
pub fn revoke_approval(
    env: &Env,
    caller: Address,
    wallet_id: u64,
    tx_id: u64,
) -> Result<(), ContractError> {
    caller.require_auth();

    // Load wallet and check that the caller is an owner.
    let wallet: Wallet = env
        .storage()
        .persistent()
        .get(&DataKey::Wallet(wallet_id))
        .ok_or(ContractError::WalletNotFound)?;

    if !wallet.owners.contains(&caller) {
        return Err(ContractError::NotAnOwner);
    }

    // Load the transaction.
    let mut tx: Transaction = env
        .storage()
        .persistent()
        .get(&DataKey::Transaction(wallet_id, tx_id))
        .ok_or(ContractError::TransactionNotFound)?;

    // Cannot revoke once executed.
    if tx.executed {
        return Err(ContractError::AlreadyExecuted);
    }

    // Find the caller in the approvers list; if missing, there is nothing to revoke.
    let position = find_approver(&tx.approvers, &caller)
        .ok_or(ContractError::ApprovalNotFound)?;

    // Remove the caller from approvers and decrement the approval count.
    tx.approvers.remove(position);
    tx.approvals = tx.approvals.saturating_sub(1);

    env.storage()
        .persistent()
        .set(&DataKey::Transaction(wallet_id, tx_id), &tx);

    // Emit `approval_revoked` event with tx_id and revoker.
    let topic = Symbol::new(env, "approval_revoked");
    env.events().publish((topic, tx_id), caller);

    Ok(())
}

fn find_approver(approvers: &Vec<Address>, target: &Address) -> Option<u32> {
    let mut idx: u32 = 0;
    for a in approvers.iter() {
        if &a == target {
            return Some(idx);
        }
        idx += 1;
    }
    None
}
