use soroban_sdk::{contractimpl, Address, BigInt, Env};

use crate::types::{TokenizedAsset, TokenMetadata, OwnershipRecord};

pub struct TokenizeContract;

#[contractimpl]
impl TokenizeContract {
    /// Tokenize a physical or digital asset
    /// Creates a TokenizedAsset, stores metadata, and assigns full ownership to the tokenizer
    pub fn tokenize(
        env: Env,
        asset_id: u64,
        symbol: String,
        total_supply: BigInt,
        decimals: u32,
        name: String,
        description: String,
        asset_type: crate::types::AssetType,
        tokenizer: Address,
    ) -> TokenizedAsset {
        // Create tokenized asset struct
        let tokenized_asset = TokenizedAsset {
            asset_id,
            total_supply: total_supply.clone(),
            symbol,
            decimals,
            locked_tokens: BigInt::from_i128(&env, 0),
            tokenizer: tokenizer.clone(),
            valuation: total_supply.clone(), // minimal: start valuation = total supply
        };

        // Create token metadata
        let metadata = TokenMetadata {
            name,
            description,
            asset_type,
        };

        // Create ownership record
        let ownership = OwnershipRecord {
            owner: tokenizer.clone(),
            balance: total_supply.clone(),
        };

        // Store the structs on-chain
        env.storage().set((b"asset", asset_id), &tokenized_asset);
        env.storage().set((b"metadata", asset_id), &metadata);
        env.storage().set((b"ownership", asset_id, &tokenizer), &ownership);

        tokenized_asset
    }

    /// Mint additional tokens for an asset
    /// Only the tokenizer / asset owner can mint
    pub fn mint_tokens(
        env: Env,
        asset_id: u64,
        amount: BigInt,
        tokenizer: Address,
    ) -> TokenizedAsset {
        let mut tokenized_asset: TokenizedAsset = env
            .storage()
            .get((b"asset", asset_id))
            .expect("Asset not found")
            .expect("Asset not found");

        // Only tokenizer can mint
        if tokenized_asset.tokenizer != tokenizer {
            panic!("Unauthorized: only tokenizer can mint");
        }

        // Increase total supply
        tokenized_asset.total_supply = &tokenized_asset.total_supply + &amount;

        // Update tokenizer's ownership
        let mut ownership: OwnershipRecord = env
            .storage()
            .get((b"ownership", asset_id, &tokenizer))
            .unwrap()
            .unwrap();

        ownership.balance = &ownership.balance + &amount;

        // Save updates
        env.storage().set((b"asset", asset_id), &tokenized_asset);
        env.storage().set((b"ownership", asset_id, &tokenizer), &ownership);

        tokenized_asset
    }

    /// Burn tokens from an owner's balance
    /// Only the tokenizer / asset owner can burn
    pub fn burn_tokens(
        env: Env,
        asset_id: u64,
        amount: BigInt,
        tokenizer: Address,
    ) -> TokenizedAsset {
        let mut tokenized_asset: TokenizedAsset = env
            .storage()
            .get((b"asset", asset_id))
            .expect("Asset not found")
            .expect("Asset not found");

        // Only tokenizer can burn
        if tokenized_asset.tokenizer != tokenizer {
            panic!("Unauthorized: only tokenizer can burn");
        }

        // Update tokenizer's ownership
        let mut ownership: OwnershipRecord = env
            .storage()
            .get((b"ownership", asset_id, &tokenizer))
            .unwrap()
            .unwrap();

        if ownership.balance < amount {
            panic!("Insufficient balance to burn");
        }

        ownership.balance = &ownership.balance - &amount;
        tokenized_asset.total_supply = &tokenized_asset.total_supply - &amount;

        // Save updates
        env.storage().set((b"asset", asset_id), &tokenized_asset);
        env.storage().set((b"ownership", asset_id, &tokenizer), &ownership);

        tokenized_asset
    }
}
