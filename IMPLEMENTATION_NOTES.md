# Implementation: Issues #1530–#1533

Overlay these files onto `AssetsUp/contracts/`.

## #1532 – Source of truth (contrib vs assetsup)
- `contracts/SPLIT-PLAN.md` now has an explicit ownership table:
  - **assetsup** owns registry, audit, insurance, lease, tokenization, etc.
  - **contrib** owns escrow, KYC, staking, oracle (and granular pause for those).
  - contrib’s audit/insurance/lease are soft-deprecated duplicates — do not extend.

## #1531 – Granular pause
- `pause.rs`: `Subsystem::{Escrow,Staking,Kyc}`, `pause_subsystem` / `unpause_subsystem` / `is_subsystem_paused`.
- Global pause still freezes everything.
- Escrow, staking, and KYC mutators call `require_subsystem_not_paused`.
- Entrypoints on `ContribContract`; events `SubsystemPaused` / `SubsystemUnpaused`.

## #1530 – Pro-rated staking rewards
- `RewardPeriod` + weight `amount * time_in_period`.
- Mid-period joiners get a proportional share of `REWARD_POOL`.
- `set_reward_period_length` for admin; period rolls forward on each accrue.

## #1533 – Escrow ↔ staking integration
- `confirm_release` calls `staking::on_escrow_released` (1% bonus to seller stake if present).
- Integration tests in `tests/escrow_staking_integration.rs`.

## Verify
```bash
cd contracts
cargo test -p contrib mid_period
cargo test -p contrib escrow_release_adjusts
cargo test -p contrib staking_subsystem_pause
cargo test -p contrib pausing_staking_does_not_block
```
