use soroban_sdk::{Address, Env};

use crate::errors::MultiSigError;
use crate::ttl;

pub fn was_approved(e: &Env, request_id: u64, approver: &Address) -> bool {
    let key = (request_id, approver.clone());
    // Extended on read as well as write: a request that reached its threshold
    // is never written again, so a write-only policy would let its approval
    // record lapse out from under a completed transfer.
    ttl::extend_persistent(e, &key);
    e.storage()
        .persistent()
        .get::<_, bool>(&key)
        .unwrap_or(false)
}

pub fn mark_approved(e: &Env, request_id: u64, approver: &Address) {
    let key = (request_id, approver.clone());
    e.storage().persistent().set(&key, &true);
    ttl::extend_persistent(e, &key);
}

pub fn is_authorized_approver(approvers: &soroban_sdk::Vec<Address>, who: &Address) -> bool {
    for a in approvers.iter() {
        if &a == who {
            return true;
        }
    }
    false
}

pub fn ensure_not_double_approved(
    e: &Env,
    request_id: u64,
    approver: &Address,
) -> Result<(), MultiSigError> {
    if was_approved(e, request_id, approver) {
        return Err(MultiSigError::AlreadyApproved);
    }
    Ok(())
}
