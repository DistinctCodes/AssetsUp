use crate::{DataKey, Error, AssetUpContract};
use soroban_sdk::{contractimpl, symbol_short, Address, Env};

impl AssetUpContract {
    pub fn propose_admin_transfer(env: Env, new_admin: Address) -> Result<(), Error> {
        let current_admin = Self::get_admin(env.clone())?;
        current_admin.require_auth();

        let zero_address = Address::from_str(
            &env,
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        );
        if new_admin == zero_address {
            return Err(Error::InvalidOwnerAddress);
        }

        env.storage()
            .persistent()
            .set(&DataKey::PendingAdmin, &new_admin);

        env.events().publish(
            (symbol_short!("admin_transfer_proposed"),),
            (current_admin, new_admin, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn accept_admin_transfer(env: Env) -> Result<(), Error> {
        let pending_admin = env
            .storage()
            .persistent()
            .get::<_, Address>(&DataKey::PendingAdmin);

        let pending_admin = match pending_admin {
            Some(admin) => admin,
            None => return Err(Error::Unauthorized),
        };

        pending_admin.require_auth();

        let old_admin = Self::get_admin(env.clone())?;
        env.storage().persistent().set(&DataKey::Admin, &pending_admin);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(old_admin.clone()), &false);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorizedRegistrar(pending_admin.clone()), &true);
        env.storage().persistent().remove(&DataKey::PendingAdmin);

        env.events().publish(
            (symbol_short!("admin_transfer_completed"),),
            (old_admin, pending_admin, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn cancel_admin_transfer(env: Env) -> Result<(), Error> {
        let current_admin = Self::get_admin(env.clone())?;
        current_admin.require_auth();

        env.storage().persistent().remove(&DataKey::PendingAdmin);
        Ok(())
    }

    pub fn get_pending_admin(env: Env) -> Result<Option<Address>, Error> {
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdmin))
    }
}
