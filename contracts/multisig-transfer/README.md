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

## Entrypoints

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `initialize` | `admin, asset_registry` | `()` | — (none) | — |
| `configure_approval_rule` | `caller, rule` | `Result<()>` | admin check via `require_admin` | `NotInitialized`, `Unauthorized` |
| `create_transfer_request` | `caller, asset_id, asset_category, to_owner, ...` | `Result<u64>` | caller ownership check | `AssetNotFound`, `AssetRetired`, `InvalidOwner`, `InvalidNewOwner`, `PendingRequestExists`, `RuleNotFound` |
| `approve_transfer_request` | `caller, request_id, ...` | `Result<()>` | approver membership check | `RequestNotFound`, `RequestNotPending`, `ApproverNotAuthorized`, `CannotApproveOwnRequest`, `AlreadyApproved`, `ApprovalDeadlinePassed` |
| `reject_transfer_request` | `caller, request_id, reason_hash` | `Result<()>` | approver membership check | `RequestNotFound`, `RequestNotPending`, `ApproverNotAuthorized` |
| `execute_transfer` | `caller, request_id` | `Result<()>` | `caller` | `RequestNotFound`, `RequestNotPending`, `NotEnoughApprovals`, `ExecuteTooEarly`, `RequestExpired`, `RegistryCallFailed` |
| `cancel_transfer_request` | `caller, request_id` | `Result<()>` | requester or admin | `RequestNotFound`, `RequestNotPending`, `Unauthorized` |

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
| `("ApprovalRuleUpdated",)` | `(category, required_approvals, timestamp)` |
| `("ApproverAdded",)` | `(approver, added_by, timestamp)` |
| `("ApproverRemoved",)` | `(approver, removed_by, timestamp)` |

Topics here are string literals in `PascalCase`, while the rest of the workspace
uses `symbol_short!` in `snake_case`. `ApproverAdded` and `ApproverRemoved` are
`#[allow(dead_code)]` — declared but never emitted. See [SC-36].

## Errors

`MultiSigError`, defined in [`src/errors.rs`](src/errors.rs), codes 1–18.

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
| `rules.rs` | Per-category approval rule lookup. |
| `events.rs` | All event emission. |
| `errors.rs` | `MultiSigError`. |
| `utils.rs` | `require_admin`, `now`. |

## Tests

```sh
cargo test -p multisig-transfer
```

This crate currently has **no tests at all**. Writing the suite is tracked in
[SC-32].
