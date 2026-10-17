# Threshold change event

A dedicated event already exists for threshold changes.

## `ThresholdChanged`

Defined in `src/events.rs`, published by `events::threshold_changed`.

| Field | Type | Meaning |
|---|---|---|
| `old_threshold` | `u32` | Threshold before the change. |
| `new_threshold` | `u32` | Threshold after the change. |
| `timestamp` | `u64` | Ledger timestamp of the change. |

## When it is emitted

When a `propose_change_threshold` proposal reaches the current threshold and is
executed. Proposing or confirming alone does not emit it; those emit
`proposal_submitted` and `proposal_confirmed`.

## Consuming it

Filter on the `threshold_changed` topic. This is separate from the owner
add and remove events.
