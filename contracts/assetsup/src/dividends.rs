use soroban_sdk::{contractimpl, Address, BigInt, Env};

use crate::types::{OwnershipRecord, TokenizedAsset};

pub struct DividendContract;

#[contractimpl]
impl DividendContract {
    /// Distribute dividends proportionally to all holders
    /// amount: total dividend to distribute
    pub fn distribute_dividend(env: Env, asset_id: u64, amount: BigInt) {
        // Get tokenized asset
        let tokenized_asset: TokenizedAsset = env
            .storage()
            .get((b"asset", asset_id))
            .expect("Asset not found")
            .unwrap();

        // Iterate all ownership records (minimal V1: assume keys stored separately)
        // This assumes we have a helper to enumerate owners; otherwise we can store owners list
        let owners: Vec<Address> = env
            .storage()
            .get((b"owners_list", asset_id))
            .unwrap_or(Some(Vec::new()))
            .unwrap();

        for owner in owners.iter() {
            let mut ownership: OwnershipRecord = env
                .storage()
                .get((b"ownership", asset_id, owner))
                .unwrap()
                .unwrap();

            // proportion = owner balance / total supply
            let proportion = &ownership.balance * &amount / &tokenized_asset.total_supply;

            // Update unclaimed dividend
            ownership.unclaimed_dividends =
                &ownership.unclaimed_dividends + &proportion;

            env.storage()
                .set((b"ownership", asset_id, owner), &ownership);
        }
    }

    /// Cast vote on an asset proposal
    /// proposal_id is a u64 identifier for the proposal
    pub fn cast_vote(env: Env, asset_id: u64, proposal_id: u64, voter: Address) {
        // Get ownership
        let ownership: OwnershipRecord = env
            .storage()
            .get((b"ownership", asset_id, &voter))
            .unwrap()
            .unwrap();

        // Minimal threshold: voter must have >0 tokens
        if ownership.balance <= BigInt::from_i128(&env, 0) {
            panic!("Not enough tokens to vote");
        }

        // Check if voter already voted
        let mut votes: Vec<Address> = env
            .storage()
            .get((b"votes", asset_id, proposal_id))
            .unwrap_or(Some(Vec::new()))
            .unwrap();

        if votes.contains(&voter) {
            panic!("Voter already voted");
        }

        votes.push(voter.clone());
        env.storage().set((b"votes", asset_id, proposal_id), &votes);

        // Store voting power weighted by token balance
        let mut tally: BigInt = env
            .storage()
            .get((b"vote_tally", asset_id, proposal_id))
            .unwrap_or(Some(BigInt::from_i128(&env, 0)))
            .unwrap();

        tally = tally + &ownership.balance;
        env.storage()
            .set((b"vote_tally", asset_id, proposal_id), &tally);
    }
}
