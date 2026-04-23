use soroban_sdk::{Env, panic};

#[derive(Clone)]
pub enum DataKey {
    Paused,
    // other keys...
}

pub fn pause(env: &Env) {
    require_admin(env);
    env.storage().set(&DataKey::Paused, &true);
    env.events().publish(("pause",), ());
}

pub fn unpause(env: &Env) {
    require_admin(env);
    env.storage().set(&DataKey::Paused, &false);
    env.events().publish(("unpause",), ());
}

pub fn is_paused(env: &Env) -> bool {
    env.storage().get(&DataKey::Paused).unwrap_or(false)
}

pub fn require_not_paused(env: &Env) {
    if is_paused(env) {
        panic!("Contract is paused");
    }
}

// Helper: ensure caller is admin
fn require_admin(env: &Env) {
    let caller = env.invoker();
    let admin: Address = env.storage().get(&DataKey::Admin).unwrap();
    if caller != admin {
        panic!("Only admin can call this function");
    }
}
