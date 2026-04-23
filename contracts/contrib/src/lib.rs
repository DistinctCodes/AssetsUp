mod pause;
mod metadata;

use soroban_sdk::{contractimpl, Env};
use pause::*;
use metadata::*;

pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn pause(env: Env) {
        pause(&env);
    }

    pub fn unpause(env: Env) {
        unpause(&env);
    }

    pub fn is_paused(env: Env) -> bool {
        is_paused(&env)
    }

    pub fn get_contract_metadata(env: Env) -> ContractMetadata {
        get_contract_metadata(&env)
    }
}
