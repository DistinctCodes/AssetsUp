# Escrow dispute resolution (design note)

Status: **proposal, not implemented.** An escrow today ends in one of two ways:
the buyer calls `confirm_release`, or the buyer or seller calls `cancel_escrow`.
If they disagree, neither can force an outcome.

## Proposed change

1. Add `EscrowStatus::Disputed`.
2. `open_dispute(escrow_id, caller)`: buyer or seller moves an `Active` escrow to
   `Disputed`. Release and cancel are rejected while disputed.
3. An `arbiter` address, set by the admin (or fixed at `create_escrow`), calls
   `resolve_dispute(escrow_id, release_to_seller: bool)`.
4. The escrow ends as `Completed` (release) or `Cancelled` (refund).

## Events

`escrow_disputed` and `escrow_resolved`, next to the existing escrow events.

## Notes

The escrow module tracks state only and does not hold funds, so resolution
changes state and emits events for off-chain settlement.
