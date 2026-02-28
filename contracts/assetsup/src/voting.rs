use crate::error::Error;
use crate::types::{OwnershipRecord, TokenDataKey, TokenizedAsset};
use soroban_sdk::{Address, Env, Vec};

/// Cast a vote on a proposal
pub fn cast_vote(env: &Env, asset_id: u64, proposal_id: u64, voter: Address) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get voter's balance
    let holder_key = TokenDataKey::TokenHolder(asset_id, voter.clone());
    let ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Check if voter has sufficient voting power
    if ownership.balance < tokenized_asset.min_voting_threshold {
        return Err(Error::InsufficientVotingPower);
    }

    // Check if voter already voted
    let vote_key = TokenDataKey::VoteRecord(asset_id, proposal_id, voter.clone());
    if store.has(&vote_key) {
        return Err(Error::AlreadyVoted);
    }

    // Record vote
    store.set(&vote_key, &true);

    // Update vote tally
    let tally_key = TokenDataKey::VoteTally(asset_id, proposal_id);
    let current_tally: i128 = store.get::<_, i128>(&tally_key).unwrap_or(0);

    let new_tally = current_tally + ownership.balance;
    store.set(&tally_key, &new_tally);

    // Emit event: (asset_id, proposal_id, voter, weight)
    env.events().publish(
        ("voting", "vote_cast"),
        (asset_id, proposal_id, voter, ownership.balance),
    );

    Ok(())
}

/// Get vote tally for a proposal
pub fn get_vote_tally(env: &Env, asset_id: u64, proposal_id: u64) -> Result<i128, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    let tally_key = TokenDataKey::VoteTally(asset_id, proposal_id);

    Ok(store.get::<_, i128>(&tally_key).unwrap_or(0))
}

/// Check if an address has voted on a proposal
pub fn has_voted(
    env: &Env,
    asset_id: u64,
    proposal_id: u64,
    voter: Address,
) -> Result<bool, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    let vote_key = TokenDataKey::VoteRecord(asset_id, proposal_id, voter);

    Ok(store.has(&vote_key))
}

/// Check if a proposal passed (vote tally > 50% of total supply)
pub fn proposal_passed(env: &Env, asset_id: u64, proposal_id: u64) -> Result<bool, Error> {
    let store = env.storage().persistent();

    // Get tokenized asset
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get vote tally
    let tally_key = TokenDataKey::VoteTally(asset_id, proposal_id);
    let tally: i128 = store.get::<_, i128>(&tally_key).unwrap_or(0);

    // Calculate required threshold
    let threshold =
        (tokenized_asset.total_supply * tokenized_asset.detokenize_threshold as i128) / 100;

    Ok(tally > threshold)
}

/// Get list of voters who participated in a proposal
#[allow(dead_code)]
pub fn get_proposal_voters(
    env: &Env,
    asset_id: u64,
    proposal_id: u64,
) -> Result<Vec<Address>, Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get all token holders
    let holders_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders: Vec<Address> = store.get(&holders_key).ok_or(Error::AssetNotTokenized)?;

    // Filter those who voted
    let mut voters = Vec::new(env);
    for holder in holders.iter() {
        let vote_key = TokenDataKey::VoteRecord(asset_id, proposal_id, holder.clone());
        if store.has(&vote_key) {
            voters.push_back(holder);
        }
    }

    Ok(voters)
}

/// Clear all voting records for a proposal (after execution or rejection)
pub fn clear_proposal_votes(env: &Env, asset_id: u64, proposal_id: u64) -> Result<(), Error> {
    let store = env.storage().persistent();

    // Verify asset is tokenized
    let key = TokenDataKey::TokenizedAsset(asset_id);
    let _: TokenizedAsset = store.get(&key).ok_or(Error::AssetNotTokenized)?;

    // Get all token holders
    let holders_key = TokenDataKey::TokenHoldersList(asset_id);
    let holders: Vec<Address> = store.get(&holders_key).ok_or(Error::AssetNotTokenized)?;

    // Remove all vote records
    for holder in holders.iter() {
        let vote_key = TokenDataKey::VoteRecord(asset_id, proposal_id, holder);
        if store.has(&vote_key) {
            store.remove(&vote_key);
        }
    }

    // Clear tally
    let tally_key = TokenDataKey::VoteTally(asset_id, proposal_id);
    if store.has(&tally_key) {
        store.remove(&tally_key);
    }

    Ok(())
}
