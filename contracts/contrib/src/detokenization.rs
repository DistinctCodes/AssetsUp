use crate::error::Error;
use crate::types::{DetokenizationProposal, DetokenizationStatus, TokenDataKey, TokenizedAsset};
use soroban_sdk::{Address, Env};

/// Propose detokenization (requires voting)
pub fn propose_detokenization(env: &Env, asset_id: u64, proposer: Address) -> Result<u64, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Check if proposal already exists and is active
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    if let Some(proposal) = store.get::<_, DetokenizationProposal>(&proposal_key) {
        if proposal.status == DetokenizationStatus::Active {
            return Err(Error::DetokenizationAlreadyProposed);
        }
    }

    // Create proposal
    let proposal_id = asset_id; // Use asset_id as proposal_id for simplicity
    let timestamp = env.ledger().timestamp();
    let deadline = timestamp + 86400; // 24 hours from now

    let proposal = DetokenizationProposal {
        proposal_id,
        asset_id,
        proposer,
        deadline,
        status: DetokenizationStatus::Active,
    };

    store.set(&proposal_key, &proposal);

    Ok(proposal_id)
}

/// Execute detokenization if vote passed
/// This will remove all tokens from circulation and clear tokenization records
pub fn execute_detokenization(env: &Env, asset_id: u64, proposal_id: u64) {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    if !store.has(&key) {
        panic!("Asset not tokenized");
    }

    // Check if proposal exists and is active
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    let proposal: DetokenizationProposal = match store.get(&proposal_key) {
        Some(p) => p,
        None => panic!("Proposal not found"),
    };

    // Check if already executed
    if proposal.status == DetokenizationStatus::Executed {
        panic!("{}", Error::DetokenizationAlreadyExecuted as u32);
    }

    // Check if proposal passed (>50% votes)
    let passed = proposal_passed(env, asset_id, proposal_id);
    if !passed {
        panic!("{}", Error::DetokenizationNotApproved as u32);
    }

    // Get tokenized asset before removal
    let tokenized_asset: TokenizedAsset = store.get(&key).unwrap();

    // Get list of all token holders before clearing
    let holders_list_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders: soroban_sdk::Vec<Address> = match store.get(&holders_list_key) {
        Some(h) => h,
        None => soroban_sdk::Vec::new(env),
    };

    // Remove all token holder records
    for holder in holders.iter() {
        let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
        if store.has(&holder_key) {
            store.remove(&holder_key);
        }
    }

    // Remove token holders list
    if store.has(&holders_list_key) {
        store.remove(&holders_list_key);
    }

    // Remove transfer restrictions
    let restriction_key = TokenDataKey::TransferRestriction(asset_id);
    if store.has(&restriction_key) {
        store.remove(&restriction_key);
    }

    // Remove whitelist
    let whitelist_key = TokenDataKey::Whitelist(asset_id);
    if store.has(&whitelist_key) {
        store.remove(&whitelist_key);
    }

    // Remove the tokenized asset record (this eliminates all tokens from circulation)
    store.remove(&key);

    // Update proposal to executed
    let executed_proposal = DetokenizationProposal {
        proposal_id,
        asset_id,
        proposer: proposal.proposer,
        deadline: proposal.deadline,
        status: DetokenizationStatus::Executed,
    };
    store.set(&proposal_key, &executed_proposal);

    // Emit event: (asset_id, proposal_id, total_supply_removed)
    env.events().publish(
        ("detokenization", "asset_detokenized"),
        (asset_id, proposal_id, tokenized_asset.total_supply),
    );
}

/// Check if proposal passed (vote tally > 50% of total supply)
fn proposal_passed(env: &Env, asset_id: u64, proposal_id: u64) -> bool {
    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = match store.get(&key) {
        Some(a) => a,
        None => return false,
    };

    // Get vote tally
    let tally_key = TokenDataKey::ProposalYesVotes(proposal_id);
    let tally: i128 = store.get::<_, i128>(&tally_key).unwrap_or(0);

    // Check if more than 50% of total supply voted yes
    tally > (tokenized_asset.total_supply / 2)
}

/// Get detokenization proposal status
pub fn get_detokenization_proposal(
    env: &Env,
    asset_id: u64,
) -> Result<DetokenizationProposal, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::DetokenizationProposal(asset_id);
    store.get(&key).ok_or(Error::InvalidProposal)
}

/// Check if detokenization is in progress
pub fn is_detokenization_active(env: &Env, asset_id: u64) -> Result<bool, Error> {
    let store = env.storage().persistent();

    let key = TokenDataKey::DetokenizationProposal(asset_id);
    match store.get::<_, DetokenizationProposal>(&key) {
        Some(proposal) => Ok(proposal.status == DetokenizationStatus::Active),
        None => Ok(false),
    }
}
