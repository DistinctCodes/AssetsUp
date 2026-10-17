# `multisig-transfer`

An approval workflow for asset ownership transfers. A transfer is requested,
collects approvals from authorized approvers until a per-category threshold is
met, and is then executed — at which point this contract calls into a separate
**asset registry contract** to actually move ownership.

Contract type: `MultiSigTransferContract`. Deployable
(`crate-type = ["lib", "cdylib"]`).

The directory and package names now match (`multisig-transfer`), so
`cargo test -p multisig-transfer` resolves from the directory name like every
other crate. This was fixed in [SC-33]; the directory was previously
`multisig_transfer/` with an underscore.

## Relationship to `multisig-wallet`

These are different contracts solving different problems and neither calls the
other:

- **`multisig-wallet`** is a generic *m-of-n* wallet. Its subject is an
  arbitrary transaction.
- **`multisig-transfer`** is domain-specific. Its subject is always an asset
  transfer, thresholds are configured **per asset category**, and execution
  delegates to a registry contract.

## Invariants

- An asset has at most one pending transfer request at a time
  (`AssetPendingRequest`); a second request fails with `PendingRequestExists`.
- An approver cannot approve the same request twice (`AlreadyApproved`).
- A requester cannot approve their own request (`CannotApproveOwnRequest`).
- Execution requires `approvals >= rule.required_approvals` for the asset's
  category (`NotEnoughApprovals`).
- Retired assets cannot be transferred (`AssetRetired`).
- A rule must grant a non-zero approval window (`MissingApprovalWindow`); a
  request whose window closes short of its threshold is auto-cancelled by
  `expire_transfer_request`, releasing the asset lock. A request that *did*
  reach its threshold stays `Approved` and executable.

## Storage layout

All entries use **persistent** storage.

| Key | Type | Meaning |
|---|---|---|
| `Admin` | `Address` | Contract administrator. |
| `AssetRegistry` | `Address` | Registry contract ownership changes are delegated to. |
| `NextRequestId` | `u64` | Monotonic request id counter, starts at 1. |
| `Requests` | `Map<u64, TransferRequest>` | All transfer requests by id. |
| `Rules` | `Map<BytesN<32>, ApprovalRule>` | Approval rule per asset category. |
| `PendingApprovals` | `Map<u64, Vec<Address>>` | Approvers who have signed off per request. |
| `ApprovalFlags` | `Map<(u64, Address), bool>` | Double-approval guard. |
| `ApprovalSignatures` | `Map<(u64, Address), BytesN<64>>` | Optional signature material. |
| `AssetPendingRequest` | `Map<BytesN<32>, u64>` | The open request for an asset, if any. |
| `AssetHistory` | `Map<BytesN<32>, Vec<u64>>` | All request ids ever raised for an asset. |

Storage is centralized in [`src/storage.rs`](src/storage.rs) rather than
scattered across modules — this is the pattern the rest of the workspace should
follow.

### TTL policy

All entries are **persistent**, and every one carries an explicit TTL policy in
[`src/ttl.rs`](src/ttl.rs), mirroring `assetsup`: an entry is bumped when it has
fewer than 30 days of ledgers left, back out to 90.

TTL is extended in two places, and both are needed:

- **On write**, inside the `set_*` accessors in `storage.rs`. An entrypoint that
  only bumped at its start would extend what was already there, leaving anything
  it writes afterwards at the network's `min_persistent_entry_ttl`.
- **On read and on entry**, via `ttl::extend_all` at the top of every
  entrypoint, including the read-only queries. A completed transfer is never
  written again, so a write-only policy would let its record lapse while an
  indexer is still querying it.

The `(request_id, approver)` approval flags in `approvals.rs` are individually
keyed, so `extend_all` cannot reach them; they are extended on read and write
directly.

Note that `Requests`, `AssetHistory` and the other maps are stored as a single
entry each, so TTL is per-map rather than per-request. TTL is a floor on data
lifetime, not a cleanup mechanism — abandoned approvals are handled by expiry
(see [SC-73]), which also releases the asset lock. Letting TTL lapse would
archive the record *without* releasing the lock, which is strictly worse.

## Entrypoints

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `initialize` | `admin, asset_registry` | `()` | — (none) | — |
| `configure_approval_rule` | `caller, rule` | `Result<()>` | admin check via `require_admin` | `NotInitialized`, `Unauthorized`, `InvalidThreshold`, `MissingApprovalWindow` |
| `create_transfer_request` | `caller, asset_id, asset_category, to_owner, ...` | `Result<u64>` | caller ownership check | `AssetNotFound`, `AssetRetired`, `InvalidOwner`, `InvalidNewOwner`, `PendingRequestExists`, `RuleNotFound` |
| `approve_transfer_request` | `caller, request_id, ...` | `Result<()>` | approver membership check | `RequestNotFound`, `RequestNotPending`, `ApproverNotAuthorized`, `CannotApproveOwnRequest`, `AlreadyApproved`, `ApprovalDeadlinePassed` |
| `reject_transfer_request` | `caller, request_id, reason_hash` | `Result<()>` | approver membership check | `RequestNotFound`, `RequestNotPending`, `ApproverNotAuthorized` |
| `execute_transfer` | `caller, request_id` | `Result<()>` | `caller` | `RequestNotFound`, `RequestNotPending`, `NotEnoughApprovals`, `ExecuteTooEarly`, `RequestExpired`, `RegistryCallFailed` |
| `cancel_transfer_request` | `caller, request_id` | `Result<()>` | requester or admin | `RequestNotFound`, `RequestNotPending`, `Unauthorized` |
| `expire_transfer_request` | `caller, request_id` | `Result<()>` | — (none, permissionless) | `NotInitialized`, `RequestNotFound`, `RequestNotPending`, `ApprovalWindowStillOpen` |

`initialize` performs **no** authorization and can be front-run on a freshly
deployed contract — see [SC-42].

### Reads

`get_request`, `get_asset_history`, `get_pending_transfers_approver`,
`get_required_approvers_category`. None require auth and none mutate state.

## Events

Event emission is centralized in [`src/events.rs`](src/events.rs) — the only
crate in the workspace that does this.

| Topic | Payload |
|---|---|
| `("TransferRequested",)` | `(request_id, asset_id, from_owner, to_owner, timestamp)` |
| `("TransferApproved",)` | `(request_id, approver, approval_count, timestamp)` |
| `("TransferRejected",)` | `(request_id, rejector, reason_hash, timestamp)` |
| `("TransferExecuted",)` | `(request_id, asset_id, new_owner, timestamp)` |
| `("TransferCancelled",)` | `(request_id, cancelled_by, timestamp)` |
| `("TransferRequestExpired",)` | `(request_id, asset_id, approvals_received, approvals_required, approval_deadline, timestamp)` |
| `("ApprovalRuleUpdated",)` | `(category, required_approvals, timestamp)` |
| `("ApproverAdded",)` | `(approver, added_by, timestamp)` |
| `("ApproverRemoved",)` | `(approver, removed_by, timestamp)` |

Topics here are string literals in `PascalCase`, while the rest of the workspace
uses `symbol_short!` in `snake_case`. `ApproverAdded` and `ApproverRemoved` are
`#[allow(dead_code)]` — declared but never emitted. See [SC-36].

## Errors

`MultiSigError`, defined in [`src/errors.rs`](src/errors.rs).

Code allocation follows [`contracts/ERRORS.md`](../ERRORS.md): **1–99** are shared
across the workspace with the same meaning everywhere, and **400–499** belong
to this contract alone.

| Code | Variant | Meaning |
|---|---|---|
| 2 | `NotInitialized` | Called before `initialize`. Shared. |
| 3 | `Unauthorized` | Authenticated but not permitted. Shared. |
| 400–406 | `RequestNotFound` … `PendingRequestExists` | Request lifecycle. |
| 420–426 | `RuleNotFound` … `ApprovalWindowStillOpen` | Approval rules and approvers. |
| 440–444 | `AssetNotFound` … `RegistryCallFailed` | Registry interaction. |

Note the collision risk with sibling contracts: code `1` is `NotInitialized`
here but `AlreadyInitialized` in `assetsup`, `contrib`, and `multisig-wallet`.
Resolving this is tracked in [SC-45].

## Module layout

| Module | Responsibility |
|---|---|
| `lib.rs` | Contract entrypoints. |
| `storage.rs` | `DataKey` and typed storage accessors. |
| `types.rs` | `TransferRequest`, `ApprovalRule`, `RequestStatus`. |
| `approvals.rs` | Approval bookkeeping and double-approval guards. |
| `registry.rs` | Cross-contract calls into the asset registry. |
| `rules.rs` | Per-category approval rule lookup and approval-window arithmetic. |
| `events.rs` | All event emission. |
| `errors.rs` | `MultiSigError`. |
| `utils.rs` | `require_admin`, `now`. |
| `ttl.rs` | Storage TTL policy and `extend_all`. |

## Tests

```sh
cargo test -p multisig-transfer
```

This crate currently has **no tests at all**. Writing the suite is tracked in
[SC-32].
