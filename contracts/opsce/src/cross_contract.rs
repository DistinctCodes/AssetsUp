use soroban_sdk::{contractclient, Address, RawVal};

#[contractclient]
pub struct AssetsUpClient;

impl AssetsUpClient {
    pub fn transfer_tokens(
        &self,
        asset_id: u64,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), RawVal>;
}
