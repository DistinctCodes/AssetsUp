# Authorization audit

Every public entrypoint across the five crates, and which principal it
authenticates ([SC-42]).

Soroban authorization is **explicit**. An entrypoint that does not call
`require_auth()` on an address is callable by anyone, whatever else it checks.
Comparing a caller-supplied `Address` argument against an allowlist is *not*
authorization: the attacker chooses that argument.

`env.mock_all_auths()` hides the difference entirely, which is why every claim
below is backed by a negative test that runs **without** it —
`assetsup/src/tests/auth.rs` and the `*_requires_*_authorization` tests in the
other crates.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Calls `require_auth()` on the named principal. |
| 🔓 | Deliberately permissionless. |
| 📖 | Read-only; no state change, no auth required. |

---

## `assetsup`

### Fixed in this change

These four took a `caller: Address`, compared it against a registrar allowlist,
the asset owner, or the admin — and never authenticated it. Because `caller` is
supplied by whoever builds the transaction, the check was satisfied by naming a
privileged address.

| Entrypoint | Was | Now |
|---|---|---|
| `register_asset` | registrar allowlist check only | ✅ `caller` |
| `update_asset_metadata` | owner/admin check only | ✅ `caller` |
| `transfer_asset_ownership` | owner check only | ✅ `caller` |
| `retire_asset` | owner/admin check only | ✅ `caller` |

`transfer_asset_ownership` was the most serious: a direct path to taking any
registered asset by naming its owner.

### Lifecycle and administration

| Entrypoint | Principal | |
|---|---|---|
| `initialize` | `admin` | ✅ |
| `update_admin` | current admin | ✅ |
| `add_authorized_registrar` | current admin | ✅ |
| `remove_authorized_registrar` | current admin | ✅ |
| `pause_contract` | current admin | ✅ |
| `unpause_contract` | current admin | ✅ |

`initialize` now authenticates the incoming admin, closing the front-running
window where whoever called it first on a freshly deployed contract became
admin.

### Registry

| Entrypoint | Principal | |
|---|---|---|
| `register_asset` | `caller`, must be an authorized registrar | ✅ |
| `update_asset_metadata` | `caller`, must be owner or admin | ✅ |
| `transfer_asset_ownership` | `caller`, must be the current owner | ✅ |
| `retire_asset` | `caller`, must be owner or admin | ✅ |
| `get_asset`, `get_asset_info`, `batch_get_asset_info`, `get_assets_by_owner`, `check_asset_exists`, `get_total_asset_count`, `get_admin`, `is_paused`, `is_authorized_registrar`, `get_contract_metadata`, `get_asset_audit_logs` | — | 📖 |

### Tokenization, dividends, voting

| Entrypoint | Principal | |
|---|---|---|
| `tokenize_asset` | owner | ✅ |
| `mint_tokens`, `burn_tokens` | issuer | ✅ |
| `transfer_tokens` | `from` | ✅ |
| `lock_tokens` | owner | ✅ |
| `claim_dividends` | `holder` | ✅ |
| `cast_vote` | `voter` | ✅ |
| `propose_detokenization` | `proposer` | ✅ |
| `unlock_tokens`, `update_valuation`, `distribute_dividends`, `enable_revenue_sharing`, `disable_revenue_sharing`, `execute_detokenization` | — | ⚠️ **no auth** |
| `set_transfer_restriction`, `add_to_whitelist`, `remove_from_whitelist` | — | ⚠️ **no auth** |
| `get_token_balance`, `get_token_holders`, `is_tokens_locked`, `get_ownership_percentage`, `get_tokenized_asset`, `get_unclaimed_dividends`, `get_vote_tally`, `has_voted`, `proposal_passed`, `is_whitelisted`, `get_whitelist`, `get_detokenization_proposal`, `is_detokenization_active` | — | 📖 |

The `require_auth` for the ✅ rows lives in the `lib.rs` entrypoint wrapper, not
in the module function it delegates to. `tokenization.rs`, `dividends.rs`,
`voting.rs` and `detokenization.rs` contain no `require_auth` at all, so calling
one of those functions directly would bypass authorization. They are
`pub(crate)` and only reachable through the wrappers today, but that is a
property of the module layout rather than an enforced boundary.

The ⚠️ rows are **not fixed here.** They are real gaps, but each needs a
decision about *which* principal should be required — the token issuer, the
asset owner, or the admin — and that is a design question rather than an
oversight. They are listed so the next change starts from a list rather than a
search. None is an ownership-transfer path, which is why the four registry
entrypoints took priority.

---

## `contrib`

`contrib` was already the reference implementation for authorization in this
workspace: every acting address is authenticated.

| Entrypoint | Principal | |
|---|---|---|
| `initialize` | `admin` | ✅ (added here) |
| `register_asset` | `registrar` | ✅ |
| `transfer_asset` | `caller` | ✅ |
| `retire_asset` | `caller` | ✅ |
| `add_authorized_registrar` / `add_registrar` | `caller`, must be admin | ✅ |
| `remove_authorized_registrar` / `remove_registrar` | `caller`, must be admin | ✅ |
| `pause_contract`, `unpause_contract` | `caller`, must be admin | ✅ |
| `get_admin`, `get_asset`, `get_asset_info`, `get_assets_by_owner`, `get_total_count`, `get_total_asset_count`, `is_authorized_registrar`, `get_audit_logs`, `is_paused` | — | 📖 |

Only `initialize` was unguarded, and it is now authenticated.

> The escrow, KYC, staking, oracle, tokenization, detokenization and
> restrictions files in `contrib/src/` are **not declared as modules** and so
> are not compiled into the crate. They expose no entrypoints and are excluded
> from this audit.

---

## `multisig-wallet`

| Entrypoint | Principal | |
|---|---|---|
| `initialize` | `admin` | ✅ |
| `submit_transaction` | `initiator`, must be an owner | ✅ |
| `confirm_transaction` | `confirmer`, must be an owner | ✅ |
| `revoke_confirmation` | `revoker`, must be an owner | ✅ |
| `cancel_transaction` | `caller`, must be the initiator | ✅ |
| `propose_add_owner`, `propose_remove_owner`, `propose_change_threshold` | `proposer`, must be an owner | ✅ |
| `confirm_proposal` | `confirmer`, must be an owner | ✅ |
| `emergency_freeze`, `emergency_unfreeze` | `caller`, must be an owner | ✅ |
| `set_daily_limit` | `caller`, must be an owner | ✅ |
| `execute_transaction`, `execute_proposal` | — | 🔓 |
| `get_owners`, `get_threshold`, `get_transaction`, `is_frozen`, `get_required_confirmations`, `get_owner_profile`, `get_proposal` | — | 📖 |

`execute_transaction` and `execute_proposal` are permissionless **by design**.
The authorization decision was already made by the confirming owners; requiring
one of them to also submit the execution adds no security while adding liveness
risk. This is the one place where "anyone can call it" is the correct answer.

---

## `multisig-transfer`

### Fixed in this change

`multisig-transfer` had the **same gap as `assetsup`**, across every
entrypoint. Each compared a caller-supplied `caller` argument against the
stored admin, the asset's owner, or the approver set, and none authenticated
it — so approvals could be forged by naming an authorized approver, and
approval rules rewritten by naming the admin.

| Entrypoint | Principal | |
|---|---|---|
| `initialize` | `admin` | ✅ (added here) |
| `configure_approval_rule` | `caller`, must be admin | ✅ (added here) |
| `create_transfer_request` | `caller`, ownership checked against the registry | ✅ (added here) |
| `approve_transfer_request` | `caller`, must be an authorized approver | ✅ (added here) |
| `reject_transfer_request` | `caller`, must be an authorized approver | ✅ (added here) |
| `cancel_transfer_request` | `caller`, requester or admin | ✅ (added here) |
| `execute_transfer` | — | 🔓 |
| `get_request`, `get_asset_history`, `get_pending_transfers_approver`, `get_required_approvers_category` | — | 📖 |

`execute_transfer` is permissionless for the same reason as
`multisig-wallet`'s `execute_*`: the approvers already made the authorization
decision. It takes a `caller` argument for the audit trail, which is
deliberately not authenticated — a comment now says so, since an unused
authenticated-looking parameter is exactly what makes this class of bug hard to
spot.

---

## `asset-maintenance`

| Entrypoint | Principal | |
|---|---|---|
| `init` | `admin` | ✅ (added here) |
| `register_provider` | stored admin | ✅ |
| `deactivate_provider` | stored admin | ✅ |
| `add_maintenance_record` | `record.provider` | ✅ |
| `schedule_maintenance` | `owner` | ✅ |
| `update_maintenance_schedule` | `owner` | ✅ |
| `complete_scheduled_maintenance` | `record.provider`, via `add_maintenance_record` | ✅ |
| `acknowledge_maintenance_alert` | `by` | ✅ |
| `add_warranty_information` | stored admin | ✅ (added here) |
| `update_warranty_information` | stored admin | ✅ (added here) |
| `file_warranty_claim` | stored admin | ✅ (added here) |
| `create_maintenance_alert` | stored admin | ✅ (added here) |
| `get_maintenance_history`, `get_upcoming_maintenance`, `get_provider_details`, `get_warranty`, `get_alerts`, `calculate_total_maintenance_cost`, `calculate_asset_downtime`, `get_asset_health_score`, `get_asset_stats`, `is_maintenance_cost_excessive`, `get_overdue_maintenance` | — | 📖 |

Four entrypoints wrote warranty terms, filed claims, and raised alerts with **no
authorization at all** — anyone could forge the audit evidence this contract
exists to provide. They now require the stored admin.

Admin is used because these entrypoints take no caller argument, so the stored
admin is the only principal the contract can authenticate without an ABI change.
A finer-grained model — letting an asset owner manage their own warranty — needs
the asset-registry integration this contract does not have. `verify_asset_exists`
is currently a stub returning `true`.

### Authenticating by delegation

`update_maintenance_schedule` and `complete_scheduled_maintenance` do not call
`require_auth` directly; they delegate to `schedule_maintenance` and
`add_maintenance_record`, which do. The protection is real but easy to miss when
reading, and easy to break by refactoring the delegation away — which is why
both have their own negative test.

---

## Confused-deputy check

No contract calls `require_auth()` on its own address, and none passes its own
address where a caller's is expected. The one cross-contract call —
`multisig-transfer` invoking the registry to move ownership — is the intended
authority boundary: the multisig contract *is* the authorized party at that
point, having already collected the required approvals.

## What is not covered

- `require_auth_for_args` is not used anywhere. Authorization is currently
  per-entrypoint, not bound to specific amounts or recipients, so a signature
  authorizing a transfer does not pin *which* transfer. Binding auth to
  arguments on the value-carrying paths is worth a follow-up.
- The ⚠️ rows under `assetsup` tokenization remain open.
