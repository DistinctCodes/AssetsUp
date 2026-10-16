# Staking: lock period and penalty rules

Source: `contracts/contrib/src/staking.rs`.

## Lock period

- `stake_tokens(asset_id, staker, amount, lock_period)` records the stake with
  `staked_at` set to the current ledger timestamp. `lock_period` is in seconds.
- `unstake_tokens(asset_id, staker)` panics with `Lock period has not elapsed`
  while `now < staked_at + lock_period`.
- After the lock, `unstake_tokens` releases the full staked amount.

## Top-ups

Staking again for the same asset **adds** to the amount, keeps rewards already
earned, and **resets the lock timer** to the time of the new stake.

## Penalties

There is no early-unstake penalty. Unstaking before the lock ends is rejected,
not penalised, so there is nothing to forfeit and no fee is charged.

## Rewards

Rewards accrue separately, when an admin calls `accrue_staking_rewards`, and are
tracked in the stake's `rewards_earned` field.
