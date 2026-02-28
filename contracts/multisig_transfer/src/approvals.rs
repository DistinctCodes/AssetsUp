use soroban_sdk::{Address, Env};

use crate::{errors::MultiSigError, storage};

pub fn was_approved(e: &Env, request_id: u64, approver: &Address) -> bool {
    let key = (request_id, approver.clone());
    e.storage().persistent().get::<_, bool>(&key).unwrap_or(false)
}

pub fn mark_approved(e: &Env, request_id: u64, approver: &Address) {
    let key = (request_id, approver.clone());
    e.storage().persistent().set(&key, &true);
}

pub fn is_authorized_approver(approvers: &soroban_sdk::Vec<Address>, who: &Address) -> bool {
    for a in approvers.iter() {
        if &a == who {
            return true;
        }
    }
    false
}

pub fn ensure_not_double_approved(e: &Env, request_id: u64, approver: &Address) -> Result<(), MultiSigError> {
    if was_approved(e, request_id, approver) {
        return Err(MultiSigError::AlreadyApproved);
    }
    Ok(())
}
