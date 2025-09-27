use soroban_sdk::{Env, contracttype};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    // Asset exist
    AssetAlreadyExists,
    //Asset not found
    AssetNotFound,
    // Branch already exists
    BranchAlreadyExists,
    // Branch not found
    BranchNotFound,
    // Subscription already exist
    SubscriptionAlreadyExists,
    // User not authorized
    Unauthorized,
    // Payment is not valid
    InvalidPayment
}

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
    use soroban_sdk::{Env};

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