# `assetsup`

The primary asset registry. Assets are registered by authorized registrars,
owned by an address, and can be transferred, retired, tokenized into fractional
shares, leased, insured, voted on, and finally detokenized.

Contract type: `AssetUpContract`. Deployable (`crate-type = ["lib", "cdylib"]`).

This is the largest crate in the workspace (~8,900 lines across 33 files). See
[`../README.md`](../README.md#how-assetsup-and-contrib-relate) for how it
relates to `contrib`, which duplicates several module names. Splitting this
crate is under discussion in [SC-46].

## Invariants

- An asset has exactly one owner at any time.
- An asset id is unique; re-registering an existing id fails with
  `AssetAlreadyExists`.
- A retired asset cannot be transferred or updated.
- For a tokenized asset, the sum of all holder balances equals the total token
  supply.
- Locked tokens cannot be transferred until unlocked.
- Every state change is appended to the audit log for that asset.

## Two asset id spaces

The crate uses **two different asset identifier types**, which is a common
source of confusion:

- The **registry** (`register_asset`, `get_asset`, `transfer_asset_ownership`,
  leases, insurance) keys assets by **`BytesN<32>`**.
- **Tokenization** (`tokenize_asset`, balances, dividends, voting,
  detokenization, transfer restrictions) keys assets by **`u64`**.

These namespaces are not linked by the contract. Callers are responsible for
maintaining the mapping between them.

## Module layout

| Module | Responsibility |
|---|---|
| `lib.rs` | Contract entrypoints; delegates to the modules below. |
| `asset.rs` | `Asset`, `AssetInfo`, registry `DataKey`. |
| `types.rs` | Shared types re-exported from the crate root. |
| `error.rs` | `Error` enum (codes 1–46) and `handle_error`. |
| `audit.rs` | Append-only audit entries per asset. |
| `tokenization.rs` | Fractional share issuance, balances, locks, valuation. |
| `dividends.rs` | Dividend distribution and claims. |
| `voting.rs` | Weighted voting by token balance. |
| `detokenization.rs` | Detokenization proposals and execution. |
| `transfer_restrictions.rs` | Whitelists and transfer rules. |
| `lease.rs` | Asset leasing lifecycle. |
| `insurance.rs` | Insurance policies and the claim state machine. |
| `branch.rs` | Branch/organization records. |

## Storage layout

Registry state uses **persistent** storage; contract-level flags are also
persistent (not `instance`, which is unusual — see [SC-44]).

| Key | Type | Meaning |
|---|---|---|
| `Admin` | `Address` | Contract administrator. |
| `Paused` | `bool` | Global pause flag. |
| `TotalAssetCount` | `u64` | Number of registered assets. |
| `ContractMetadata` | `ContractMetadata` | Name/version metadata. |
| `AuthorizedRegistrar(Address)` | `bool` | Registrar allowlist. |
| `ScheduledTransfer(BytesN<32>)` | — | Scheduled transfer record. |
| `PendingApproval(BytesN<32>)` | — | Pending approval record. |

Module-specific keys (assets, token balances, leases, policies) live in each
module's own `DataKey`.

## Entrypoints

`Auth` names the address whose `require_auth()` is called.

### Lifecycle and administration

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `initialize` | `admin` | `Result<()>` | `admin` |
| `update_admin` | `new_admin` | `Result<()>` | current admin |
| `add_authorized_registrar` | `registrar` | `Result<()>` | current admin |
| `remove_authorized_registrar` | `registrar` | `Result<()>` | current admin |
| `pause_contract` | — | `Result<()>` | current admin |
| `unpause_contract` | — | `Result<()>` | current admin |

Admin transfer is single-step: `update_admin` hands over immediately, so a typo
permanently bricks administration. A two-step transfer is tracked in [SC-48].

### Asset registry

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `register_asset` | `asset, caller` | `Result<()>` | ⚠️ registrar allowlist check only — **no `require_auth`** |
| `update_asset_metadata` | `asset_id, ..., caller` | `Result<()>` | ⚠️ owner check only — **no `require_auth`** |
| `transfer_asset_ownership` | `asset_id, new_owner, caller` | `Result<()>` | ⚠️ owner check only — **no `require_auth`** |
| `retire_asset` | `asset_id, caller` | `Result<()>` | ⚠️ owner/admin check only — **no `require_auth`** |

> **⚠️ Known gap.** These four entrypoints compare the supplied `caller`
> argument against an allowlist, the asset owner, or the admin, but never call
> `caller.require_auth()`. Because `caller` is attacker-supplied, the check can
> be satisfied by simply naming a privileged address. Fixing this is tracked in
> [SC-42]; it is the highest-severity item in the workspace.

Reads: `get_asset`, `get_asset_info`, `batch_get_asset_info`,
`get_assets_by_owner`, `get_asset_transfer_history`, `check_asset_exists`,
`get_total_asset_count`, `get_admin`, `is_paused`, `is_authorized_registrar`,
`get_contract_metadata`, `get_asset_audit_logs`.

### Branches

| Entrypoint | Auth |
|---|---|
| `register_branch` | admin |
| `assign_asset_to_branch` | admin or branch admin |
| `get_branch`, `get_branch_assets` | — |

`assign_asset_to_branch` rejects an unknown branch (`BranchNotFound`) and an
unknown asset (`AssetNotFound`), so an asset can never be pointed at a stale or
misspelled branch id.

### Transfer history

`get_asset_transfer_history` returns the asset's append-only list of ownership
transfers (oldest first), recorded on every `transfer_asset_ownership` call. The
on-chain audit log and its reconciliation with the off-chain `audit-logs`
service are documented in [`src/audit.rs`](src/audit.rs).

### Tokenization

| Entrypoint | Auth |
|---|---|
| `tokenize_asset` | owner |
| `mint_tokens`, `burn_tokens` | issuer |
| `transfer_tokens` | `from` |
| `lock_tokens` | owner |
| `unlock_tokens` | — |
| `update_valuation` | — |
| `bump_asset_ttl` | — (permissionless keeper) |

Reads: `get_token_balance`, `get_token_holders`, `is_tokens_locked`,
`get_ownership_percentage`, `get_tokenized_asset`.

`bump_asset_ttl` extends the storage TTL of an asset's persistent entries so a
keeper can stop an inactive-but-valid asset being archived. It is idempotent
and exempt from the pause.

A token symbol may be claimed by at most one tokenized asset. Reusing a symbol
is rejected with `DuplicateTokenSymbol` (`132`), which stops the same underlying
asset being tokenized twice under different ids.

### Dividends, voting, detokenization

| Entrypoint | Auth |
|---|---|
| `distribute_dividends` | — |
| `claim_dividends` | `holder` |
| `enable_revenue_sharing`, `disable_revenue_sharing` | — |
| `cast_vote` | `voter` |
| `propose_detokenization` | `proposer` |
| `execute_detokenization` | — |

Reads: `get_unclaimed_dividends`, `get_vote_tally`, `has_voted`,
`proposal_passed`, `get_detokenization_proposal`, `is_detokenization_active`.

`propose_detokenization` is rejected with `DetokenizationCooldownActive` (`163`)
until `DETOKENIZE_COOLDOWN_SECONDS` (7 days) have elapsed since the asset was
tokenized, preventing immediate tokenize→detokenize round-trips.

### Transfer restrictions

`set_transfer_restriction`, `add_to_whitelist`, `remove_from_whitelist`,
`is_whitelisted`, `get_whitelist`, plus jurisdiction rules:
`set_geographic_restriction`, `set_address_jurisdiction`,
`get_address_jurisdiction`. None of the restriction setters currently call
`require_auth` except `set_address_jurisdiction`, which is self-authenticated.

When an asset has a non-empty `geographic_allowed` allow-list, `validate_transfer`
requires the recipient to have a recorded jurisdiction that appears in it, or
fails with `GeographicRestriction`.

### Leasing and insurance

| Entrypoint | Auth |
|---|---|
| `create_lease` | lessor |
| `return_leased_asset`, `cancel_lease` | `caller` |
| `create_insurance_policy` | insurer |
| `cancel_insurance_policy`, `suspend_insurance_policy`, `renew_insurance_policy` | `caller`/insurer |
| `expire_insurance_policy` | — |
| `emit_insurance_expiry_reminder` | — (permissionless keeper) |

Reads: `is_insurance_expiry_reminder_due`.

`emit_insurance_expiry_reminder` only emits once a policy is inside its
`POLICY_EXPIRY_REMINDER_WINDOW_SECONDS` (7 day) pre-expiry window, giving
off-chain services a chain-native renewal signal. A vote outcome now also
requires a `QUORUM_PERCENT` (30%) turnout in addition to the approval
threshold.

## Events

| Topic | Emitted by |
|---|---|
| `("asset_reg",)` | `register_asset` |
| `("asset_upd",)` | `update_asset_metadata` |
| `("asset_tx",)` | `transfer_asset_ownership` |
| `("asset_ret",)` | `retire_asset` |
| `("admin_chg",)` | `update_admin` |
| `("c_pause",)` | `pause_contract` |
| `("c_unpause",)` | `unpause_contract` |
| `("branch_registered",)`, `("asset_assigned_to_branch",)` | `register_branch`, `assign_asset_to_branch` |
| `("lease_new",)`, `("lease_ret",)`, `("lease_can",)`, `("lease_exp",)` | lease lifecycle |
| `lease_terminated_early` | `return_leased_asset` when returned before the end date |

Tokenization, dividends, voting, and detokenization emit events too; see the
respective modules. Registrar allowlist changes emit **no** event. See [SC-36]
for the workspace-wide event catalogue.

## Errors

`Error`, defined in [`src/error.rs`](src/error.rs), follows the workspace
allocation in [`../ERRORS.md`](../ERRORS.md): shared codes 1–99 mean the same
thing in every contract, and `assetsup`-specific codes occupy 100–199 (registry
100–119, tokenization 120–139, voting 140–149, dividends 150–159, detokenization
160–169, validation 170–179, leasing and insurance 180–199).

Note that most entrypoints return `Result<_, Error>`, but `handle_error` panics
with the error instead of returning it in some paths, so callers see a trap
rather than a typed error. Cross-contract code allocation is tracked in [SC-45].

## Worked example

```rust
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

let env = Env::default();
env.mock_all_auths();

let contract_id = env.register(AssetUpContract, ());
let client = AssetUpContractClient::new(&env, &contract_id);

let admin = Address::generate(&env);
let registrar = Address::generate(&env);
let owner = Address::generate(&env);

client.initialize(&admin);
client.add_authorized_registrar(&registrar);

let asset = Asset {
    id: BytesN::from_array(&env, &[1u8; 32]),
    name: String::from_str(&env, "Forklift #3"),
    owner: owner.clone(),
    // ... remaining fields
};
client.register_asset(&asset, &registrar);

assert_eq!(client.get_asset(&asset.id).owner, owner);
assert_eq!(client.get_total_asset_count(), 1);
```

## Tests

```sh
cargo test -p assetsup
```

199 tests live under [`src/tests/`](src/tests/), organized by module.
