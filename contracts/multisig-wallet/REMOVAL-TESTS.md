# Test coverage: removing a signer below the threshold

The rule: a wallet always keeps at least 2 owners, and never fewer owners than
its threshold, so removal can never make the threshold unreachable.

## Where it is tested

`src/tests_coverage.rs`:

- `removal_that_would_drop_below_the_threshold_is_rejected`: a 2-of-2 wallet
  cannot shed an owner. `propose_remove_owner` returns `InsufficientOwners`.

`src/proptests.rs`:

- Generated sequences of removals and confirmations assert that the owner count
  never drops below 2 and the threshold never exceeds the owner count.

## What the check does

`propose_remove_owner` rejects the request up front when the remaining owners
could not reach the threshold, so no proposal is created for it.
