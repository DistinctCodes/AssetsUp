//! Payload assertions for every `assetsup` event (#1655).
//!
//! `events.rs` is the contract the indexer and the backend depend on: topic
//! order and payload shape. A refactor can silently change either, so each
//! event helper gets one test here that publishes it and pins
//!
//! - topic 0 (the event name),
//! - the `#[topic]` fields, in order,
//! - the data fields: their names, their values, and that there are no others.
//!
//! The helpers are exercised directly, inside a contract frame, rather than
//! through the entrypoints that call them: that keeps each case independent of
//! entrypoint set-up and makes the table below complete. Whether a given
//! entrypoint emits its event at all is covered in `events.rs` and the
//! per-feature test files.
//!
//! The ledger timestamp is fixed so the `timestamp` fields can be asserted
//! exactly. Event data is a map of the non-topic fields (the `contractevent`
//! default).
#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Events as _, Ledger as _};
use soroban_sdk::{Address, BytesN, Env, Map, String, Symbol, TryFromVal, TryIntoVal, Val, Vec};

use crate::events;
use crate::AssetUpContract;

const TS: u64 = 1_700_000_000;

/// The single event published by one helper call, decoded for assertions.
struct Emitted {
    env: Env,
    topics: Vec<Val>,
    data: Val,
}

impl Emitted {
    /// Topic 0 names the event, followed by `extra_topics` indexed fields, and
    /// the data map holds exactly `data_fields` entries.
    fn assert_shape(&self, name: &str, extra_topics: u32, data_fields: u32) {
        let actual: Symbol = self
            .topics
            .get(0)
            .expect("event must have a name topic")
            .try_into_val(&self.env)
            .expect("topic 0 must decode as a Symbol");
        assert_eq!(actual, Symbol::new(&self.env, name), "event name");
        assert_eq!(self.topics.len(), 1 + extra_topics, "number of topics");
        assert_eq!(self.map().len(), data_fields, "number of data fields");
    }

    fn topic<T: TryFromVal<Env, Val>>(&self, index: u32) -> T {
        self.topics
            .get(index)
            .expect("missing topic")
            .try_into_val(&self.env)
            .ok()
            .expect("topic has an unexpected type")
    }

    fn map(&self) -> Map<Symbol, Val> {
        self.data
            .try_into_val(&self.env)
            .expect("event data must be a map of the non-topic fields")
    }

    fn field<T: TryFromVal<Env, Val>>(&self, key: &str) -> T {
        self.map()
            .get(Symbol::new(&self.env, key))
            .unwrap_or_else(|| panic!("event data has no field `{key}`"))
            .try_into_val(&self.env)
            .ok()
            .unwrap_or_else(|| panic!("event field `{key}` has an unexpected type"))
    }
}

fn setup() -> (Env, Address) {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = TS);
    let contract = env.register(AssetUpContract, ());
    (env, contract)
}

/// Runs `publish` inside the contract's frame and returns the one event it
/// emitted, failing if it emitted none or several.
fn emit(env: &Env, contract: &Address, publish: impl FnOnce()) -> Emitted {
    env.as_contract(contract, publish);
    let all = env.events().all();
    assert_eq!(all.len(), 1, "expected exactly one event");
    let (_contract, topics, data) = all.last().unwrap();
    Emitted {
        env: env.clone(),
        topics,
        data,
    }
}

fn id32(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

#[test]
fn contract_initialized_payload() {
    let (env, contract) = setup();
    let admin = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::contract_initialized(&env, &admin)
    });
    e.assert_shape("contract_initialized", 1, 1);
    assert_eq!(e.topic::<Address>(1), admin);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_registered_payload() {
    let (env, contract) = setup();
    let (id, owner) = (id32(&env, 1), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::asset_registered(&env, &id, &owner)
    });
    e.assert_shape("asset_registered", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), id);
    assert_eq!(e.field::<Address>("owner"), owner);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_updated_payload() {
    let (env, contract) = setup();
    let (id, caller) = (id32(&env, 2), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::asset_updated(&env, &id, &caller)
    });
    e.assert_shape("asset_updated", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), id);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_transferred_payload() {
    let (env, contract) = setup();
    let id = id32(&env, 3);
    let (old_owner, new_owner) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::asset_transferred(&env, &id, &old_owner, &new_owner)
    });
    e.assert_shape("asset_transferred", 1, 3);
    assert_eq!(e.topic::<BytesN<32>>(1), id);
    assert_eq!(e.field::<Address>("old_owner"), old_owner);
    assert_eq!(e.field::<Address>("new_owner"), new_owner);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_retired_payload() {
    let (env, contract) = setup();
    let (id, caller) = (id32(&env, 4), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::asset_retired(&env, &id, &caller)
    });
    e.assert_shape("asset_retired", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), id);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn branch_registered_payload() {
    let (env, contract) = setup();
    let (branch, admin) = (id32(&env, 5), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::branch_registered(&env, &branch, &admin)
    });
    e.assert_shape("branch_registered", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), branch);
    assert_eq!(e.field::<Address>("admin"), admin);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_assigned_to_branch_payload() {
    let (env, contract) = setup();
    let (branch, asset, caller) = (id32(&env, 6), id32(&env, 7), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::asset_assigned_to_branch(&env, &branch, &asset, &caller)
    });
    // Two indexed topics: the branch first, then the asset.
    e.assert_shape("asset_assigned_to_branch", 2, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), branch);
    assert_eq!(e.topic::<BytesN<32>>(2), asset);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn admin_proposed_payload() {
    let (env, contract) = setup();
    let (current, proposed) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::admin_proposed(&env, &current, &proposed)
    });
    // The nominee is the indexed topic; the current admin travels in the data.
    e.assert_shape("admin_proposed", 1, 2);
    assert_eq!(e.topic::<Address>(1), proposed);
    assert_eq!(e.field::<Address>("current_admin"), current);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn admin_proposal_cancelled_payload() {
    let (env, contract) = setup();
    let (current, proposed) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::admin_proposal_cancelled(&env, &current, &proposed)
    });
    // The nominee is the indexed topic; the current admin travels in the data.
    e.assert_shape("admin_proposal_cancelled", 1, 2);
    assert_eq!(e.topic::<Address>(1), proposed);
    assert_eq!(e.field::<Address>("current_admin"), current);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn admin_changed_payload() {
    let (env, contract) = setup();
    let (old_admin, new_admin) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::admin_changed(&env, &old_admin, &new_admin)
    });
    e.assert_shape("admin_changed", 1, 2);
    assert_eq!(e.topic::<Address>(1), new_admin);
    assert_eq!(e.field::<Address>("old_admin"), old_admin);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn registrar_added_payload() {
    let (env, contract) = setup();
    let registrar = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::registrar_added(&env, &registrar)
    });
    e.assert_shape("registrar_added", 1, 1);
    assert_eq!(e.topic::<Address>(1), registrar);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn registrar_removed_payload() {
    let (env, contract) = setup();
    let registrar = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::registrar_removed(&env, &registrar)
    });
    e.assert_shape("registrar_removed", 1, 1);
    assert_eq!(e.topic::<Address>(1), registrar);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn contract_paused_payload() {
    let (env, contract) = setup();
    let admin = Address::generate(&env);
    let e = emit(&env, &contract, || events::contract_paused(&env, &admin));
    e.assert_shape("contract_paused", 1, 1);
    assert_eq!(e.topic::<Address>(1), admin);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn contract_unpaused_payload() {
    let (env, contract) = setup();
    let admin = Address::generate(&env);
    let e = emit(&env, &contract, || events::contract_unpaused(&env, &admin));
    e.assert_shape("contract_unpaused", 1, 1);
    assert_eq!(e.topic::<Address>(1), admin);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn asset_tokenized_payload() {
    let (env, contract) = setup();
    let tokenizer = Address::generate(&env);
    let symbol = String::from_str(&env, "WIDGET");
    let e = emit(&env, &contract, || {
        events::asset_tokenized(&env, 11, 1_000, symbol.clone(), 7, tokenizer.clone())
    });
    e.assert_shape("asset_tokenized", 1, 4);
    assert_eq!(e.topic::<u64>(1), 11);
    assert_eq!(e.field::<i128>("total_supply"), 1_000);
    assert_eq!(e.field::<String>("symbol"), symbol);
    assert_eq!(e.field::<u32>("decimals"), 7);
    assert_eq!(e.field::<Address>("tokenizer"), tokenizer);
}

#[test]
fn tokens_minted_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || {
        events::tokens_minted(&env, 12, 250, 1_250)
    });
    e.assert_shape("tokens_minted", 1, 2);
    assert_eq!(e.topic::<u64>(1), 12);
    assert_eq!(e.field::<i128>("amount"), 250);
    assert_eq!(e.field::<i128>("total_supply"), 1_250);
}

#[test]
fn tokens_burned_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || {
        events::tokens_burned(&env, 12, 250, 1_250)
    });
    e.assert_shape("tokens_burned", 1, 2);
    assert_eq!(e.topic::<u64>(1), 12);
    assert_eq!(e.field::<i128>("amount"), 250);
    assert_eq!(e.field::<i128>("total_supply"), 1_250);
}

#[test]
fn tokens_transferred_payload() {
    let (env, contract) = setup();
    let (from, to) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::tokens_transferred(&env, 13, &from, &to, 75)
    });
    e.assert_shape("tokens_transferred", 1, 3);
    assert_eq!(e.topic::<u64>(1), 13);
    assert_eq!(e.field::<Address>("from"), from);
    assert_eq!(e.field::<Address>("to"), to);
    assert_eq!(e.field::<i128>("amount"), 75);
}

#[test]
fn tokens_locked_payload() {
    let (env, contract) = setup();
    let holder = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::tokens_locked(&env, 14, &holder, TS + 3_600)
    });
    e.assert_shape("tokens_locked", 1, 2);
    assert_eq!(e.topic::<u64>(1), 14);
    assert_eq!(e.field::<Address>("holder"), holder);
    assert_eq!(e.field::<u64>("until_timestamp"), TS + 3_600);
}

#[test]
fn tokens_unlocked_payload() {
    let (env, contract) = setup();
    let holder = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::tokens_unlocked(&env, 15, &holder)
    });
    e.assert_shape("tokens_unlocked", 1, 2);
    assert_eq!(e.topic::<u64>(1), 15);
    assert_eq!(e.field::<Address>("holder"), holder);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn valuation_updated_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || {
        events::valuation_updated(&env, 16, 9_999)
    });
    e.assert_shape("valuation_updated", 1, 1);
    assert_eq!(e.topic::<u64>(1), 16);
    assert_eq!(e.field::<i128>("new_valuation"), 9_999);
}

#[test]
fn asset_detokenized_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || {
        events::asset_detokenized(&env, 17, 4, 500)
    });
    e.assert_shape("asset_detokenized", 1, 2);
    assert_eq!(e.topic::<u64>(1), 17);
    assert_eq!(e.field::<u64>("proposal_id"), 4);
    assert_eq!(e.field::<i128>("total_supply"), 500);
}

#[test]
fn dividend_distributed_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || {
        events::dividend_distributed(&env, 18, 3_000, 6)
    });
    e.assert_shape("dividend_distributed", 1, 2);
    assert_eq!(e.topic::<u64>(1), 18);
    assert_eq!(e.field::<i128>("total_amount"), 3_000);
    assert_eq!(e.field::<u32>("holder_count"), 6);
}

#[test]
fn dividend_claimed_payload() {
    let (env, contract) = setup();
    let holder = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::dividend_claimed(&env, 19, &holder, 120)
    });
    e.assert_shape("dividend_claimed", 1, 2);
    assert_eq!(e.topic::<u64>(1), 19);
    assert_eq!(e.field::<Address>("holder"), holder);
    assert_eq!(e.field::<i128>("amount"), 120);
}

#[test]
fn vote_cast_payload() {
    let (env, contract) = setup();
    let voter = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::vote_cast(&env, 20, 8, &voter, 40)
    });
    e.assert_shape("vote_cast", 1, 3);
    assert_eq!(e.topic::<u64>(1), 20);
    assert_eq!(e.field::<u64>("proposal_id"), 8);
    assert_eq!(e.field::<Address>("voter"), voter);
    assert_eq!(e.field::<i128>("voting_power"), 40);
}

#[test]
fn restriction_set_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || events::restriction_set(&env, 21, true));
    e.assert_shape("restriction_set", 1, 1);
    assert_eq!(e.topic::<u64>(1), 21);
    assert!(e.field::<bool>("require_accredited"));
}

#[test]
fn whitelist_added_payload() {
    let (env, contract) = setup();
    let address = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::whitelist_added(&env, 22, &address)
    });
    e.assert_shape("whitelist_added", 1, 1);
    assert_eq!(e.topic::<u64>(1), 22);
    assert_eq!(e.field::<Address>("address"), address);
}

#[test]
fn whitelist_removed_payload() {
    let (env, contract) = setup();
    let address = Address::generate(&env);
    let e = emit(&env, &contract, || {
        events::whitelist_removed(&env, 22, &address)
    });
    e.assert_shape("whitelist_removed", 1, 1);
    assert_eq!(e.topic::<u64>(1), 22);
    assert_eq!(e.field::<Address>("address"), address);
}

#[test]
fn lease_created_payload() {
    let (env, contract) = setup();
    let (lease, asset) = (id32(&env, 30), id32(&env, 31));
    let (lessor, lessee) = (Address::generate(&env), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::lease_created(&env, &lease, &asset, &lessor, &lessee)
    });
    e.assert_shape("lease_created", 1, 4);
    assert_eq!(e.topic::<BytesN<32>>(1), lease);
    assert_eq!(e.field::<BytesN<32>>("asset_id"), asset);
    assert_eq!(e.field::<Address>("lessor"), lessor);
    assert_eq!(e.field::<Address>("lessee"), lessee);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn lease_returned_payload() {
    let (env, contract) = setup();
    let (lease, caller) = (id32(&env, 32), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::lease_returned(&env, &lease, &caller)
    });
    e.assert_shape("lease_returned", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), lease);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn lease_cancelled_payload() {
    let (env, contract) = setup();
    let (lease, caller) = (id32(&env, 32), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::lease_cancelled(&env, &lease, &caller)
    });
    e.assert_shape("lease_cancelled", 1, 2);
    assert_eq!(e.topic::<BytesN<32>>(1), lease);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn lease_expired_payload() {
    let (env, contract) = setup();
    let lease = id32(&env, 33);
    let e = emit(&env, &contract, || events::lease_expired(&env, &lease));
    e.assert_shape("lease_expired", 1, 1);
    assert_eq!(e.topic::<BytesN<32>>(1), lease);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn lease_terminated_early_payload() {
    let (env, contract) = setup();
    let (lease, caller) = (id32(&env, 34), Address::generate(&env));
    let e = emit(&env, &contract, || {
        events::lease_terminated_early(&env, &lease, &caller, TS - 60)
    });
    e.assert_shape("lease_terminated_early", 1, 3);
    assert_eq!(e.topic::<BytesN<32>>(1), lease);
    assert_eq!(e.field::<Address>("caller"), caller);
    assert_eq!(e.field::<u64>("end_timestamp"), TS - 60);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn insurance_policy_expiry_reminder_payload() {
    let (env, contract) = setup();
    let (policy, asset) = (id32(&env, 40), id32(&env, 41));
    let e = emit(&env, &contract, || {
        events::insurance_policy_expiry_reminder(&env, &policy, &asset, TS + 86_400)
    });
    e.assert_shape("insurance_policy_expiry_reminder", 1, 3);
    assert_eq!(e.topic::<BytesN<32>>(1), policy);
    assert_eq!(e.field::<BytesN<32>>("asset_id"), asset);
    assert_eq!(e.field::<u64>("end_date"), TS + 86_400);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn contract_upgraded_payload() {
    let (env, contract) = setup();
    let (admin, hash) = (Address::generate(&env), id32(&env, 50));
    let e = emit(&env, &contract, || {
        events::contract_upgraded(&env, &admin, &hash, 3)
    });
    e.assert_shape("contract_upgraded", 1, 3);
    assert_eq!(e.topic::<Address>(1), admin);
    assert_eq!(e.field::<BytesN<32>>("new_wasm_hash"), hash);
    assert_eq!(e.field::<u32>("version"), 3);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}

#[test]
fn contract_migrated_payload() {
    let (env, contract) = setup();
    let e = emit(&env, &contract, || events::contract_migrated(&env, 2, 3));
    // The only event with no indexed field: just the name topic.
    e.assert_shape("contract_migrated", 0, 3);
    assert_eq!(e.field::<u32>("from_version"), 2);
    assert_eq!(e.field::<u32>("to_version"), 3);
    assert_eq!(e.field::<u64>("timestamp"), TS);
}
