# Signer weights

The wallet counts confirmations by weight, not by head count.

## How it works

- Every owner has an `OwnerProfile` (`src/types.rs`) with a `voting_weight`.
- `confirm_transaction` adds the confirmer's `voting_weight` to
  `confirmations_count`, and `revoke_confirmation` subtracts it.
- A transaction executes when `confirmations_count >= required_confirmations`,
  where `required_confirmations` is the threshold at submit time.

## Current limitation

`initialize` and the add-owner flow both assign a weight of `1`, and no
entrypoint changes it afterwards. With every weight at 1 this behaves like a
plain m-of-n wallet.

## To use real weights

Add an owner-weight parameter to the add-owner proposal, or a
`propose_change_weight` entrypoint, and keep the invariant that the combined
weight of all owners is at least the threshold.
