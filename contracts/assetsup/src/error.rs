use soroban_sdk::{Env, contracterror, panic_with_error};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    AdminNotFound = 2,
    // Asset exist
    AssetAlreadyExists = 3,
    //Asset not found
    AssetNotFound = 4,
    // Branch already exists
    BranchAlreadyExists = 5,
    // Branch not found
    BranchNotFound = 6,
    // Subscription already exist
    SubscriptionAlreadyExists = 7,
    // User not authorized
    Unauthorized = 8,
    // Payment is not valid
    InvalidPayment = 9,
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
