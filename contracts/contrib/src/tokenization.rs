#![no_std]

use crate::error::Error;
use crate::types::{
    OwnershipRecord, Proposal, ProposalStatus, TokenDataKey, TokenizedAsset, VoteTally,
};
use soroban_sdk::{Address, Env, String, Vec};

/// Lock tokens — reduces transferable balance and increases locked_balance.
/// Admin or token owner only. Panics if insufficient transferable balance.
pub fn lock_tokens(
    env: &Env,
    asset_id: u64,
    owner: Address,
    amount: i128,
    caller: Address,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();

    // Verify asset is tokenized
    let token_key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&token_key).ok_or(Error::AssetNotTokenized)?;

    // Admin OR token owner can call
    let admin = crate::lib::get_admin(env)?;
    if caller != admin && caller != owner {
        return Err(Error::Unauthorized);
    }

    // Get holder record
    let holder_key = TokenDataKey::TokenHolder(asset_id, owner.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Ensure sufficient transferable balance
    if ownership.balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Move tokens from balance to locked_balance
    ownership.balance -= amount;
    ownership.locked_balance += amount;
    ownership.voting_power = ownership.balance; // locked tokens cannot vote
    ownership.dividend_entitlement = ownership.balance;

    // Update total locked count on asset
    let mut asset_clone = tokenized_asset.clone();
    asset_clone.locked_tokens += amount;
    store.set(&token_key, &asset_clone);

    store.set(&holder_key, &ownership);

    // Emit event
    env.events()
        .publish(("token", "tokens_locked"), (asset_id, owner, amount));

    Ok(())
}

/// Unlock tokens — moves amount from locked_balance back to transferable balance.
/// Admin or token owner only. Panics if insufficient locked balance.
pub fn unlock_tokens(
    env: &Env,
    asset_id: u64,
    owner: Address,
    amount: i128,
    caller: Address,
) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidTokenSupply);
    }

    let store = env.storage().persistent();

    // Verify asset is tokenized
    let token_key = TokenDataKey::TokenizedAsset(asset_id);
    let tokenized_asset: TokenizedAsset = store.get(&token_key).ok_or(Error::AssetNotTokenized)?;

    // Admin OR token owner can call
    let admin = crate::lib::get_admin(env)?;
    if caller != admin && caller != owner {
        return Err(Error::Unauthorized);
    }

    // Get holder record
    let holder_key = TokenDataKey::TokenHolder(asset_id, owner.clone());
    let mut ownership: OwnershipRecord = store.get(&holder_key).ok_or(Error::HolderNotFound)?;

    // Ensure sufficient locked balance
    if ownership.locked_balance < amount {
        return Err(Error::InsufficientLockedTokens);
    }

    // Move tokens from locked_balance to balance
    ownership.locked_balance -= amount;
    ownership.balance += amount;
    ownership.voting_power = ownership.balance;
    ownership.dividend_entitlement = ownership.balance;

    // Update total locked count on asset
    let mut asset_clone = tokenized_asset.clone();
    asset_clone.locked_tokens -= amount;
    store.set(&token_key, &asset_clone);

    store.set(&holder_key, &ownership);

    // Emit event
    env.events()
        .publish(("token", "tokens_unlocked"), (asset_id, owner, amount));

    Ok(())
use soroban_sdk::{Env, Address, panic};

pub fn transfer_tokens(
    env: &Env,
    asset_id: String,
    from: Address,
    to: Address,
    amount: i128,
) {
    // Require auth from `from`
    from.require_auth();

    // Validations
    if amount <= 0 {
        panic!("Transfer amount must be greater than zero");
    }

    // Ensure asset is tokenized
    let tokenized: bool = env.storage().get(&format!("tokenized:{}", asset_id)).unwrap_or(false);
    if !tokenized {
        panic!("Asset not tokenized");
    }

    // Fetch sender record
    let mut from_record: OwnershipRecord = env
        .storage()
        .get(&format!("ownership:{}:{}", asset_id, from))
        .unwrap_or_else(|| panic!("Sender has no ownership record"));

    let transferable = from_record.balance - from_record.locked_balance;
    if transferable < amount {
        panic!("Insufficient transferable balance");
    }

    // Transfer restriction validation (whitelist/blacklist)
    validate_transfer_restrictions(env, &asset_id, &from, &to);

    // Deduct from sender
    from_record.balance -= amount;
    env.storage().set(&format!("ownership:{}:{}", asset_id, from), &from_record);

    // Fetch or create recipient record
    let mut to_record: OwnershipRecord = env
        .storage()
        .get(&format!("ownership:{}:{}", asset_id, to))
        .unwrap_or(OwnershipRecord {
            owner: to.clone(),
            balance: 0,
            locked_balance: 0,
            acquisition_timestamp: env.ledger().timestamp(),
            voting_power: 0,
            unclaimed_dividends: 0,
        });

    to_record.balance += amount;
    env.storage().set(&format!("ownership:{}:{}", asset_id, to), &to_record);

    // Emit event
    env.events().publish(
        (["token", "transferred"],

use soroban_sdk::{Env, Address, panic};

#[derive(Clone)]
pub struct TokenizedAsset {
    pub asset_id: String,
    pub total_supply: i128,
    pub symbol: String,
    pub decimals: u32,
    pub tokenizer: Address,
    pub valuation: i128,
    pub revenue_sharing_enabled: bool,
    pub tokenization_timestamp: u64,
}

#[derive(Clone)]
pub struct TokenMetadata {
    pub name: String,
    pub description: String,
    pub asset_type: String, // "Physical" or "Digital"
    pub ipfs_uri: String,
    pub legal_docs_hash: String,
    pub accredited_investor_required: bool,
}

pub fn ownership_percentage(env: &Env, asset_id: String, owner: Address) -> i128 {
    let record: Option<OwnershipRecord> = env.storage().get(&format!("ownership:{}:{}", asset_id, owner));
    if record.is_none() {
        return 0;
    }
    let rec = record.unwrap();

    let total_supply: i128 = env.storage().get(&format!("tokenized_asset:{}:supply", asset_id)).unwrap_or(0);
    if total_supply == 0 {
        return 0;
    }

    // Basis points: 10000 = 100%
    (rec.balance * 10000) / total_supply
}


use soroban_sdk::{Env, Address};

#[derive(Clone)]
pub struct OwnershipRecord {
    pub owner: Address,
    pub balance: i128,
    pub locked_balance: i128,
    pub acquisition_timestamp: u64,
    pub voting_power: i128,
    pub unclaimed_dividends: i128,
}

pub fn get_ownership_record(env: &Env, asset_id: String, owner: Address) -> Option<OwnershipRecord> {
    env.storage().get(&format!("ownership:{}:{}", asset_id, owner))
}


pub fn tokenize_asset(
    env: &Env,
    asset_id: String,
    symbol: String,
    total_supply: i128,
    valuation: i128,
    metadata: TokenMetadata,
) {
    require_owner(env);

    // Check contract not paused
    require_not_paused(env);

    // Ensure asset exists
    let asset_exists: bool = env.storage().get(&format!("asset:{}", asset_id)).unwrap_or(false);
    if !asset_exists {
        panic!("Asset not found");
    }

    // Ensure not already tokenized
    let already_tokenized: bool = env.storage().get(&format!("tokenized:{}", asset_id)).unwrap_or(false);
    if already_tokenized {
        panic!("Asset already tokenized");
    }

    // Build TokenizedAsset
    let tokenizer = env.invoker();
    let tokenized = TokenizedAsset {
        asset_id: asset_id.clone(),
        total_supply,
        symbol,
        decimals: 18,
        tokenizer: tokenizer.clone(),
        valuation,
        revenue_sharing_enabled: false,
        tokenization_timestamp: env.ledger().timestamp(),
    };

    // Store tokenized asset
    env.storage().set(&format!("tokenized:{}", asset_id), &true);
    env.storage().set(&format!("tokenized_asset:{}", asset_id), &tokenized);

    // Create initial ownership record (100% to tokenizer)
    let ownership = OwnershipRecord {
        owner: tokenizer.clone(),
        percentage: 100,
    };
    env.storage().set(&format!("ownership:{}", asset_id), &ownership);

    // Emit event
    env.events().publish(("tokenize_asset", asset_id.clone()), ());
}

fn require_owner(env: &Env) {
    let caller = env.invoker();
    let owner: Address = env.storage().get("owner").unwrap();
    if caller != owner {
        panic!("Only owner can tokenize asset");
    }
}

pub fn get_all_holders(env: &Env, asset_id: String) -> Vec<Address> {
    let mut holders: Vec<Address> = Vec::new(env);

    // Assuming we store a list of holders under "holders:<asset_id>"
    let stored: Option<Vec<Address>> = env.storage().get(&format!("holders:{}", asset_id));
    if let Some(list) = stored {
        for addr in list.iter() {
            let record: Option<OwnershipRecord> = env.storage().get(&format!("ownership:{}:{}", asset_id, addr));
            if let Some(r) = record {
                if r.balance > 0 {
                    holders.push(addr.clone());
                }
            }
        }
    }
    holders
}


fn validate_transfer_restrictions(env: &Env, asset_id: &String, from: &Address, to: &Address) {
    // Example: check whitelist/blacklist stored in contract
    let blacklist: Option<Vec<Address>> = env.storage().get(&format!("blacklist:{}", asset_id));
    if let Some(list) = blacklist {
        if list.contains(to) {
            panic!("Recipient is blacklisted");
        }
    }

    let whitelist: Option<Vec<Address>> = env.storage().get(&format!("whitelist:{}", asset_id));
    if let Some(list) = whitelist {
        if !list.contains(to) {
            panic!("Recipient not whitelisted");
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Env as TestEnv};

    #[test]
    fn test_insufficient_balance() {
        let env = TestEnv::default();
        let asset_id = "asset1".to_string();
        let from = Address::random(&env);
        let to = Address::random(&env);

        // Setup ownership record with low balance
        let record = OwnershipRecord {
            owner: from.clone(),
            balance: 50,
            locked_balance: 0,
            acquisition_timestamp: env.ledger().timestamp(),
            voting_power: 0,
            unclaimed_dividends: 0,
        };
        env.storage().set(&format!("ownership:{}:{}", asset_id, from), &record);
        env.storage().set(&format!("tokenized:{}", asset_id), &true);

        // Attempt transfer more than balance
        let result = std::panic::catch_unwind(|| {
            transfer_tokens(&env, asset_id.clone(), from.clone(), to.clone(), 100);
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_successful_transfer() {
        let env = TestEnv::default();
        let asset_id = "asset2".to_string();
        let from = Address::random(&env);
        let to = Address::random(&env);

        // Setup ownership record with sufficient balance
        let record = OwnershipRecord {
            owner: from.clone(),
            balance: 200,
            locked_balance: 0,
            acquisition_timestamp: env.ledger().timestamp(),
            voting_power: 0,
            unclaimed_dividends: 0,
        };
        env.storage().set(&format!("ownership:{}:{}", asset_id, from), &record);
        env.storage().set(&format!("tokenized:{}", asset_id), &true);

        // Transfer
        transfer_tokens(&env, asset_id.clone(), from.clone(), to.clone(), 100);

        // Verify balances
        let from_after: OwnershipRecord = env.storage().get(&format!("ownership:{}:{}", asset_id, from)).unwrap();
        let to_after: OwnershipRecord = env.storage().get(&format!("ownership:{}:{}", asset_id, to)).unwrap();

        assert_eq!(from_after.balance, 100);
        assert_eq!(to_after.balance, 100);
    }
}
