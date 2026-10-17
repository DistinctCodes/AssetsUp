# Daily spending limit

Source: `set_daily_limit` and `check_daily_limit` in `src/lib.rs`.

## What exists

- `set_daily_limit(caller, limit)` (owner only) sets a cap on the total `value`
  executed per day. `0` means no limit, which is the default.
- When a transfer-type transaction with a `value` is executed, the day's running
  total is checked. If `spent + value > limit` the call fails with
  `DailyLimitExceeded` and a daily-limit-reached event is emitted.
- A daily-limit-changed event is emitted whenever the limit is updated.

## What does not exist

A fast path that lets small transfers skip full multisig approval. Every
transaction still needs the full threshold; the limit only caps the total.

## Possible follow-up

Allow a single owner to execute a transfer below a configured `fast_path_max`,
while still counting it against the daily limit.
