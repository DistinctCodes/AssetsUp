//! TTL coverage for the pause flag ([SC-78]).
//!
//! `DataKey::Paused` was extended by `initialize` and `is_paused` but not by
//! `pause_contract` or `unpause_contract`, so pausing wrote the flag at the
//! network's `min_persistent_entry_ttl` and then left it to decay.
//!
//! That is a sharper problem here than for any other key. A paused contract is,
//! by definition, one nobody is calling: the flag is precisely the entry that
//! receives no traffic and no renewal. An archived key reads back as absent, and
//! `is_paused` treats absent as not paused, so the contract silently resumes
//! while the operator still believes it is frozen. A pause that expires on its
//! own is worse than having no pause at all, because it is false assurance.
//!
//! Written against archival behaviour rather than raw TTL numbers, matching
//! `tests/ttl.rs`: a short default entry lifetime is set so a lapse is reachable
//! inside a test, and the property asserted is "still reports paused".

use soroban_sdk::testutils::{Address as _, Ledger as _, LedgerInfo};
use soroban_sdk::{Address, Env};

use super::helpers::{create_env, initialize_contract};
use crate::ttl::{LEDGERS_PER_DAY, PERSISTENT_EXTEND_TO};
use crate::AssetUpContractClient;

/// Sets a ledger with a short default entry lifetime so archival is reachable
/// within a test, then advances by `ledgers`.
fn advance_ledgers(env: &Env, ledgers: u32) {
    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.sequence_number += ledgers;
        li.timestamp += (ledgers as u64) * 5;
    });
}

fn setup(env: &Env) -> (AssetUpContractClient<'_>, Address) {
    // A generous max entry TTL so the contract's own extension is what keeps the
    // flag alive, rather than the harness silently capping it.
    env.ledger().with_mut(|li: &mut LedgerInfo| {
        li.sequence_number = 1;
        li.min_persistent_entry_ttl = 100;
        li.min_temp_entry_ttl = 16;
        li.max_entry_ttl = PERSISTENT_EXTEND_TO + LEDGERS_PER_DAY;
    });

    let admin = Address::generate(env);
    let client = initialize_contract(env, &admin);
    env.mock_all_auths();
    (client, admin)
}

#[test]
fn a_pause_survives_far_past_the_default_entry_lifetime() {
    // The regression test. Without the write-side `extend_ttl`, the flag is
    // written with a 100-ledger lifetime and archival takes it long before the
    // 60 days advanced here, so `is_paused` would report false.
    let env = create_env();
    let (client, _admin) = setup(&env);

    client.pause_contract();
    advance_ledgers(&env, 60 * LEDGERS_PER_DAY);

    assert!(
        client.is_paused(),
        "the pause flag was archived and the contract silently resumed"
    );
}

#[test]
fn a_pause_survives_repeated_long_gaps() {
    // 45 days is past the 100-ledger default but inside the 90-day window, so
    // each hop is renewed by the previous read. Cumulatively this is 135 days:
    // more than a quarter, and more than the contract's whole extension window.
    // Only renew-on-read keeps it frozen to the end.
    let env = create_env();
    let (client, _admin) = setup(&env);

    client.pause_contract();

    for _ in 0..3 {
        advance_ledgers(&env, 45 * LEDGERS_PER_DAY);
        assert!(
            client.is_paused(),
            "a pause inspected periodically must not lapse"
        );
    }
}

#[test]
fn a_pause_holds_for_the_whole_window_with_no_traffic_at_all() {
    // States the actual limit rather than papering over it. The write-side
    // extension guarantees the flag for `PERSISTENT_EXTEND_TO` -- 90 days -- with
    // no reads at all, which is the entire window an operator gets for free
    // before something has to touch the contract. Advancing just inside it and
    // asserting the pause still holds keeps the guarantee honest and pinned;
    // advancing past it is expected to lapse, and that is a property of the
    // policy, not a bug.
    let env = create_env();
    let (client, _admin) = setup(&env);

    client.pause_contract();
    advance_ledgers(&env, 80 * LEDGERS_PER_DAY);

    assert!(
        client.is_paused(),
        "the pause must hold for its full window even with zero traffic"
    );
}

#[test]
fn pausing_again_after_a_long_gap_re_arms_the_flag() {
    // `unpause_contract` also writes the key, so it decays from scratch unless
    // the write renews it. Check the *second* pause, which is the one at risk.
    let env = create_env();
    let (client, _admin) = setup(&env);

    client.pause_contract();
    advance_ledgers(&env, 45 * LEDGERS_PER_DAY);
    client.unpause_contract();
    advance_ledgers(&env, 45 * LEDGERS_PER_DAY);
    client.pause_contract();

    advance_ledgers(&env, 60 * LEDGERS_PER_DAY);
    assert!(client.is_paused());
}

#[test]
fn rotating_the_admin_does_not_clear_the_pause() {
    // Pairs with `tests/pause.rs`: the admin-rotation exemption is deliberate,
    // and inheriting a still-paused contract is part of the design. Adding the
    // TTL fix must not change that behaviour.
    let env = create_env();
    let (client, _admin) = setup(&env);

    client.pause_contract();
    let successor = Address::generate(&env);
    client.propose_admin(&successor);
    client.accept_admin();

    assert_eq!(client.get_admin(), successor);
    assert!(client.is_paused(), "the pause must survive the rotation");
}