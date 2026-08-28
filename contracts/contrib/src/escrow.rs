//! Asset-sale escrow state machine.
//!
//! Like `insurance` and `lease`, this module tracks escrow *state* — it does
//! not hold or move token balances. `amount` and `token_address` describe the
//! terms of the deal for off-chain settlement or a future on-chain payment
//! leg; this contract does not call into a token contract on the buyer's or
//! seller's behalf. Wiring in real custody is a separate, larger change.
//!
//! An escrow moves from `Active` to exactly one of `Completed` (buyer
//! confirms release) or `Cancelled` (buyer or seller backs out) — never both,
//! since both actions require `Active` and leave the escrow in a terminal
//! state.

use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub escrow_id: u64,
    pub asset_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub amount: i128,
    pub token_address: Address,
    pub deadline: u64,
    pub status: EscrowStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Escrow(u64),
    NextEscrowId,
}

#[allow(clippy::too_many_arguments)]
pub fn create_escrow(
    env: Env,
    asset_id: u64,
    seller: Address,
    buyer: Address,
    amount: i128,
    token_address: Address,
    deadline: u64,
) -> u64 {
    buyer.require_auth();

    let store = env.storage().persistent();

    // Server-generated, monotonically increasing id — the original API took
    // the id as a caller-supplied argument, which let a second call silently
    // overwrite an existing escrow.
    let escrow_id: u64 = store.get(&DataKey::NextEscrowId).unwrap_or(0);
    store.set(&DataKey::NextEscrowId, &(escrow_id + 1));

    let escrow = Escrow {
        escrow_id,
        asset_id,
        seller: seller.clone(),
        buyer: buyer.clone(),
        amount,
        token_address,
        deadline,
        status: EscrowStatus::Active,
    };
    store.set(&DataKey::Escrow(escrow_id), &escrow);

    crate::events::escrow_opened(&env, escrow_id, asset_id, &seller, &buyer, amount);

    escrow_id
}

pub fn confirm_release(env: Env, escrow_id: u64, caller: Address) {
    caller.require_auth();

    let store = env.storage().persistent();
    let key = DataKey::Escrow(escrow_id);
    let mut escrow: Escrow = store.get(&key).expect("Escrow not found");

    if caller != escrow.buyer {
        panic!("Unauthorized: only the buyer can release the escrow");
    }
    if escrow.status != EscrowStatus::Active {
        panic!("Escrow is not active");
    }

    escrow.status = EscrowStatus::Completed;
    store.set(&key, &escrow);

    crate::events::escrow_released(&env, escrow_id, &caller);
}

pub fn cancel_escrow(env: Env, escrow_id: u64, caller: Address) {
    caller.require_auth();

    let store = env.storage().persistent();
    let key = DataKey::Escrow(escrow_id);
    let mut escrow: Escrow = store.get(&key).expect("Escrow not found");

    if caller != escrow.buyer && caller != escrow.seller {
        panic!("Unauthorized: only the buyer or seller can cancel the escrow");
    }
    if escrow.status != EscrowStatus::Active {
        panic!("Escrow is not active");
    }

    escrow.status = EscrowStatus::Cancelled;
    store.set(&key, &escrow);

    crate::events::escrow_cancelled(&env, escrow_id, &caller);
}

pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
    env.storage()
        .persistent()
        .get(&DataKey::Escrow(escrow_id))
        .expect("Escrow not found")
}
