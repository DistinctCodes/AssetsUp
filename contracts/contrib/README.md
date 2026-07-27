# `contrib`

A second asset registry carrying the capabilities `assetsup` does not have:
**escrow**, **KYC**, **staking**, a **price oracle**, and a first-class
**emergency pause**.

Contract type: `ContribContract`. Deployable (`crate-type = ["lib", "cdylib"]`).

## Relationship to `assetsup`

`contrib` and `assetsup` are **two independent contracts with separate storage**.
Neither reads the other's state, and neither calls the other. Several module
names appear in both (`audit`, `detokenization`, `insurance`, `lease`,
`tokenization`, transfer restrictions) but the implementations have diverged
and are **not** interchangeable.

What each crate uniquely owns today:

| Concern | `assetsup` | `contrib` |
|---|---|---|
| Asset registry | ✅ authoritative | ✅ separate copy |
| Escrow | — | ✅ only here |
| KYC | — | ✅ only here |
| Staking | — | ✅ only here |
| Price oracle | — | ✅ only here |
| Emergency pause | partial | ✅ dedicated `pause` module |
| Dividends, voting | ✅ only here | — |
| Insurance | ✅ full claim state machine | smaller policy/claim store |
| Leasing | ✅ richer lifecycle | check-in/cancel only |

Deciding which crate owns each duplicated concern is tracked in [SC-46]. Until
that lands, treat them as separate deployments and read this file for
`contrib`'s actual behaviour.

## Invariants

- An asset has exactly one owner at any time.
- A retired asset cannot be transferred.
- While paused, every mutating registry entrypoint rejects; reads still work.
- An escrow's funds are either released to the beneficiary or returned to the
  depositor — never both.
- A KYC record is approved only by the admin and carries an expiry.

## Module layout

| Module | Responsibility |
|---|---|
| `lib.rs` | Registry entrypoints and re-exported module facades. |
| `types.rs` | `AssetStatus` and shared types. |
| `error.rs` | `Error` enum and `handle_error`. |
| `pause.rs` | `pause`, `unpause`, `is_paused`, `require_not_paused`. |
| `audit.rs` | Append-only audit log per asset. |
| `escrow.rs` | Escrow creation, release, cancellation. |
| `kyc.rs` | KYC submission, approval, revocation, tiers. |
| `staking.rs` | Token staking, unstaking, reward accrual. |
| `oracle.rs` | Oracle allowlist and asset valuation feed. |
| `insurance.rs` | Policies and claims. |
| `lease.rs` | Lease creation, check-in, cancellation. |
| `tokenization.rs` | Fractional shares. |
| `detokenization.rs` | Detokenization proposals. |
| `restrictions.rs` | Whitelists and transfer validation. |

## Storage layout

| Key | Type | Meaning |
|---|---|---|
| `Asset(BytesN<32>)` | `Asset` | Registered asset. |
| `OwnerAssets(Address)` | `Vec<BytesN<32>>` | Assets held by an owner. |
| `TotalCount` | `u64` | Registered asset count. |
| `Admin` | `Address` | Contract administrator. |
| `Paused` | `bool` | Emergency pause flag. |
| `AuthorizedRegistrar(Address)` | `bool` | Registrar allowlist. |
| `AuditLogCount` | `u64` | Audit entry counter. |
| `AuditLogs(BytesN<32>)` | `Vec<AuditLog>` | Audit trail per asset. |

Escrow, KYC, staking, and oracle modules define their own keys.

## Entrypoints

### Registry

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `initialize` | `admin` | `()` | — (none, front-runnable) |
| `register_asset` | `registrar, asset` | `()` | `registrar` |
| `transfer_asset` | `asset_id, new_owner, caller` | `()` | `caller` |
| `retire_asset` | `asset_id, caller` | `()` | `caller` |
| `add_authorized_registrar` | `caller, registrar` | `()` | `caller` |
| `remove_authorized_registrar` | `caller, registrar` | `()` | `caller` |
| `add_registrar` / `remove_registrar` | `caller, registrar` | `()` | aliases of the above |

Unlike `assetsup`, these entrypoints **do** call `require_auth()` on the acting
address. `contrib` is the correct reference implementation for authorization in
this workspace.

Reads: `get_admin`, `get_asset`, `get_asset_info`, `get_assets_by_owner`,
`get_total_count`, `get_total_asset_count`, `is_authorized_registrar`,
`get_audit_logs`, `is_paused`.

### Pause

| Entrypoint | Args | Auth |
|---|---|---|
| `pause_contract` | `caller` | `caller` (must be admin) |
| `unpause_contract` | `caller` | `caller` (must be admin) |
| `is_paused` | — | read-only |

`pause::require_not_paused` is the guard mutating entrypoints call. Verifying
that **every** mutating entrypoint calls it is tracked in [SC-47].

### Escrow

| Entrypoint | Args | Auth |
|---|---|---|
| `create_escrow` | `depositor, beneficiary, amount, ...` | `depositor` |
| `confirm_release` | `escrow_id` | depositor/arbiter check |
| `cancel_escrow` | `escrow_id` | depositor/arbiter check |
| `get_escrow` | `escrow_id` | read-only |

### KYC

| Entrypoint | Args | Auth |
|---|---|---|
| `init` | `admin` | — (none) |
| `submit_kyc` | `address` | `address` |
| `approve_kyc` | `address, tier, expires_at` | admin |
| `revoke_kyc` | `address` | admin |
| `is_kyc_approved` / `get_kyc_record` | `address` | read-only |

### Staking

`init`, `stake_tokens`, `unstake_tokens`, `get_staking_power`,
`accrue_staking_rewards`.

### Oracle

`init`, `add_oracle`, `remove_oracle`, `update_valuation` (restricted to
allowlisted oracle sources), `get_latest_valuation`, `get_valuation_history`.

### Insurance and leasing

`create_policy`, `get_policy`, `cancel_policy`, `is_policy_active`,
`submit_claim`, `update_claim_status`, `get_claim`, `get_claims_for_policy`,
`create_lease`, `check_in_lease`, `cancel_lease`, `get_active_leases`.

## Events

`contrib` mixes two emission styles — `symbol_short!` with abbreviated
`snake_case`, and `Symbol::new` with full words:

| Topics | Emitted by |
|---|---|
| `("asset_reg", asset_id)` | `register_asset` |
| `("asset_tra", asset_id)` | `transfer_asset` |
| `("asset_ret", asset_id)` | `retire_asset` |
| `("escrow_created", escrow_id)` | `create_escrow` |
| `("escrow_completed", escrow_id)` | `confirm_release` |
| `("escrow_cancelled", escrow_id)` | `cancel_escrow` |
| `("kyc_submitted", address)` | `submit_kyc` |
| `("kyc_approved", address)` | `approve_kyc` |
| `("kyc_revoked", address)` | `revoke_kyc` |
| `("oracle_added", oracle)` / `("oracle_removed", oracle)` | oracle allowlist |
| `("valuation_updated", asset_id)` | `update_valuation` |
| `("staked", asset_id, staker)` / `("unstaked", asset_id, staker)` | staking |
| `("rewards_accrued", asset_id)` | `accrue_staking_rewards` |
| `("pol_cre", policy_id)`, `("pol_can", policy_id)` | insurance policies |
| `("clm_sub", claim_id)`, `("clm_upd", claim_id)` | insurance claims |
| `("lease_cr", lease_id)`, `("lease_in", lease_id)`, `("lease_can", lease_id)` | leasing |

Unifying this is tracked in [SC-36].

## Errors

`Error`, defined in [`src/error.rs`](src/error.rs). Codes 1–21 and 28–32; note
the gap at 22–27 and that the numbering **overlaps `assetsup` with different
meanings** — code 5 is `Unauthorized` here but `BranchAlreadyExists` in
`assetsup`. Tracked in [SC-45].

## Tests

```sh
cargo test -p contrib
```

35 tests across [`src/tests/`](src/tests/) plus the module-level `*_test.rs`
files.
