#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Released,
    Disputed,
    Resolved,
    Cancelled,
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
    pub dispute_reason: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    fn get_admin(env: &Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("Admin not initialized")
    }

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
            dispute_reason: None,
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

        escrow.status = EscrowStatus::Released;
        env.storage().persistent().set(&escrow_id, &escrow);

        env.events().publish((Symbol::new(&env, "escrow_released"), escrow_id), escrow);
    }

    pub fn release_escrow(env: Env, escrow_id: u64) {
        let mut escrow: Escrow = env.storage().persistent().get(&escrow_id).unwrap();

        let caller_is_buyer = env.auths().iter().any(|(address, _)| *address == escrow.buyer);
        let caller_is_admin = env.auths().iter().any(|(address, _)| *address == Self::get_admin(&env));

        if !caller_is_buyer && !caller_is_admin {
            panic!("Unauthorized");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        escrow.status = EscrowStatus::Released;
        env.storage().persistent().set(&escrow_id, &escrow);

        env.events().publish((Symbol::new(&env, "escrow_released"), escrow_id), escrow);
    }

    pub fn dispute_escrow(env: Env, escrow_id: u64, reason: String) {
        let mut escrow: Escrow = env.storage().persistent().get(&escrow_id).unwrap();

        let caller_is_buyer = env.auths().iter().any(|(address, _)| *address == escrow.buyer);
        let caller_is_seller = env.auths().iter().any(|(address, _)| *address == escrow.seller);

        if !caller_is_buyer && !caller_is_seller {
            panic!("Unauthorized");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        escrow.status = EscrowStatus::Disputed;
        escrow.dispute_reason = Some(reason.clone());
        env.storage().persistent().set(&escrow_id, &escrow);

        env.events().publish(
            (Symbol::new(&env, "dispute_raised"), escrow_id),
            (reason, escrow.buyer, escrow.seller),
        );
    }

    pub fn resolve_dispute(env: Env, escrow_id: u64, release_to_recipient: bool) {
        let admin = Self::get_admin(&env);
        admin.require_auth();

        let mut escrow: Escrow = env.storage().persistent().get(&escrow_id).unwrap();

        if escrow.status != EscrowStatus::Disputed {
            panic!("Escrow is not disputed");
        }

        if release_to_recipient {
            escrow.status = EscrowStatus::Released;
            env.events().publish((Symbol::new(&env, "escrow_released"), escrow_id), escrow.clone());
        } else {
            escrow.status = EscrowStatus::Resolved;
        }

        env.storage().persistent().set(&escrow_id, &escrow);
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
