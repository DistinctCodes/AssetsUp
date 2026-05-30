use soroban_sdk::{BytesN, Env};

use crate::{errors::MultiSigError, storage, types::ApprovalRule};

pub fn get_rule(e: &Env, category: &BytesN<32>) -> Result<ApprovalRule, MultiSigError> {
    let rules = storage::rules_map(e);
    rules
        .get(category.clone())
        .ok_or(MultiSigError::RuleNotFound)
}
