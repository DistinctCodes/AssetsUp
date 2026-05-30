#![allow(unused)]
use soroban_sdk::{contracttype, Address, BytesN, Env, Vec};

#[contracttype]
enum DataKey {
    TransferLimits(BytesN<32>), // keyed by asset_id
    BlockedAddresses,
}

#[contracttype]
#[derive(Clone)]
pub struct TransferLimits {
    pub min: i128,
    pub max: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ContractError {
    SelfTransfer      = 1,
    AmountBelowMinimum = 2,
    AmountAboveMaximum = 3,
    RecipientBlocked  = 4,
    Unauthorized      = 5,
    InvalidLimits     = 6,
}

fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
}

/// Admin: set min/max transfer limits for a specific asset.
pub fn set_transfer_limits(
    env: &Env,
    caller: &Address,
    asset_id: BytesN<32>,
    min: i128,
    max: i128,
) -> Result<(), ContractError> {
    require_admin(env, caller);
    if min > max {
        return Err(ContractError::InvalidLimits);
    }
    env.storage()
        .persistent()
        .set(&DataKey::TransferLimits(asset_id), &TransferLimits { min, max });
    Ok(())
}

/// Admin: add an address to the blocked list.
pub fn block_address(env: &Env, caller: &Address, address: Address) {
    require_admin(env, caller);
    let mut blocked: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::BlockedAddresses)
        .unwrap_or_else(|| Vec::new(env));

    if !blocked.contains(&address) {
        blocked.push_back(address);
    }
    env.storage()
        .persistent()
        .set(&DataKey::BlockedAddresses, &blocked);
}

/// Guard: call at the top of every transfer execution path.
///
/// Checks (in order):
///   1. Self-transfer
///   2. Recipient blocked
///   3. Amount below minimum (if limits configured for asset)
///   4. Amount above maximum (if limits configured for asset)
pub fn validate_transfer(
    env: &Env,
    from: &Address,
    to: &Address,
    asset_id: &BytesN<32>,
    amount: i128,
) -> Result<(), ContractError> {
    // 1. Self-transfer
    if from == to {
        return Err(ContractError::SelfTransfer);
    }

    // 2. Blocked recipient
    let blocked: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::BlockedAddresses)
        .unwrap_or_else(|| Vec::new(env));
    if blocked.contains(to) {
        return Err(ContractError::RecipientBlocked);
    }

    // 3 & 4. Amount limits (only enforced if limits are set for this asset)
    if let Some(limits) = env
        .storage()
        .persistent()
        .get::<_, TransferLimits>(&DataKey::TransferLimits(asset_id.clone()))
    {
        if amount < limits.min {
            return Err(ContractError::AmountBelowMinimum);
        }
        if amount > limits.max {
            return Err(ContractError::AmountAboveMaximum);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

    fn env() -> Env { Env::default() }
    fn asset(env: &Env) -> BytesN<32> { BytesN::from_array(env, &[1u8; 32]) }

    fn with_limits(env: &Env, min: i128, max: i128) -> (Address, Address, BytesN<32>) {
        let admin = Address::generate(env);
        let from  = Address::generate(env);
        let to    = Address::generate(env);
        let a     = asset(env);
        env.mock_all_auths();
        set_transfer_limits(env, &admin, a.clone(), min, max).unwrap();
        (from, to, a)
    }

    #[test]
    fn test_happy_path() {
        let env = env();
        let (from, to, a) = with_limits(&env, 100, 10_000);
        assert_eq!(validate_transfer(&env, &from, &to, &a, 500), Ok(()));
    }

    #[test]
    fn test_self_transfer() {
        let env  = env();
        let addr = Address::generate(&env);
        let a    = asset(&env);
        assert_eq!(
            validate_transfer(&env, &addr, &addr, &a, 500),
            Err(ContractError::SelfTransfer)
        );
    }

    #[test]
    fn test_amount_below_minimum() {
        let env = env();
        let (from, to, a) = with_limits(&env, 100, 10_000);
        assert_eq!(
            validate_transfer(&env, &from, &to, &a, 50),
            Err(ContractError::AmountBelowMinimum)
        );
    }

    #[test]
    fn test_amount_above_maximum() {
        let env = env();
        let (from, to, a) = with_limits(&env, 100, 10_000);
        assert_eq!(
            validate_transfer(&env, &from, &to, &a, 20_000),
            Err(ContractError::AmountAboveMaximum)
        );
    }

    #[test]
    fn test_recipient_blocked() {
        let env   = env();
        let admin = Address::generate(&env);
        let from  = Address::generate(&env);
        let to    = Address::generate(&env);
        let a     = asset(&env);
        env.mock_all_auths();
        block_address(&env, &admin, to.clone());
        assert_eq!(
            validate_transfer(&env, &from, &to, &a, 500),
            Err(ContractError::RecipientBlocked)
        );
    }

    #[test]
    fn test_no_limits_set_skips_amount_check() {
        let env  = env();
        let from = Address::generate(&env);
        let to   = Address::generate(&env);
        let a    = asset(&env);
        // No limits registered - any amount passes
        assert_eq!(validate_transfer(&env, &from, &to, &a, 1), Ok(()));
    }

    #[test]
    fn test_invalid_limits_rejected() {
        let env   = env();
        let admin = Address::generate(&env);
        let a     = asset(&env);
        env.mock_all_auths();
        // min > max is invalid
        assert_eq!(
            set_transfer_limits(&env, &admin, a, 1_000, 100),
            Err(ContractError::InvalidLimits)
        );
    }

    #[test]
    fn test_boundary_values() {
        let env = env();
        let (from, to, a) = with_limits(&env, 100, 10_000);
        // Exact min and max should pass
        assert_eq!(validate_transfer(&env, &from, &to, &a, 100),    Ok(()));
        assert_eq!(validate_transfer(&env, &from, &to, &a, 10_000), Ok(()));
    }
}
