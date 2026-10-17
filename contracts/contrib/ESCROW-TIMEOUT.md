# Escrow timeout and auto-refund (design note)

Status: **proposal, not implemented.** `create_escrow` stores a `deadline`, but
nothing reads it. An `Active` escrow stays active until the buyer or seller
acts.

## Proposed change

Add `refund_expired(escrow_id)` to `src/escrow.rs`:

1. Load the escrow and require `status == Active`.
2. Require `env.ledger().timestamp() > escrow.deadline`.
3. Set the status to `Cancelled`, save it, and emit `escrow_cancelled`.

It needs no authorization, because the outcome is fixed by the deadline: the
depositor (buyer) is refunded and the seller gains nothing from calling it.

## Notes

- Escrow here tracks state only and moves no funds, so the "refund" is the state
  change that off-chain settlement acts on.
- `confirm_release` before the deadline keeps working as it does now.
- Expose it from `lib.rs` like the other escrow functions.
