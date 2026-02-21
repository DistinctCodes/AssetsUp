use crate::error::Error;
use crate::types::{ActiveProposal, DetokenizationProposal, ExecutedProposal, RejectedProposal, TokenDataKey, TokenizedAsset};
use crate::voting;
use soroban_sdk::{Address, Env};

/// Propose detokenization (requires voting)
pub fn propose_detokenization(
    env: &Env,
    asset_id: u64,
    proposer: Address,
) -> Result<u64, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    // Check if proposal already exists
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    if store.has(&proposal_key) {
        if let Some(DetokenizationProposal::Active(_)) = store.get::<_, DetokenizationProposal>(&proposal_key) {
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
pub fn execute_detokenization(
    env: &Env,
    asset_id: u64,
    proposal_id: u64,
) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

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

    // Update proposal to executed
    let timestamp = env.ledger().timestamp();
    let executed_proposal = DetokenizationProposal::Executed(ExecutedProposal {
        proposal_id,
        executed_at: timestamp,
    });
    store.set(&proposal_key, &executed_proposal);

    // Clear all votes
    voting::clear_proposal_votes(env, asset_id, proposal_id)?;

    // Emit event: (asset_id, proposal_id)
    env.events().publish(
        ("detokenization", "asset_detokenized"),
        (asset_id, proposal_id),
    );

    Ok(())
}

/// Reject detokenization proposal
pub fn reject_detokenization(env: &Env, asset_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store
        .get(&key)
        .ok_or(Error::AssetNotTokenized)?;

    // Get proposal
    let proposal_key = TokenDataKey::DetokenizationProposal(asset_id);
    let proposal: DetokenizationProposal = store
        .get(&proposal_key)
        .ok_or(Error::InvalidProposal)?;

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
    store
        .get(&key)
        .ok_or(Error::InvalidProposal)
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
