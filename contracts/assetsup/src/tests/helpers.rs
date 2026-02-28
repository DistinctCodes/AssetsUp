use crate::asset::Asset;
use crate::insurance::{ClaimStatus, ClaimType, InsuranceClaim, InsurancePolicy, PolicyStatus, PolicyType};
use crate::types::{AssetStatus, AssetType, CustomAttribute, TokenMetadata};
use crate::{AssetUpContract, AssetUpContractClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

/// Create a fresh test environment
pub fn create_env() -> Env {
    Env::default()
}

/// Create mock addresses for testing
pub fn create_mock_addresses(env: &Env) -> (Address, Address, Address, Address) {
    let admin = Address::generate(env);
    let user1 = Address::generate(env);
    let user2 = Address::generate(env);
    let user3 = Address::generate(env);
    (admin, user1, user2, user3)
}

/// Initialize contract with admin
pub fn initialize_contract<'a>(env: &'a Env, admin: &Address) -> AssetUpContractClient<'a> {
    let contract_id = env.register(AssetUpContract, ());
    let client = AssetUpContractClient::new(env, &contract_id);

    env.mock_all_auths();
    client.initialize(admin);
    client
}

/// Create a test asset
pub fn create_test_asset(env: &Env, owner: &Address, id: BytesN<32>) -> Asset {
    let timestamp = env.ledger().timestamp();

    Asset {
        id,
        name: String::from_str(env, "Test Asset"),
        description: String::from_str(env, "A test asset for unit testing"),
        category: String::from_str(env, "Electronics"),
        owner: owner.clone(),
        registration_timestamp: timestamp,
        last_transfer_timestamp: timestamp,
        status: AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://QmTest123456789"),
        purchase_value: 1000,
        custom_attributes: Vec::new(env),
    }
}

/// Create a test asset with custom attributes
#[allow(dead_code)]
pub fn create_test_asset_with_attributes(
    env: &Env,
    owner: &Address,
    id: BytesN<32>,
    name: &str,
    value: i128,
) -> Asset {
    let timestamp = env.ledger().timestamp();
    let mut attributes = Vec::new(env);
    attributes.push_back(CustomAttribute {
        key: String::from_str(env, "serial_number"),
        value: String::from_str(env, "SN123456"),
    });

    Asset {
        id,
        name: String::from_str(env, name),
        description: String::from_str(env, "Test asset with attributes"),
        category: String::from_str(env, "Equipment"),
        owner: owner.clone(),
        registration_timestamp: timestamp,
        last_transfer_timestamp: timestamp,
        status: AssetStatus::Active,
        metadata_uri: String::from_str(env, "ipfs://QmTestWithAttrs"),
        purchase_value: value,
        custom_attributes: attributes,
    }
}

/// Generate a unique asset ID
pub fn generate_asset_id(env: &Env, seed: u32) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = (seed >> 24) as u8;
    bytes[1] = (seed >> 16) as u8;
    bytes[2] = (seed >> 8) as u8;
    bytes[3] = seed as u8;
    BytesN::from_array(env, &bytes)
}

/// Create token metadata for testing
#[allow(dead_code)]
pub fn create_test_token_metadata(env: &Env) -> TokenMetadata {
    TokenMetadata {
        name: String::from_str(env, "Test Token"),
        description: String::from_str(env, "Test tokenized asset"),
        asset_type: AssetType::Physical,
        ipfs_uri: Some(String::from_str(env, "ipfs://QmTokenMetadata")),
        legal_docs_hash: None,
        valuation_report_hash: None,
        accredited_investor_required: false,
        geographic_restrictions: Vec::new(env),
    }
}

/// Create a test insurance policy
pub fn create_test_policy(
    env: &Env,
    policy_id: BytesN<32>,
    holder: &Address,
    insurer: &Address,
    asset_id: BytesN<32>,
) -> InsurancePolicy {
    let current_time = env.ledger().timestamp();

    InsurancePolicy {
        policy_id,
        holder: holder.clone(),
        insurer: insurer.clone(),
        asset_id,
        policy_type: PolicyType::Property,
        coverage_amount: 10000,
        deductible: 500,
        premium: 100,
        start_date: current_time,
        end_date: current_time + 31536000, // 1 year
        status: PolicyStatus::Active,
        auto_renew: false,
        last_payment: current_time,
    }
}

/// Create a test insurance claim
#[allow(dead_code)]
pub fn create_test_claim(
    env: &Env,
    claim_id: BytesN<32>,
    policy_id: BytesN<32>,
    asset_id: BytesN<32>,
    claimant: &Address,
) -> InsuranceClaim {
    let current_time = env.ledger().timestamp();

    InsuranceClaim {
        claim_id,
        policy_id,
        asset_id,
        claimant: claimant.clone(),
        claim_type: ClaimType::Damage,
        amount: 5000,
        status: ClaimStatus::Submitted,
        filed_at: current_time,
        approved_amount: 0,
    }
}
