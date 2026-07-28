use soroban_sdk::{Address, Env};

use crate::{errors::MultiSigError, storage};

pub fn require_init(e: &Env) -> Result<(Address, Address), MultiSigError> {
    let admin = storage::get_admin(e).ok_or(MultiSigError::NotInitialized)?;
    let registry = storage::get_registry(e).ok_or(MultiSigError::NotInitialized)?;
    Ok((admin, registry))
}

pub fn require_admin(e: &Env, caller: &Address) -> Result<(), MultiSigError> {
    let admin = storage::get_admin(e).ok_or(MultiSigError::NotInitialized)?;
    if &admin != caller {
        return Err(MultiSigError::Unauthorized);
    }
    Ok(())
}

pub fn now(e: &Env) -> u64 {
    e.ledger().timestamp()
}
