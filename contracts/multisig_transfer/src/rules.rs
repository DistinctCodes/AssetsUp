use soroban_sdk::{BytesN, Env};
use opsce::transfer_rules::validate_transfer;

use crate::{errors::MultiSigError, storage, types::ApprovalRule};

validate_transfer(&env, &from, &to, &asset_id, amount)?;
pub fn get_rule(e: &Env, category: &BytesN<32>) -> Result<ApprovalRule, MultiSigError> {
    let rules = storage::rules_map(e);
    rules
        .get(category.clone())
        .ok_or(MultiSigError::RuleNotFound)
}
