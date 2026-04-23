use soroban_sdk::Env;

pub struct ContractMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
}

pub fn get_contract_metadata(_env: &Env) -> ContractMetadata {
    ContractMetadata {
        name: "Community Contract".to_string(),
        version: "1.0.0".to_string(),
        description: "Handles community features with pause/unpause and metadata query.".to_string(),
    }
}
