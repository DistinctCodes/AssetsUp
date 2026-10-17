# Pause

What `pause_contract` actually stops, and the entrypoints it deliberately does
not.

`contracts/EVENTS.md` covers what is emitted and `AUTHORIZATION.md` covers who
each entrypoint authenticates. Neither says which entrypoints an emergency pause
freezes, which is the question an operator has when deciding whether it is safe
to pause — so it is written down here.

`src/tests/pause.rs` holds the executable version of this document:
`PAUSE_EXEMPT` is the list below, and `every_mutating_entrypoint_is_covered`
parses `lib.rs` to prove nothing mutating has escaped it. If the two ever
disagree, the test is right and this file is stale.

## Summary

`pause_contract` sets one persistent flag, `DataKey::Paused`. Every
state-changing entrypoint calls `require_not_paused` and returns
`Error::ContractPaused` while it is set. Read-only entrypoints keep answering:
a pause that also blocks reads is an outage, not a safety control.

## Reachable while paused

Everything in `PAUSE_EXEMPT`, each with its reason:

| Entrypoint | Why it stays reachable |
|---|---|
| `initialize` | Nothing exists to pause yet. |
| `pause_contract` | The control itself; must not fail because it is already paused. |
| `unpause_contract` | The control itself; the only way out. |
| `propose_admin` | An incident may be *caused* by a compromised admin key. |
| `accept_admin` | Completes the rotation above. |
| `cancel_admin_proposal` | Withdraws the rotation above. |
| `claim_dividends` | User exit path. Freezing it would trap funds users have already earned. |
| `upgrade` | An upgrade is how you fix the incident that caused the pause. |
| `migrate` | Must run after `upgrade` to bring storage up to date. |
| `storage_version` | Read-only: returns the current storage layout version. |

The admin-rotation exemption deserves a note, because it looks like a hole and
is not. The obvious objection is that a compromised admin could hand the role to
a collaborator, who could then unpause. But a compromised admin can already call
`unpause_contract` directly — the exemption grants no attacker capability that
admin auth does not already provide. What it buys is the case the exemption is
actually for: a legitimate operator whose key is compromised or lost can rotate
it without first re-opening a contract they believe is frozen.

Rotating the admin while paused does not clear the pause. The new admin inherits
a still-paused contract and must unpause deliberately, which is visible in the
event stream.

## Everything else is frozen

The registry (`register_asset`, `update_asset_metadata`,
`transfer_asset_ownership`, `retire_asset`, `add_authorized_registrar`,
`remove_authorized_registrar`), tokenization, dividends, voting, detokenization,
transfer restrictions, leasing and insurance are all covered. Adding a new
mutating entrypoint without a guard fails `every_mutating_entrypoint_is_covered`
rather than quietly escaping the pause.

## The flag is TTL-managed

`DataKey::Paused` extends its TTL on write and on read, matching every other
persistent key in `src/ttl.rs`.

This matters more here than anywhere else. A paused contract is, by definition,
one nobody is calling — so the flag is precisely the entry that gets no traffic
and no renewal. An archived key reads back as absent, and `is_paused` treats
absent as not paused. A pause that silently expires is worse than no pause at
all: the operator believes the contract is frozen while it is live.

Previously `initialize` and `is_paused` extended this key but `pause_contract`
and `unpause_contract` did not, so pausing wrote the flag at the network's
`min_persistent_entry_ttl` and then left it to decay.

## Tests

- `src/tests/pause.rs` — coverage of the frozen paths, the exemptions, and the
  source-parsing guard rail.
- `src/tests/ttl.rs` — the TTL policy itself.