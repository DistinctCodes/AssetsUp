# `contrib`

A second asset registry with an audit log, an emergency pause, insurance
policies and claims, and leasing.

Contract type: `ContribContract`. Deployable (`crate-type = ["lib", "cdylib"]`).

## ⚠️ Most of this directory is not compiled

`contrib/src/lib.rs` declares only five modules:

```rust
mod audit;
mod pause;
mod types;
mod insurance;
mod lease;
```

Every other `.rs` file in `contrib/src/` has **no `mod` declaration and is
therefore not part of the crate** — roughly 1,670 lines that never compile and
never ship:

| File | Lines | File | Lines |
|---|---:|---|---:|
| `tokenization.rs` | 392 | `kyc.rs` | 107 |
| `restrictions.rs` | 177 | `test.rs` | 102 |
| `detokenization.rs` | 162 | `escrow.rs` | 101 |
| `staking.rs` | 138 | `oracle.rs` | 95 |
| `oracle_test.rs` | 133 | `error.rs` | 42 |
| `kyc_test.rs` | 115 | | |
| `staking_test.rs` | 108 | | |

Consequences worth being explicit about:

- **`ContribContract` does not expose escrow, KYC, staking, oracle,
  tokenization, detokenization, or transfer restrictions.** Reading those files
  will tell you nothing about the deployed contract.
- **`contrib` has no typed errors.** `error.rs` defines an `Error` enum that
  nothing references, so failures surface as `panic!` on a string.
- `tokenization.rs` does not even parse as valid contract code; it has never
  compiled.
- The orphaned `*_test.rs` files never run. All 35 passing tests come from
  `src/tests/`.

Whether to wire these modules in or delete them is part of the `assetsup` /
`contrib` consolidation tracked in [SC-46].

## Relationship to `assetsup`

`contrib` and `assetsup` are **two independent contracts with separate storage**.
Neither reads the other's state, and neither calls the other. Several module
names appear in both (`audit`, `insurance`, `lease`) but the implementations
have diverged and are **not** interchangeable.

What each crate actually ships today:

| Concern | `assetsup` | `contrib` |
|---|---|---|
| Asset registry | ✅ authoritative | ✅ separate copy |
| Emergency pause | partial | ✅ dedicated `pause` module |
| Audit log | ✅ | ✅ |
| Insurance | ✅ full claim state machine | ✅ smaller policy/claim store |
| Leasing | ✅ richer lifecycle | ✅ check-in/cancel only |
| Tokenization, dividends, voting, detokenization | ✅ only here | ❌ present as dead files only |
| Escrow, KYC, staking, price oracle | — | ❌ present as dead files only |

The often-repeated idea that `contrib` is where escrow and KYC live is not true
of the compiled contract.

## Invariants

- An asset has exactly one owner at any time.
- A retired asset cannot be transferred.
- While paused, every mutating registry entrypoint rejects; reads still work.

## Module layout

Compiled modules only — see the section above for the files that are not part
of the crate.

| Module | Responsibility |
|---|---|
| `lib.rs` | Registry entrypoints and re-exported module facades. |
| `types.rs` | `AssetStatus` and shared types. |
| `pause.rs` | `pause`, `unpause`, `is_paused`, `require_not_paused`. |
| `audit.rs` | Append-only audit log per asset. |
| `insurance.rs` | Policies and claims. |
| `lease.rs` | Lease creation, check-in, cancellation. |

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

### Not present

There are no escrow, KYC, staking, oracle, tokenization, detokenization, or
transfer-restriction entrypoints. Source files for them exist in `contrib/src/`
but are not compiled into the crate — see the warning at the top of this file.

## Events

`contrib` mixes two emission styles — `symbol_short!` with abbreviated
`snake_case`, and `Symbol::new` with full words:

| Topics | Emitted by |
|---|---|
| `("asset_reg", asset_id)` | `register_asset` |
| `("asset_tra", asset_id)` | `transfer_asset` |
| `("asset_ret", asset_id)` | `retire_asset` |
| `("pol_cre", policy_id)`, `("pol_can", policy_id)` | insurance policies |
| `("clm_sub", claim_id)`, `("clm_upd", claim_id)` | insurance claims |
| `("lease_cr", lease_id)`, `("lease_in", lease_id)`, `("lease_can", lease_id)` | leasing |
| `("pause",)`, `("unpause",)` | `pause_contract`, `unpause_contract` |

`initialize` and the registrar allowlist changes emit **no** event. Unifying
the convention and closing those gaps is tracked in [SC-36].

## Errors

**`contrib` has no typed errors in compiled code.** `src/error.rs` defines an
`Error` enum with codes 1–21 and 28–32, but the file is not declared as a
module and nothing references it, so every failure surfaces as a `panic!` on a
string rather than a `contracterror` a caller can match on.

Were it wired in, its numbering would **overlap `assetsup` with different
meanings** — code 5 is `Unauthorized` there but `BranchAlreadyExists` in
`assetsup`. Tracked in [SC-45].

## Tests

```sh
cargo test -p contrib
```

All 35 tests live in [`src/tests/`](src/tests/). The `*_test.rs` files at the
top of `src/` are not compiled and never run.
