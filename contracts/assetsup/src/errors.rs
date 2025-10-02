use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    AssetAlreadyExists = 1,
    AssetNotFound = 2,
    Unauthorized = 3,
}
