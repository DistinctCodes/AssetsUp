#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug)]
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

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn create_escrow(
        env: Env,
        escrow_id: u64,
        asset_id: u64,
        seller: Address,
        buyer: Address,
        amount: i128,
        token_address: Address,
        deadline: u64,
    ) {
        buyer.require_auth();

        let escrow = Escrow {
            escrow_id,
            asset_id,
            seller,
            buyer,
            amount,
            token_address,
            deadline,
            status: EscrowStatus::Active,
        };

        env.storage().persistent().set(&escrow_id, &escrow);

        // Emit event for escrow creation
        env.events().publish((Symbol::new(&env, "escrow_created"), escrow_id), escrow);
    }

    pub fn confirm_release(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().persistent().get(&escrow_id).unwrap();
        
        // Buyer confirms receipt
        escrow.buyer.require_auth();

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        escrow.status = EscrowStatus::Completed;
        env.storage().persistent().set(&escrow_id, &escrow);

        // Emit event for release
        env.events().publish((Symbol::new(&env, "escrow_completed"), escrow_id), escrow);
    }

    pub fn cancel_escrow(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().persistent().get(&escrow_id).unwrap();

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        // In a real implementation, we would verify auth from either buyer or seller here
        // and only allow cancellation before deadline if both agree, or if deadline has passed.
        
        escrow.status = EscrowStatus::Cancelled;
        env.storage().persistent().set(&escrow_id, &escrow);

        // Emit event for cancellation
        env.events().publish((Symbol::new(&env, "escrow_cancelled"), escrow_id), escrow);
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage().persistent().get(&escrow_id).unwrap()
    }
}

#[cfg(test)]
mod test;
