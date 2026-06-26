use soroban_sdk::{contracttype, Address, BytesN, Env, Map, Vec};

use crate::types::{ApprovalRule, TransferRequest};

#[contracttype]
pub enum DataKey {
    Admin,               // Address
    AssetRegistry,       // Address
    NextRequestId,       // u64
    Requests,            // Map<u64, TransferRequest>
    Rules,               // Map<BytesN<32>, ApprovalRule>
    PendingApprovals,    // Map<u64, Vec<Address>>
    ApprovalFlags,       // Map<(u64, Address), bool>
    ApprovalSignatures,  // Map<(u64, Address), BytesN<64>> (optional)
    AssetPendingRequest, // Map<BytesN<32>, u64>
    AssetHistory,        // Map<BytesN<32>, Vec<u64>>
}

pub fn get_admin(e: &Env) -> Option<Address> {
    e.storage().persistent().get(&DataKey::Admin)
}

pub fn set_admin(e: &Env, admin: &Address) {
    e.storage().persistent().set(&DataKey::Admin, admin);
}

pub fn get_registry(e: &Env) -> Option<Address> {
    e.storage().persistent().get(&DataKey::AssetRegistry)
}

pub fn set_registry(e: &Env, registry: &Address) {
    e.storage()
        .persistent()
        .set(&DataKey::AssetRegistry, registry);
}

pub fn next_request_id(e: &Env) -> u64 {
    e.storage()
        .persistent()
        .get(&DataKey::NextRequestId)
        .unwrap_or(1)
}

pub fn bump_request_id(e: &Env) -> u64 {
    let id = next_request_id(e);
    e.storage()
        .persistent()
        .set(&DataKey::NextRequestId, &(id + 1));
    id
}

pub fn requests_map(e: &Env) -> Map<u64, TransferRequest> {
    e.storage()
        .persistent()
        .get(&DataKey::Requests)
        .unwrap_or(Map::new(e))
}

pub fn set_requests_map(e: &Env, m: &Map<u64, TransferRequest>) {
    e.storage().persistent().set(&DataKey::Requests, m);
}

pub fn rules_map(e: &Env) -> Map<BytesN<32>, ApprovalRule> {
    e.storage()
        .persistent()
        .get(&DataKey::Rules)
        .unwrap_or(Map::new(e))
}

pub fn set_rules_map(e: &Env, m: &Map<BytesN<32>, ApprovalRule>) {
    e.storage().persistent().set(&DataKey::Rules, m);
}

pub fn pending_approvals_map(e: &Env) -> Map<u64, Vec<Address>> {
    e.storage()
        .persistent()
        .get(&DataKey::PendingApprovals)
        .unwrap_or(Map::new(e))
}

pub fn set_pending_approvals_map(e: &Env, m: &Map<u64, Vec<Address>>) {
    e.storage().persistent().set(&DataKey::PendingApprovals, m);
}

pub fn asset_pending_map(e: &Env) -> Map<BytesN<32>, u64> {
    e.storage()
        .persistent()
        .get(&DataKey::AssetPendingRequest)
        .unwrap_or(Map::new(e))
}

pub fn set_asset_pending_map(e: &Env, m: &Map<BytesN<32>, u64>) {
    e.storage()
        .persistent()
        .set(&DataKey::AssetPendingRequest, m);
}

pub fn asset_history_map(e: &Env) -> Map<BytesN<32>, Vec<u64>> {
    e.storage()
        .persistent()
        .get(&DataKey::AssetHistory)
        .unwrap_or(Map::new(e))
}

pub fn set_asset_history_map(e: &Env, m: &Map<BytesN<32>, Vec<u64>>) {
    e.storage().persistent().set(&DataKey::AssetHistory, m);
}
