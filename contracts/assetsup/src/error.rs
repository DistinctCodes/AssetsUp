use soroban_sdk::{Env, contracterror, panic_with_error};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    AdminNotFound = 2,
    AssetAlreadyExists = 3,
    AssetNotFound = 4,
    BranchAlreadyExists = 5,
    BranchNotFound = 6,
    SubscriptionAlreadyExists = 7,
    Unauthorized = 8,
    InvalidPayment = 9,
    ContractPaused = 10,
    ContractNotInitialized = 11,
    InvalidAssetName = 12,
    InvalidPurchaseValue = 13,
    InvalidMetadataUri = 14,
    InvalidOwnerAddress = 15,
}

pub fn handle_error(env: &Env, error: Error) -> ! {
    panic_with_error!(env, error);
}

#[allow(dead_code)]
pub fn dummy_function(_env: Env, asset_exists: bool) -> Result<(), Error> {
    if asset_exists {
        Err(Error::AssetAlreadyExists)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_dummy_function_asset_exists() {
        let env = Env::default();
        let result = dummy_function(env.clone(), true);
        assert_eq!(result, Err(Error::AssetAlreadyExists));
    }

    #[test]
    fn test_dummy_function_asset_not_exists() {
        let env = Env::default();
        let result = dummy_function(env.clone(), false);
        assert_eq!(result, Ok(()));
    }
}
