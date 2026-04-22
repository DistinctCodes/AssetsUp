#![no_std]

use soroban_sdk::{contract, contractimpl, Env};

/// Stub trait that will be expanded in later issues.
pub trait ContractTrait {
    /// Initialize the contract.
    fn initialize(env: Env);
}

#[contract]
pub struct ContribContract;

#[contractimpl]
impl ContractTrait for ContribContract {
    fn initialize(_env: Env) {
        // Stub implementation to be expanded later
    }
}
