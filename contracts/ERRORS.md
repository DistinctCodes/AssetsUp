# Error code allocation

Contract errors cross the network as bare `u32` codes. When two contracts use
the same integer for different meanings, a backend receiving code `3` cannot
say what happened without also knowing which contract produced it — and a
cross-contract call cannot interpret a failure from its callee at all.

This document is the allocation table ([SC-45]).

## The collisions this resolves

Before this change every crate numbered from 1 independently:

| Code | `assetsup` | `contrib` | `multisig-wallet` | `multisig-transfer` |
|---:|---|---|---|---|
| 1 | `AlreadyInitialized` | `AlreadyInitialized` | `AlreadyInitialized` | **`NotInitialized`** |
| 2 | `AdminNotFound` | `AdminNotFound` | **`NotInitialized`** | **`Unauthorized`** |
| 3 | `AssetAlreadyExists` | `AssetAlreadyExists` | **`Unauthorized`** | **`InvalidOwner`** |
| 4 | `AssetNotFound` | `AssetNotFound` | **`InvalidThreshold`** | **`InvalidNewOwner`** |
| 5 | `BranchAlreadyExists` | **`Unauthorized`** | **`InsufficientOwners`** | **`AssetNotFound`** |
| 8 | `Unauthorized` | `InvalidTokenSupply` | `TransactionExpired` | `RuleNotFound` |

Code `1` alone means both "already initialized" and its exact opposite
depending on which contract answered. Code `5` has four different meanings.

## Allocation

Each contract owns a numeric range. Shared errors are defined once, at fixed
codes, and every contract uses those rather than declaring its own.

| Range | Owner |
|---:|---|
| 1–99 | **Shared** — cross-cutting errors every contract may return |
| 100–199 | `assetsup` |
| 200–299 | `contrib` |
| 300–399 | `multisig-wallet` |
| 400–499 | `multisig-transfer` |
| 500–599 | `asset-maintenance` |
| 600+ | Unallocated. Claim the next free block here before using it. |

A code, once published, is permanent. Retiring a variant means leaving its
number unused, never reassigning it — a backend built against the old meaning
would silently misinterpret the new one.

## Shared errors (1–99)

Defined once in `assetsup::error::shared`, and mirrored at the same numbers by
every other crate. These are the errors whose meaning is identical everywhere,
so a caller can handle them without knowing which contract replied.

| Code | Variant | Returned when |
|---:|---|---|
| 1 | `AlreadyInitialized` | An initialize entrypoint is called on a contract that already holds state. |
| 2 | `NotInitialized` | Any entrypoint is called before initialization. |
| 3 | `Unauthorized` | The caller authenticated but is not permitted to perform this action. |
| 4 | `InvalidInput` | An argument failed validation and no more specific code applies. |
| 5 | `NotFound` | A referenced entity does not exist and no more specific code applies. |
| 6 | `ContractPaused` | A mutating entrypoint was called while the emergency pause is active. |
| 7 | `MathOverflow` | An arithmetic operation would exceed the type's range. |
| 8 | `MathUnderflow` | A subtraction would go below the type's minimum. |

Note the distinction between codes 1 and 2, which is where the old numbering
was at its worst: `AlreadyInitialized` and `NotInitialized` previously shared
code 1 across different contracts.

## `assetsup` (100–199)

| Block | Concern |
|---:|---|
| 100–119 | Registry: assets, branches, registrars |
| 120–139 | Tokenization and balances |
| 140–149 | Voting |
| 150–159 | Dividends |
| 160–169 | Detokenization and valuation |
| 170–179 | Validation |
| 180–199 | Leasing and insurance |

## `contrib` (200–299)

Typed `Error` enum lives in `contrib/src/error.rs` and is wired into the crate.
Failures use `handle_error` / `panic_with_error!` with codes in this range
(plus shared 1–99).

| Block | Concern |
|---:|---|
| 200–219 | Registry / assets |
| 220–239 | Insurance |
| 240–249 | Lease |
| 250–259 | Escrow |
| 260–269 | KYC |
| 270–279 | Staking |

## `multisig-wallet` (300–399)

| Block | Concern |
|---:|---|
| 300–319 | Transaction lifecycle |
| 320–339 | Owner and threshold governance |
| 340–349 | Emergency controls and limits |

## `multisig-transfer` (400–499)

| Block | Concern |
|---:|---|
| 400–419 | Request lifecycle |
| 420–439 | Approval rules and approvers |
| 440–449 | Registry interaction |

## `asset-maintenance` (500–599)

Typed `Error` enum lives in `asset-maintenance/src/error.rs`. Failures use
`handle_error` / `panic_with_error!` with codes in this range (plus shared 1–99).

| Block | Concern |
|---:|---|
| 500–509 | Providers, schedules, warranties, alerts |

## For backend implementers

```
code < 100          → shared meaning, safe to handle generically
100 <= code < 200   → assetsup-specific
200 <= code < 300   → contrib-specific
300 <= code < 400   → multisig-wallet-specific
400 <= code < 500   → multisig-transfer-specific
500 <= code < 600   → asset-maintenance-specific
```

Because the ranges do not overlap, a code identifies its origin contract on its
own. That is the property the old numbering lacked and the reason for the
renumbering.

## Adding an error

1. Decide whether it is genuinely shared. If two contracts would return it with
   the same meaning, it belongs in 1–99 and must be added to every crate's enum
   at the same number.
2. Otherwise take the next free code **within your contract's block**, not the
   next free code overall.
3. Give it a doc comment saying when it is returned. Every variant has one; a
   code with no stated meaning is not usable by a caller.
4. Never reuse a retired code.
