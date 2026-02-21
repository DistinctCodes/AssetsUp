use soroban_sdk::{Address, BytesN, Env};

pub fn transfer_requested(
    e: &Env,
    request_id: u64,
    asset_id: &BytesN<32>,
    from_owner: &Address,
    to_owner: &Address,
    timestamp: u64,
) {
    e.events().publish(
        ("TransferRequested",),
        (
            request_id,
            asset_id.clone(),
            from_owner.clone(),
            to_owner.clone(),
            timestamp,
        ),
    );
}

pub fn transfer_approved(e: &Env, request_id: u64, approver: &Address, count: u32, timestamp: u64) {
    e.events().publish(
        ("TransferApproved",),
        (request_id, approver.clone(), count, timestamp),
    );
}

pub fn transfer_rejected(
    e: &Env,
    request_id: u64,
    rejector: &Address,
    reason_hash: &BytesN<32>,
    timestamp: u64,
) {
    e.events().publish(
        ("TransferRejected",),
        (request_id, rejector.clone(), reason_hash.clone(), timestamp),
    );
}

pub fn transfer_executed(
    e: &Env,
    request_id: u64,
    asset_id: &BytesN<32>,
    new_owner: &Address,
    timestamp: u64,
) {
    e.events().publish(
        ("TransferExecuted",),
        (request_id, asset_id.clone(), new_owner.clone(), timestamp),
    );
}

pub fn transfer_cancelled(e: &Env, request_id: u64, cancelled_by: &Address, timestamp: u64) {
    e.events().publish(
        ("TransferCancelled",),
        (request_id, cancelled_by.clone(), timestamp),
    );
}

pub fn approval_rule_updated(e: &Env, category: &BytesN<32>, required: u32, timestamp: u64) {
    e.events().publish(
        ("ApprovalRuleUpdated",),
        (category.clone(), required, timestamp),
    );
}

pub fn approver_added(e: &Env, approver: &Address, added_by: &Address, timestamp: u64) {
    e.events().publish(
        ("ApproverAdded",),
        (approver.clone(), added_by.clone(), timestamp),
    );
}

pub fn approver_removed(e: &Env, approver: &Address, removed_by: &Address, timestamp: u64) {
    e.events().publish(
        ("ApproverRemoved",),
        (approver.clone(), removed_by.clone(), timestamp),
    );
}
