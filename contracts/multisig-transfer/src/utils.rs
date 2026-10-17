use soroban_sdk::{Address, Env};

use crate::{errors::MultiSigError, storage};

pub fn require_init(e: &Env) -> Result<(Address, Address), MultiSigError> {
    let admin = storage::get_admin(e).ok_or(MultiSigError::NotInitialized)?;
    let registry = storage::get_registry(e).ok_or(MultiSigError::NotInitialized)?;
    Ok((admin, registry))
}

pub fn require_admin(e: &Env, caller: &Address) -> Result<(), MultiSigError> {
    let admin = storage::get_admin(e).ok_or(MultiSigError::NotInitialized)?;
    if &admin != caller {
        return Err(MultiSigError::Unauthorized);
    }
    Ok(())
}

pub fn now(e: &Env) -> u64 {
    e.ledger().timestamp()
}

/// Unit tests for the helpers above, run in isolation.
///
/// Everything else exercises these only indirectly, through contract
/// entrypoints and the cross-contract integration tests, where a failure in
/// one helper is hard to tell apart from a failure elsewhere in the flow. Here
/// storage is seeded directly and each helper is called on its own, inside the
/// contract's context so that its storage reads resolve.
#[cfg(test)]
mod tests {
    use super::*;
    use crate::MultiSigTransferContract;
    use soroban_sdk::testutils::{Address as _, Ledger as _};

    /// A fresh environment with the contract registered but not initialized.
    fn setup() -> (Env, Address) {
        let env = Env::default();
        let contract_id = env.register(MultiSigTransferContract, ());
        (env, contract_id)
    }

    // ------------------------------------------------------------------
    // require_init
    // ------------------------------------------------------------------

    #[test]
    fn require_init_fails_before_initialization() {
        let (env, id) = setup();

        let result = env.as_contract(&id, || require_init(&env));

        assert_eq!(result, Err(MultiSigError::NotInitialized));
    }

    #[test]
    fn require_init_fails_when_only_the_admin_is_stored() {
        let (env, id) = setup();
        let admin = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_admin(&env, &admin);
            require_init(&env)
        });

        assert_eq!(result, Err(MultiSigError::NotInitialized));
    }

    #[test]
    fn require_init_fails_when_only_the_registry_is_stored() {
        let (env, id) = setup();
        let registry = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_registry(&env, &registry);
            require_init(&env)
        });

        assert_eq!(result, Err(MultiSigError::NotInitialized));
    }

    #[test]
    fn require_init_returns_the_admin_then_the_registry() {
        let (env, id) = setup();
        let admin = Address::generate(&env);
        let registry = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_admin(&env, &admin);
            storage::set_registry(&env, &registry);
            require_init(&env)
        });

        // Callers destructure this tuple positionally, so the order matters.
        assert_eq!(result, Ok((admin, registry)));
    }

    // ------------------------------------------------------------------
    // require_admin
    // ------------------------------------------------------------------

    #[test]
    fn require_admin_fails_before_initialization() {
        let (env, id) = setup();
        let caller = Address::generate(&env);

        let result = env.as_contract(&id, || require_admin(&env, &caller));

        // No admin exists yet, so this is NotInitialized, not Unauthorized.
        assert_eq!(result, Err(MultiSigError::NotInitialized));
    }

    #[test]
    fn require_admin_accepts_the_stored_admin() {
        let (env, id) = setup();
        let admin = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_admin(&env, &admin);
            require_admin(&env, &admin)
        });

        assert_eq!(result, Ok(()));
    }

    #[test]
    fn require_admin_rejects_any_other_address() {
        let (env, id) = setup();
        let admin = Address::generate(&env);
        let other = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_admin(&env, &admin);
            require_admin(&env, &other)
        });

        assert_eq!(result, Err(MultiSigError::Unauthorized));
    }

    #[test]
    fn require_admin_only_compares_addresses_and_does_not_authenticate() {
        // No auths are mocked or provided anywhere in this test. The helper
        // still passes for the admin's address, which is why every entrypoint
        // must call `caller.require_auth()` before it.
        let (env, id) = setup();
        let admin = Address::generate(&env);

        let result = env.as_contract(&id, || {
            storage::set_admin(&env, &admin);
            require_admin(&env, &admin)
        });

        assert_eq!(result, Ok(()));
    }

    // ------------------------------------------------------------------
    // now
    // ------------------------------------------------------------------

    #[test]
    fn now_reports_the_ledger_timestamp() {
        let env = Env::default();

        env.ledger().set_timestamp(1_000);
        assert_eq!(now(&env), 1_000);

        env.ledger().set_timestamp(5_000_000);
        assert_eq!(now(&env), 5_000_000);
    }
}
