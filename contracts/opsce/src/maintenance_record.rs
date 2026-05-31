use soroban_sdk::{Address, Bytes, BytesN, Env, String, Symbol, Vec};

use crate::error::ContractError;
use crate::types::{
    DataKey, MaintenanceRecord, MaintenanceRecordType, MaintenanceStatus,
};

/// Maximum length (bytes) of an `asset_id` we will hash on the stack.
/// Soroban contracts run in `no_std`, so we use a fixed-size scratch buffer.
const MAX_ASSET_ID_LEN: usize = 256;

/// Create a new maintenance record on-chain.
///
/// Acceptance criteria:
/// - Validates that `asset_id` is non-empty (`InvalidAssetId`).
/// - Validates that `cost` is non-negative (`InvalidCost`).
/// - Generates a unique `record_id` from `sha256(asset_id || timestamp)`.
/// - Stores under [`DataKey::MaintenanceRecord`].
/// - Indexes the record under the asset's id list ([`DataKey::MaintenanceIndex`]).
/// - Emits a `maintenance_scheduled` event.
/// - Returns `DuplicateRecord` if the same `record_id` already exists
///   (asset_id + timestamp collision within a single ledger).
#[allow(clippy::too_many_arguments)]
pub fn create_maintenance_record(
    env: &Env,
    asset_id: String,
    record_type: MaintenanceRecordType,
    provider: Address,
    scheduled_date: u64,
    cost: i128,
    notes: String,
) -> Result<BytesN<32>, ContractError> {
    provider.require_auth();

    // 1. Validate inputs.
    if asset_id.len() == 0 {
        return Err(ContractError::InvalidAssetId);
    }
    if cost < 0 {
        return Err(ContractError::InvalidCost);
    }

    let timestamp = env.ledger().timestamp();

    // 2. Derive a unique `record_id = sha256(asset_id || timestamp_be)`.
    let record_id = derive_record_id(env, &asset_id, timestamp)?;

    // 3. Duplicate prevention.
    if env
        .storage()
        .persistent()
        .has(&DataKey::MaintenanceRecord(record_id.clone()))
    {
        return Err(ContractError::DuplicateRecord);
    }

    // 4. Build and persist the record.
    let record = MaintenanceRecord {
        record_id: record_id.clone(),
        asset_id: asset_id.clone(),
        record_type,
        provider: provider.clone(),
        scheduled_date,
        cost,
        notes,
        status: MaintenanceStatus::Scheduled,
        created_at: timestamp,
    };

    env.storage()
        .persistent()
        .set(&DataKey::MaintenanceRecord(record_id.clone()), &record);

    // 5. Append to per-asset index.
    let mut index: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(&DataKey::MaintenanceIndex(asset_id.clone()))
        .unwrap_or_else(|| Vec::new(env));
    index.push_back(record_id.clone());
    env.storage()
        .persistent()
        .set(&DataKey::MaintenanceIndex(asset_id), &index);

    // 6. Emit `maintenance_scheduled` event.
    let topic = Symbol::new(env, "maintenance_scheduled");
    env.events()
        .publish((topic, record_id.clone()), (provider, timestamp));

    Ok(record_id)
}

/// Return all maintenance records associated with `asset_id`.
pub fn get_maintenance_records(env: &Env, asset_id: String) -> Vec<MaintenanceRecord> {
    let index: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(&DataKey::MaintenanceIndex(asset_id))
        .unwrap_or_else(|| Vec::new(env));

    let mut out: Vec<MaintenanceRecord> = Vec::new(env);
    for id in index.iter() {
        if let Some(record) = env
            .storage()
            .persistent()
            .get::<_, MaintenanceRecord>(&DataKey::MaintenanceRecord(id))
        {
            out.push_back(record);
        }
    }
    out
}

/// Build `record_id = sha256(asset_id_bytes || timestamp_be_bytes)`.
fn derive_record_id(
    env: &Env,
    asset_id: &String,
    timestamp: u64,
) -> Result<BytesN<32>, ContractError> {
    let len = asset_id.len() as usize;
    if len == 0 || len > MAX_ASSET_ID_LEN {
        return Err(ContractError::InvalidAssetId);
    }

    // Copy String bytes onto a fixed-size stack buffer (no_std friendly).
    let mut scratch = [0u8; MAX_ASSET_ID_LEN];
    asset_id.copy_into_slice(&mut scratch[..len]);

    let mut data = Bytes::from_slice(env, &scratch[..len]);
    let ts_bytes = timestamp.to_be_bytes();
    data.append(&Bytes::from_slice(env, &ts_bytes));

    Ok(env.crypto().sha256(&data).to_bytes())
}
