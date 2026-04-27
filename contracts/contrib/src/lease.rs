use crate::{Asset, DataKey as GlobalDataKey};
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LeaseStatus {
    Active,
    Returned,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lease {
    pub lease_id: BytesN<32>,
    pub asset_id: BytesN<32>,
    pub lessor: Address,
    pub lessee: Address,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub rent_per_period: i128,
    pub deposit: i128,
    pub status: LeaseStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Lease(BytesN<32>),
    AssetLeases(BytesN<32>),
}

#[allow(clippy::too_many_arguments)]
pub fn create_lease(
    env: Env,
    asset_id: BytesN<32>,
    lessee: Address,
    start: u64,
    end: u64,
    rent: i128,
    deposit: i128,
    lessor: Address,
) -> BytesN<32> {
    lessor.require_auth();

    let store = env.storage().persistent();
    let asset: Asset = store
        .get(&GlobalDataKey::Asset(asset_id.clone()))
        .expect("Asset not found");

    if asset.owner != lessor {
        panic!("Unauthorized: Only asset owner can create lease");
    }

    // Generate a unique lease_id
    let lease_id_bytes = env.crypto().sha256(&asset_id.clone().into());
    let lease_id: BytesN<32> = lease_id_bytes.into();

    let lease = Lease {
        lease_id: lease_id.clone(),
        asset_id: asset_id.clone(),
        lessor: lessor.clone(),
        lessee: lessee.clone(),
        start_timestamp: start,
        end_timestamp: end,
        rent_per_period: rent,
        deposit,
        status: LeaseStatus::Active,
    };

    let key = DataKey::Lease(lease_id.clone());
    if store.has(&key) {
        panic!("Lease already exists for this asset (simplified ID collision)");
    }

    store.set(&key, &lease);

    // Update asset's lease list
    let list_key = DataKey::AssetLeases(asset_id.clone());
    let mut leases: Vec<BytesN<32>> = store.get(&list_key).unwrap_or_else(|| Vec::new(&env));
    leases.push_back(lease_id.clone());
    store.set(&list_key, &leases);

    env.events().publish(
        (symbol_short!("lease_cr"), lease_id.clone()),
        (asset_id, lessor, lessee),
    );

    lease_id
}

pub fn check_in_lease(env: Env, lease_id: BytesN<32>, caller: Address) {
    caller.require_auth();
    let store = env.storage().persistent();
    let key = DataKey::Lease(lease_id.clone());
    let mut lease: Lease = store.get(&key).expect("Lease not found");

    if caller != lease.lessor {
        panic!("Unauthorized: Only lessor can check in lease");
    }

    lease.status = LeaseStatus::Returned;
    store.set(&key, &lease);

    env.events().publish(
        (symbol_short!("lease_in"), lease_id),
        (env.ledger().timestamp(),),
    );
}

pub fn cancel_lease(env: Env, lease_id: BytesN<32>, caller: Address) {
    caller.require_auth();
    let store = env.storage().persistent();
    let key = DataKey::Lease(lease_id.clone());
    let mut lease: Lease = store.get(&key).expect("Lease not found");

    let admin: Address = store.get(&GlobalDataKey::Admin).expect("Not initialized");

    if caller != lease.lessor && caller != admin {
        panic!("Unauthorized: Only lessor or admin can cancel lease");
    }

    lease.status = LeaseStatus::Cancelled;
    store.set(&key, &lease);

    env.events().publish(
        (symbol_short!("lease_can"), lease_id),
        (caller, env.ledger().timestamp()),
    );
}

pub fn get_active_leases(env: Env, asset_id: BytesN<32>) -> Vec<BytesN<32>> {
    let store = env.storage().persistent();
    let list_key = DataKey::AssetLeases(asset_id);
    let leases: Vec<BytesN<32>> = store.get(&list_key).unwrap_or_else(|| Vec::new(&env));

    let mut active_leases = Vec::new(&env);
    for lid in leases.iter() {
        let l: Lease = store.get(&DataKey::Lease(lid.clone())).unwrap();
        if l.status == LeaseStatus::Active {
            active_leases.push_back(lid);
        }
    }
    active_leases
}
