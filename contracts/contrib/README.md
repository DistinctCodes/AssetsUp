# `contrib`

A second asset registry with an audit log, an emergency pause, insurance
policies and claims, leasing, KYC, a price oracle, staking, and escrow.

Contract type: `ContribContract`. Deployable (`crate-type = ["lib", "cdylib"]`).

## Every file in `src/` compiles

`contrib/src/lib.rs` declares nine modules — `audit`, `events`, `pause`,
`types`, `insurance`, `lease`, `kyc`, `oracle`, `staking`, and `escrow` — and
every `.rs` file in `contrib/src/` belongs to one of them. There is no
uncompiled source left in this crate (tracked as [SC-57]).

That was not always true. Until SC-57, seven files — `kyc.rs`, `oracle.rs`,
`staking.rs`, `escrow.rs`, `tokenization.rs`, `detokenization.rs`, and
`restrictions.rs`, plus their `*_test.rs` files and `error.rs` — had no `mod`
declaration and were dead weight, about 1,670 lines that never compiled and
never shipped. Resolving that meant an explicit call per file:

- **`kyc`, `oracle`, `staking`, `escrow` were rewritten and wired in.** Each
  was previously its own standalone `#[contract]` type with its own `init`
  and its own admin key, which does not compose with `ContribContract` being
  the crate's single deployable contract. Each is now a plain module —
  matching the shape `insurance` and `lease` already used — exposed as
  `ContribContract` entrypoints that authorize against the registry's own
  `initialize`d admin. `escrow` additionally had no authorization check at
  all on cancellation and took its id as a caller-supplied argument (so a
  second `create_escrow` call could silently overwrite an existing one);
  both are fixed. See the entrypoint tables below.
- **`tokenization.rs`, `detokenization.rs`, and `restrictions.rs` were
  deleted, not wired in.** All three duplicated capability `assetsup`
  already ships (tokenization, detokenization, and transfer restrictions —
  see the ownership table below), `restrictions.rs` only makes sense
  layered on top of the tokenization data model being deleted alongside it,
  and `tokenization.rs` did not even parse as valid Rust — it redefined
  `OwnershipRecord`, called `format!` from a `#![no_std]` module, and used a
  raw string as a storage key. Keeping either would mean two divergent,
  competing implementations of the same feature in the workspace.
- **`error.rs` was deleted.** Its `Error` enum was referenced only by the
  three files above; once they're gone it has zero callers. `contrib` still
  has no typed errors — see [Errors](#errors) below — and wiring them in
  remains tracked separately in [SC-45], since giving them a numbering that
  doesn't collide with `assetsup`'s is its own piece of work.

Escrow, insurance, and lease all track *state*, not custody: `escrow` records
terms and a status (`Active` → `Completed` or `Cancelled`, never both), but —
like `insurance`'s premiums and `lease`'s rent and deposit — does not call a
token contract to move the `amount`. Wiring in real token custody is a
separate, larger change.

## Relationship to `assetsup`

`contrib` and `assetsup` are **two independent contracts with separate storage**.
Neither reads the other's state, and neither calls the other. Three module
names still appear in both (`audit`, `insurance`, `lease`) but the
implementations have diverged and are **not** interchangeable.

What each crate actually ships today:

| Concern | `assetsup` | `contrib` |
|---|---|---|
| Asset registry | ✅ authoritative | ✅ separate copy |
| Emergency pause | partial | ✅ dedicated `pause` module |
| Audit log | ✅ | ✅ |
| Insurance | ✅ full claim state machine | ✅ smaller policy/claim store |
| Leasing | ✅ richer lifecycle | ✅ check-in/cancel only |
| Tokenization, dividends, voting, detokenization, transfer restrictions | ✅ only here | ❌ (deleted duplicates — see above) |
| KYC, price oracle, staking, escrow | — | ✅ only here |

The often-repeated idea that `contrib` is where escrow and KYC live is now
true of the compiled contract, not just the source tree.

## Invariants

- An asset has exactly one owner at any time.
- A retired asset cannot be transferred.
- While paused, every mutating registry entrypoint rejects; reads still work.
- An escrow moves from `Active` to exactly one of `Completed` or `Cancelled` —
  never both.

## Module layout

| Module | Responsibility |
|---|---|
| `lib.rs` | Registry entrypoints and re-exported module facades. |
| `types.rs` | `AssetStatus`, the registry's shared type. |
| `pause.rs` | `pause`, `unpause`, `is_paused`, `require_not_paused`. |
| `audit.rs` | Append-only audit log per asset. |
| `insurance.rs` | Policies and claims. |
| `lease.rs` | Lease creation, check-in, cancellation. |
| `kyc.rs` | Per-address KYC records, admin-approved and tiered. |
| `oracle.rs` | Admin-authorized valuation reporters and a per-asset history. |
| `staking.rs` | Per-asset stakes with a time lock and reward accrual. |
| `escrow.rs` | Asset-sale escrow state machine (terms and status only — see above). |

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
| `kyc::DataKey::Record(Address)` | `KycRecord` | KYC status, tier, and expiry per address. |
| `oracle::DataKey::Oracle(Address)` | `bool` | Addresses authorized to publish valuations. |
| `oracle::DataKey::History(u64)` | `Vec<ValuationEntry>` | Last 10 valuations per asset id. |
| `staking::DataKey::Stake(u64, Address)` | `Stake` | A staker's position on an asset. |
| `staking::DataKey::AssetStakers(u64)` | `Vec<Address>` | Stakers seen for an asset. |
| `escrow::DataKey::Escrow(u64)` | `Escrow` | An escrow's terms and status. |
| `escrow::DataKey::NextEscrowId` | `u64` | Auto-incrementing escrow id counter. |

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

### Insurance and leasing

`create_policy`, `get_policy`, `cancel_policy`, `is_policy_active`,
`submit_claim`, `update_claim_status`, `get_claim`, `get_claims_for_policy`,
`create_lease`, `check_in_lease`, `cancel_lease`, `get_active_leases`.

### KYC

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `submit_kyc` | `address` | `()` | `address` |
| `approve_kyc` | `caller, address, tier, expires_at` | `()` | `caller` (must be admin) |
| `revoke_kyc` | `caller, address` | `()` | `caller` (must be admin) |
| `is_kyc_approved` | `address` | `bool` | read-only |
| `get_kyc_record` | `address` | `KycRecord` | read-only |

`is_kyc_approved` also checks `expires_at` against the current ledger
timestamp, so an approval that has aged out reads as not-approved without an
explicit `revoke_kyc`.

### Oracle

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `add_oracle` | `caller, oracle` | `()` | `caller` (must be admin) |
| `remove_oracle` | `caller, oracle` | `()` | `caller` (must be admin) |
| `update_valuation` | `source, asset_id, value, currency` | `()` | `source` (must be an authorized oracle) |
| `get_latest_valuation` | `asset_id` | `ValuationEntry` | read-only |
| `get_valuation_history` | `asset_id` | `Vec<ValuationEntry>` | read-only, last 10 entries |

### Staking

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `stake_tokens` | `asset_id, staker, amount, lock_period` | `()` | `staker` |
| `unstake_tokens` | `asset_id, staker` | `()` | `staker`; rejects before `staked_at + lock_period` |
| `get_staking_power` | `asset_id, staker` | `i128` | read-only |
| `accrue_staking_rewards` | `caller, asset_id` | `()` | `caller` (must be admin) |

Staking twice for the same `(asset_id, staker)` tops up the existing amount
and resets the lock timer to the second call's timestamp.
`accrue_staking_rewards` splits a fixed reward pool proportionally across an
asset's stakers — there is no external funding source wired in yet.

### Escrow

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `create_escrow` | `asset_id, seller, buyer, amount, token_address, deadline` | `u64` (escrow id) | `buyer` |
| `confirm_release` | `escrow_id, caller` | `()` | `caller` (must be the buyer) |
| `cancel_escrow` | `escrow_id, caller` | `()` | `caller` (must be the buyer or seller) |
| `get_escrow` | `escrow_id` | `Escrow` | read-only |

Both `confirm_release` and `cancel_escrow` reject once the escrow has left
`Active`. As noted above, `amount` and `token_address` describe the deal's
terms; this module does not itself move token balances.

### Not present

There is no tokenization, dividends, voting, detokenization, or
transfer-restriction support in `contrib` — that capability belongs to
`assetsup` (see the ownership table above).

## Events

| Topics | Emitted by |
|---|---|
| `("asset_reg", asset_id)` | `register_asset` |
| `("asset_tra", asset_id)` | `transfer_asset` |
| `("asset_ret", asset_id)` | `retire_asset` |
| `("pol_cre", policy_id)`, `("pol_can", policy_id)` | insurance policies |
| `("clm_sub", claim_id)`, `("clm_upd", claim_id)` | insurance claims |
| `("lease_cr", lease_id)`, `("lease_in", lease_id)`, `("lease_can", lease_id)` | leasing |
| `("pause",)`, `("unpause",)` | `pause_contract`, `unpause_contract` |
| `kyc_submitted`, `kyc_approved`, `kyc_revoked` | KYC, topic'd on `address` |
| `oracle_added`, `oracle_removed`, `valuation_updated` | oracle, topic'd on `oracle` / `asset_id` |
| `staked`, `unstaked`, `staking_rewards_accrued` | staking, topic'd on `asset_id` |
| `escrow_opened`, `escrow_released`, `escrow_cancelled` | escrow, topic'd on `escrow_id` |

`initialize` and the registrar allowlist changes emit **no** event. Unifying
the convention and closing those gaps is tracked in [SC-36].

## Errors

**`contrib` has no typed errors.** Every failure surfaces as a `panic!` on a
string rather than a `contracterror` a caller can match on. A prior draft of
typed errors (`error.rs`) existed but was never wired in and served only the
tokenization/detokenization/restrictions files removed in [SC-57]; it was
deleted rather than kept as more dead code. Introducing typed errors for the
whole crate — with a numbering that doesn't collide with `assetsup`'s, where
code 5 is `Unauthorized` but `BranchAlreadyExists` here — is tracked in
[SC-45].

## Tests

```sh
cargo test -p contrib
```

All tests live in [`src/tests/`](src/tests/); nothing outside it is compiled
into test builds.
