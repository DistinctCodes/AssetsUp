use crate::error::Error;
use crate::types::{
    ActiveProposal, DetokenizationProposal, ExecutedProposal, RejectedProposal, TokenDataKey,
    TokenizedAsset,
};
use crate::voting;
use soroban_sdk::{Address, Env};

/// Propose detokenization (requires voting)
pub fn propose_detokenization(env: &Env, asset_id: u64, proposer: Address) -> Result<u64, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Check if proposal already exists
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    if store.has(&proposal_key) {
        if let Some(DetokenizationProposal::Active(_)) =
            store.get::<_, DetokenizationProposal>(&proposal_key)
        {
            return Err(Error::DetokenizationAlreadyProposed);
        }
    }

    // Create proposal
    let proposal_id = asset_id; // Use asset_id as proposal_id for simplicity
    let timestamp = env.ledger().timestamp();

    let proposal = DetokenizationProposal::Active(ActiveProposal {
        proposal_id,
        proposer,
        created_at: timestamp,
    });

    store.set(&proposal_key, &proposal);

    Ok(proposal_id)
}

/// Execute detokenization if vote passed
/// This will remove all tokens from circulation and clear tokenization records
pub fn execute_detokenization(env: &Env, asset_id: u64, proposal_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Check if proposal is active
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    match store.get::<_, DetokenizationProposal>(&proposal_key) {
        Some(DetokenizationProposal::Active(_)) => {
            // Continue
        }
        _ => {
            return Err(Error::InvalidProposal);
        }
    }

    // Check if proposal passed (>50% votes)
    let passed = voting::proposal_passed(env, asset_id, proposal_id)?;
    if !passed {
        return Err(Error::DetokenizationNotApproved);
    }

    // Save total supply for event before clearing
    let total_supply = tokenized_asset.total_supply;

    // Clear all votes BEFORE removing TokenizedAsset (voting module needs it)
    voting::clear_proposal_votes(env, asset_id, proposal_id)?;

    // Get list of all token holders before clearing
    let holders_list_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders = store.get::<_, soroban_sdk::Vec<Address>>(&holders_list_key)
        .ok_or(Error::AssetNotTokenized)?;

    // Remove all token holder records
    for holder in holders.iter() {
        let holder_key = TokenDataKey::TokenHolder(asset_id, holder.clone());
        if store.has(&holder_key) {
            store.remove(&holder_key);
        }

        // Remove any token locks
        let lock_key = TokenDataKey::TokenLockedUntil(asset_id, holder.clone());
        if store.has(&lock_key) {
            store.remove(&lock_key);
        }

        // Remove unclaimed dividends
        let dividend_key = TokenDataKey::UnclaimedDividend(asset_id, holder);
        if store.has(&dividend_key) {
            store.remove(&dividend_key);
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

    // Remove token metadata
    let metadata_key = TokenDataKey::TokenMetadata(asset_id);
    if store.has(&metadata_key) {
        store.remove(&metadata_key);
    }

    // Remove the tokenized asset record (this eliminates all tokens from circulation)
    if store.has(&key) {
        store.remove(&key);
    }

    // Update proposal to executed
    let timestamp = env.ledger().timestamp();
    let executed_proposal = DetokenizationProposal::Executed(ExecutedProposal {
        proposal_id,
        executed_at: timestamp,
    });
    store.set(&proposal_key, &executed_proposal);

    // Emit event: (asset_id, proposal_id, total_supply_removed)
    env.events().publish(
        ("detokenization", "asset_detokenized"),
        (asset_id, proposal_id, total_supply),
    );

    Ok(())
}

/// Reject detokenization proposal
#[allow(dead_code)]
pub fn reject_detokenization(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get proposal
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    let proposal: DetokenizationProposal =
        store.get(&proposal_key).ok_or(Error::InvalidProposal)?;

    match proposal {
        DetokenizationProposal::Active(ActiveProposal { proposal_id, .. }) => {
            // Mark as rejected
            let timestamp = env.ledger().timestamp();
            let rejected_proposal = DetokenizationProposal::Rejected(RejectedProposal {
                proposal_id,
                rejected_at: timestamp,
            });
            store.set(&proposal_key, &rejected_proposal);

            // Clear votes
            voting::clear_proposal_votes(env, asset_id, proposal_id)?;

            Ok(())
        }
        _ => Err(Error::InvalidProposal),
    }
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
        Some(DetokenizationProposal::Active(_)) => Ok(true),
        _ => Ok(false),
    }
}
