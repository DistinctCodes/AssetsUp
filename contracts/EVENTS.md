# Contract event catalogue

Every event emitted by the AssetsUp contracts, for consumers of the backend
Soroban bridge.

## Convention

All events are **typed** `#[contractevent]` structs, introduced with the
`soroban-sdk` 23 upgrade. Each crate declares them in its own `events.rs`, which
is the only place events are published from.

The rules:

1. **Name.** The struct is named `<Subject><PastTenseVerb>` — `AssetRegistered`,
   `TransferExecuted`, `LeaseCancelled`. The SDK derives **topic 0** from the
   struct name in `lower_snake_case`, so `AssetRegistered` publishes under the
   topic `asset_registered`.
2. **Topics.** The identifier a consumer would filter on — an asset id, a
   request id, an owner address — is marked `#[topic]` and becomes topic 1.
   Events that are not about a single entity have no extra topic.
3. **Data.** Every remaining field goes into the data map, keyed by field name.
4. **Timestamp.** Events carry a `timestamp` field where the emitting entrypoint
   has one meaningful to record.

Because `#[contractevent]` types are emitted into the **contract spec**, clients
can generate bindings for them instead of hand-decoding positional tuples. This
is the main practical gain over the previous approach, where topics were an
inconsistent mix of `symbol_short!`, `Symbol::new`, and bare string tuples, and
payloads were untyped tuples whose shape had to be read out of the source.

### Reading events in tests

`env.events().all()` returns the events of the **most recent contract
invocation**, not every event since the test began. Two consequences worth
knowing before writing an event test:

- Comparing a count before and after a call does not work. Both readings see one
  invocation's worth of events, so the difference is meaningless.
- **Any** invocation resets the view, including a read-only entrypoint. Calling
  `client.get_threshold()` after the call under test will leave
  `events().all()` empty. Read the events first, assert, then make other calls.

Assert against the event you just triggered:

```rust
let events = env.events().all();
assert_eq!(events.len(), 1);

let (_contract, topics, _data) = events.last().unwrap();
let name: Symbol = topics.get(0).unwrap().try_into_val(&env).unwrap();
assert_eq!(name, Symbol::new(&env, "asset_registered"));
```

---

## `assetsup`

### Registry

| Event (topic 0) | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `contract_initialized` | `admin` | `timestamp` | `initialize` |
| `asset_registered` | `asset_id` | `owner`, `timestamp` | `register_asset` |
| `asset_updated` | `asset_id` | `caller`, `timestamp` | `update_asset_metadata` |
| `asset_transferred` | `asset_id` | `old_owner`, `new_owner`, `timestamp` | `transfer_asset_ownership` |
| `asset_retired` | `asset_id` | `caller`, `timestamp` | `retire_asset` |
| `admin_proposed` | `proposed_admin` | `current_admin`, `timestamp` | `propose_admin` |
| `admin_proposal_cancelled` | `proposed_admin` | `current_admin`, `timestamp` | `cancel_admin_proposal` |
| `admin_changed` | `new_admin` | `old_admin`, `timestamp` | `accept_admin` |
| `registrar_added` | `registrar` | `timestamp` | `add_authorized_registrar` |
| `registrar_removed` | `registrar` | `timestamp` | `remove_authorized_registrar` |
| `contract_paused` | `admin` | `timestamp` | `pause_contract` |
| `contract_unpaused` | `admin` | `timestamp` | `unpause_contract` |

### Tokenization

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `asset_tokenized` | `asset_id` | `total_supply`, `symbol`, `decimals`, `tokenizer` | `tokenize_asset` |
| `tokens_minted` | `asset_id` | `amount`, `total_supply` | `mint_tokens` |
| `tokens_burned` | `asset_id` | `amount`, `total_supply` | `burn_tokens` |
| `tokens_transferred` | `asset_id` | `from`, `to`, `amount` | `transfer_tokens` |
| `tokens_locked` | `asset_id` | `holder`, `until_timestamp` | `lock_tokens` |
| `tokens_unlocked` | `asset_id` | `holder`, `timestamp` | `unlock_tokens` |
| `valuation_updated` | `asset_id` | `new_valuation` | `update_valuation` |
| `asset_detokenized` | `asset_id` | `proposal_id`, `total_supply` | `execute_detokenization` |

### Dividends and voting

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `dividend_distributed` | `asset_id` | `total_amount`, `holder_count` | `distribute_dividends` |
| `dividend_claimed` | `asset_id` | `holder`, `amount` | `claim_dividends` |
| `vote_cast` | `asset_id` | `proposal_id`, `voter`, `voting_power` | `cast_vote` |

### Transfer restrictions

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `restriction_set` | `asset_id` | `require_accredited` | `set_transfer_restriction` |
| `whitelist_added` | `asset_id` | `address` | `add_to_whitelist` |
| `whitelist_removed` | `asset_id` | `address` | `remove_from_whitelist` |

### Leasing

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `lease_created` | `lease_id` | `asset_id`, `lessor`, `lessee`, `timestamp` | `create_lease` |
| `lease_returned` | `lease_id` | `caller`, `timestamp` | `return_leased_asset` |
| `lease_cancelled` | `lease_id` | `caller`, `timestamp` | `cancel_lease` |
| `lease_expired` | `lease_id` | `timestamp` | `expire_lease` |

---

## `contrib`

> Only the modules `contrib/src/lib.rs` declares are compiled: `audit`,
> `pause`, `types`, `insurance`, `lease`. The escrow, KYC, staking, oracle,
> tokenization, detokenization, and restrictions files exist in the crate
> directory but are **not part of the crate**, so they emit nothing. See the
> crate README.

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `contract_initialized` | `admin` | `timestamp` | `initialize` |
| `asset_registered` | `asset_id` | `owner`, `timestamp` | `register_asset` |
| `asset_transferred` | `asset_id` | `old_owner`, `new_owner`, `timestamp` | `transfer_asset` |
| `asset_retired` | `asset_id` | `caller`, `timestamp` | `retire_asset` |
| `registrar_added` | `registrar` | `caller`, `timestamp` | `add_authorized_registrar` |
| `registrar_removed` | `registrar` | `caller`, `timestamp` | `remove_authorized_registrar` |
| `contract_paused` | `caller` | `timestamp` | `pause_contract` |
| `contract_unpaused` | `caller` | `timestamp` | `unpause_contract` |
| `policy_created` | `policy_id` | `asset_id`, `insurer`, `holder`, `timestamp` | `create_policy` |
| `policy_cancelled` | `policy_id` | `caller`, `timestamp` | `cancel_policy` |
| `claim_submitted` | `claim_id` | `policy_id`, `claimant`, `amount`, `timestamp` | `submit_claim` |
| `claim_status_updated` | `claim_id` | `status`, `timestamp` | `update_claim_status` |
| `lease_created` | `lease_id` | `asset_id`, `lessor`, `lessee`, `timestamp` | `create_lease` |
| `lease_checked_in` | `lease_id` | `timestamp` | `check_in_lease` |
| `lease_cancelled` | `lease_id` | `caller`, `timestamp` | `cancel_lease` |

---

## `multisig-wallet`

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `wallet_initialized` | `admin` | `owners`, `threshold`, `timestamp` | `initialize` |
| `transaction_submitted` | `tx_id` | `initiator`, `tx_type`, `timestamp` | `submit_transaction` |
| `transaction_confirmed` | `tx_id` | `confirmer`, `confirmations_count`, `timestamp` | `confirm_transaction` |
| `confirmation_revoked` | `tx_id` | `revoker`, `timestamp` | `revoke_confirmation` |
| `transaction_executed` | `tx_id` | `initiator`, `timestamp` | `execute_transaction` |
| `transaction_cancelled` | `tx_id` | `caller`, `timestamp` | `cancel_transaction` |
| `proposal_submitted` | `proposal_id` | `proposer`, `proposal_type`, `timestamp` | `propose_add_owner`, `propose_remove_owner`, `propose_change_threshold` |
| `proposal_confirmed` | `proposal_id` | `confirmer`, `confirmations_count`, `timestamp` | `confirm_proposal` |
| `owner_added` | `owner` | `proposer`, `timestamp` | `execute_proposal` (AddOwner) |
| `owner_removed` | `owner` | `proposer`, `timestamp` | `execute_proposal` (RemoveOwner) |
| `threshold_changed` | — | `old_threshold`, `new_threshold`, `timestamp` | `execute_proposal` (ChangeThreshold) |
| `wallet_frozen` | `caller` | `timestamp` | `emergency_freeze` |
| `wallet_unfrozen` | `caller` | `timestamp` | `emergency_unfreeze` |
| `daily_limit_changed` | `caller` | `limit`, `timestamp` | `set_daily_limit` |
| `daily_limit_reached` | — | `limit`, `attempted_total`, `timestamp` | daily-limit check, before `DailyLimitExceeded` |

`daily_limit_reached` is emitted on a **rejected** operation, not a state change.
It is the one deliberate exception to "events mark state changes"; it exists so
operators can see limit pressure.

---

## `multisig-transfer`

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `contract_initialized` | `admin` | `asset_registry`, `timestamp` | `initialize` |
| `transfer_requested` | `request_id` | `asset_id`, `from_owner`, `to_owner`, `timestamp` | `create_transfer_request` |
| `transfer_approved` | `request_id` | `approver`, `approval_count`, `timestamp` | `approve_transfer_request` |
| `transfer_rejected` | `request_id` | `rejector`, `reason_hash`, `timestamp` | `reject_transfer_request` |
| `transfer_executed` | `request_id` | `asset_id`, `new_owner`, `timestamp` | `execute_transfer` |
| `transfer_cancelled` | `request_id` | `cancelled_by`, `timestamp` | `cancel_transfer_request` |
| `approval_rule_updated` | `category` | `required_approvals`, `timestamp` | `configure_approval_rule` |
| `approver_added` | `approver` | `added_by`, `timestamp` | *defined, not yet emitted* |
| `approver_removed` | `approver` | `removed_by`, `timestamp` | *defined, not yet emitted* |

`approver_added` and `approver_removed` are declared because the approver set is
part of the contract's model, but no entrypoint currently mutates it. They are
marked `#[allow(dead_code)]`.

---

## `asset-maintenance`

| Event | Topic 1 | Data | Emitted by |
|---|---|---|---|
| `contract_initialized` | `admin` | `registry`, `timestamp` | `init` |
| `provider_registered` | `provider` | `timestamp` | `register_provider` |
| `provider_deactivated` | `provider` | `timestamp` | `deactivate_provider` |
| `maintenance_recorded` | `asset_id` | `record_id`, `provider`, `timestamp` | `add_maintenance_record` |
| `maintenance_scheduled` | `asset_id` | `next_service_due`, `timestamp` | `schedule_maintenance` |
| `maintenance_schedule_updated` | `asset_id` | `next_service_due`, `timestamp` | `update_maintenance_schedule` |
| `maintenance_completed` | `asset_id` | `record_id`, `provider`, `timestamp` | `complete_scheduled_maintenance` |
| `warranty_added` | `asset_id` | `end_date`, `timestamp` | `add_warranty_information` |
| `warranty_updated` | `asset_id` | `end_date`, `timestamp` | `update_warranty_information` |
| `warranty_claim_filed` | `asset_id` | `claim_amount`, `timestamp` | `file_warranty_claim` |
| `alert_created` | `asset_id` | `alert_type`, `severity`, `timestamp` | `create_maintenance_alert` |
| `alert_acknowledged` | `asset_id` | `alert_index`, `acknowledged_by`, `timestamp` | `acknowledge_maintenance_alert` |

Previously `add_warranty_information` and `schedule_maintenance` were shared by
both the create and update entrypoints, so an update was indistinguishable from
a create off-chain. Persistence is now factored into private helpers so each
entrypoint emits its own event.

---

## Coverage

Every state-changing entrypoint in every compiled module emits an event. The
following were **silent before** this catalogue existed and now emit:

| Contract | Entrypoint |
|---|---|
| `assetsup` | `initialize`, `add_authorized_registrar`, `remove_authorized_registrar` |
| `contrib` | `initialize`, `add_authorized_registrar`, `remove_authorized_registrar` |
| `multisig-wallet` | `initialize`, `propose_*`, `confirm_proposal`, `set_daily_limit` |
| `multisig-transfer` | `initialize` |
| `asset-maintenance` | `init`, `register_provider`, `deactivate_provider`, `update_maintenance_schedule`, `update_warranty_information`, `acknowledge_maintenance_alert` |
