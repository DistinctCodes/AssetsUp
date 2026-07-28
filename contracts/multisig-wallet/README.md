# `multisig-wallet`

A general-purpose *m-of-n* multisignature wallet. Owners submit transactions,
confirm them, and once the confirmation threshold is met anyone may execute
them. Owner membership and the threshold itself are changed through the same
confirmation flow, so no single owner can unilaterally alter the wallet.

Contract type: `MultisigWallet`. Deployable (`crate-type = ["lib", "cdylib"]`).

## Invariants

- The threshold is always `>= 1` and `<= owners.len()`.
- A wallet always has at least 2 owners.
- A transaction executes only once — `executed` is checked before execution.
- A frozen wallet rejects every mutating operation except `emergency_unfreeze`.
- Confirmations are recorded per `(tx_id, address)`, so one owner cannot confirm
  the same transaction twice.

## Storage layout

All state lives in **instance** storage except transactions, proposals, and
confirmations, which are keyed individually.

| Key | Type | Meaning |
|---|---|---|
| `Owners` | `Vec<Address>` | Current owner set. |
| `OwnerProfile(Address)` | `OwnerProfile` | Per-owner metadata: type, voting weight, activity counters. |
| `Threshold` | `u32` | Confirmations required to execute. |
| `NextTxId` | `u64` | Monotonic transaction id counter. |
| `Transaction(u64)` | `Transaction` | A submitted transaction. |
| `Confirmation(u64, Address)` | `bool` | Whether an owner confirmed a transaction. |
| `DailyLimit` | `u128` | Per-day spend cap; `0` means unlimited. |
| `DailySpent(u64)` | `u128` | Amount spent on a given day bucket. |
| `Frozen` | `bool` | Emergency freeze flag. |
| `NextProposalId` | `u64` | Monotonic proposal id counter. |
| `Proposal(u64)` | `OwnershipProposal` | An owner/threshold change proposal. |
| `ProposalConfirmation(u64, Address)` | `bool` | Whether an owner confirmed a proposal. |
| `Admin` | `Address` | Address that initialized the wallet. |

## Entrypoints

`Auth` names the address whose `require_auth()` is called. "—" means the
entrypoint performs no authorization of its own.

### Lifecycle

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `initialize` | `admin, owners, threshold` | `Result<()>` | `admin` | `AlreadyInitialized`, `InsufficientOwners`, `InvalidThreshold` |

### Transactions

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `submit_transaction` | `initiator, to, amount, token, fn_name, args, expires_at` | `Result<u64>` | `initiator` | `NotInitialized`, `NotAnOwner`, `WalletFrozen` |
| `confirm_transaction` | `confirmer, tx_id` | `Result<()>` | `confirmer` | `NotAnOwner`, `TransactionNotFound`, `TransactionAlreadyExecuted`, `TransactionExpired`, `AlreadyConfirmed`, `WalletFrozen` |
| `revoke_confirmation` | `revoker, tx_id` | `Result<()>` | `revoker` | `NotAnOwner`, `TransactionNotFound`, `TransactionAlreadyExecuted` |
| `execute_transaction` | `tx_id` | `Result<()>` | — (permissionless once the threshold is met) | `TransactionNotFound`, `TransactionAlreadyExecuted`, `TransactionExpired`, `DailyLimitExceeded`, `WalletFrozen` |
| `cancel_transaction` | `caller, tx_id` | `Result<()>` | `caller` | `NotAnOwner`, `TransactionNotFound`, `TransactionAlreadyExecuted` |

`execute_transaction` is intentionally callable by anyone: the authorization
decision was already made by the confirming owners, and requiring one of them to
also submit the execution transaction adds no security while adding liveness
risk.

### Ownership governance

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `propose_add_owner` | `proposer, new_owner` | `Result<u64>` | `proposer` | `NotAnOwner`, `OwnerAlreadyExists` |
| `propose_remove_owner` | `proposer, owner` | `Result<u64>` | `proposer` | `NotAnOwner`, `OwnerNotFound`, `InsufficientOwners` |
| `propose_change_threshold` | `proposer, new_threshold` | `Result<u64>` | `proposer` | `NotAnOwner`, `InvalidThreshold`, `ThresholdTooHigh` |
| `confirm_proposal` | `confirmer, proposal_id` | `Result<()>` | `confirmer` | `NotAnOwner`, `ProposalNotFound`, `AlreadyConfirmed` |
| `execute_proposal` | `proposal_id` | `Result<()>` | — (permissionless once the threshold is met) | `ProposalNotFound`, `InvalidProposal`, `InvalidThreshold` |

### Emergency and limits

| Entrypoint | Args | Returns | Auth | Errors |
|---|---|---|---|---|
| `emergency_freeze` | `caller` | `Result<()>` | `caller` | `NotAnOwner` |
| `emergency_unfreeze` | `caller` | `Result<()>` | `caller` (must be an owner) | `NotAnOwner` |
| `set_daily_limit` | `caller, limit` | `Result<()>` | `caller` (must be an owner) | `NotAnOwner` |

### Reads

`get_owners`, `get_threshold`, `get_transaction`, `is_frozen`,
`get_required_confirmations`, `get_owner_profile`, `get_proposal`. None require
auth and none mutate state.

## Events

| Topics | Payload | Emitted by |
|---|---|---|
| `("tx_sub", tx_id)` | `(initiator, tx_type, timestamp)` | `submit_transaction` |
| `("tx_conf", tx_id)` | `(confirmer, confirmations_count, timestamp)` | `confirm_transaction` |
| `("tx_rev", tx_id)` | `(revoker, timestamp)` | `revoke_confirmation` |
| `("tx_exec", tx_id)` | `(initiator, result, timestamp)` | `execute_transaction` |
| `("tx_can", tx_id)` | `(caller, timestamp)` | `cancel_transaction` |
| `("own_add",)` | `(new_owner, proposer, timestamp)` | `execute_proposal` (add-owner) |
| `("own_rem",)` | `(removed_owner, proposer, timestamp)` | `execute_proposal` (remove-owner) |
| `("thr_chg",)` | `(old_threshold, new_threshold, timestamp)` | `execute_proposal` (threshold change) |
| `("frozen",)` | `(caller, timestamp)` | `emergency_freeze` |
| `("unfrozen",)` | `(caller, timestamp)` | `emergency_unfreeze` |
| `("lim_rch",)` | `(limit, attempted_total, timestamp)` | daily-limit check, before returning `DailyLimitExceeded` |

Topics are `symbol_short!` values. Note the gaps: `initialize`, the three
`propose_*` entrypoints, `confirm_proposal`, and `set_daily_limit` currently
emit **no** event, so those state changes are not observable off-chain. See
[SC-36] for the workspace-wide event convention and the plan to close these.

## Errors

Defined in [`src/errors.rs`](src/errors.rs), codes 1–19. See
`contracts/SECURITY.md` and [SC-45] for the cross-contract code allocation.

## Worked example

```rust
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

let env = Env::default();
env.mock_all_auths();

let contract_id = env.register(MultisigWallet, ());
let client = MultisigWalletClient::new(&env, &contract_id);

let admin = Address::generate(&env);
let alice = Address::generate(&env);
let bob = Address::generate(&env);
let carol = Address::generate(&env);

// 2-of-3 wallet.
client.initialize(&admin, &vec![&env, alice.clone(), bob.clone(), carol.clone()], &2);

// Alice proposes raising the threshold to 3.
let proposal_id = client.propose_change_threshold(&alice, &3);

// Alice and Bob confirm; the proposal now has 2 of 2 required confirmations.
client.confirm_proposal(&alice, &proposal_id);
client.confirm_proposal(&bob, &proposal_id);

// Anyone may execute once the threshold is reached.
client.execute_proposal(&proposal_id);
assert_eq!(client.get_threshold(), 3);
```

## Tests

```sh
cargo test -p multisig-wallet
```
