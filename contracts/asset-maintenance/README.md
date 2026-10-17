# `asset-maintenance`

Records asset maintenance history, schedules, warranties, service providers,
and alerts on-chain. The maintenance history is intended as **audit evidence**:
records are appended, never rewritten.

Contract type: `AssetMaintenanceContract`. Deployable (`crate-type = ["cdylib"]`).

Assets are referenced by `u64` id. This contract stores an `AssetRegistry`
address at init but does not currently call into it to validate that an asset
exists.

## Invariants

- Maintenance history is append-only: `add_maintenance_record` pushes onto
  `MaintenanceHistory(asset_id)` and no entrypoint removes or rewrites an
  existing record.
- `AssetStats(asset_id)` is a derived rollup (total cost, downtime, service
  count, health score) maintained alongside the history.
- A health score is expressed on a 1–100 scale.
- Persistent entries carry a 30-day / 90-day TTL policy (see
  [`src/ttl.rs`](src/ttl.rs)): every read and write bumps the entry back out so
  a long-lived asset's history is not archived for being untouched.

## Authorization model

The contract has a single privileged principal and one delegated role.

- **Admin.** Stored at `init`; the stored address must authenticate for every
  registry-level mutation: `register_provider`, `deactivate_provider`,
  `add_warranty_information`, `update_warranty_information`,
  `file_warranty_claim`, and `create_maintenance_alert` all call the internal
  `require_admin` helper, which loads `DataKey::Admin` and calls
  `require_auth()` on it. `init` itself requires the *incoming* admin's
  authorization.
- **Service providers.** The only role that may *log maintenance*. A record is
  accepted only when (a) the `provider` named in the record authenticated the
  call, and (b) that address is a registered `ProviderProfile` with
  `is_active == true`. A field technician therefore does not need a separate
  on-chain role: the provider they work for is the accountable principal, and
  `technician_id` is carried inside the record as audit data.
- **Callers (`owner`) of the schedule entrypoints.** `schedule_maintenance`,
  `update_maintenance_schedule`, and `cancel_scheduled_maintenance` take an
  explicit `owner` argument and call `require_auth()` on it. Ownership is **not**
  cross-checked against an asset registry; this contract does not call the
  `AssetRegistry` address it stores.

`get_*` entrypoints and the analytics functions are read-only and unguarded.

## Storage layout

All entries use **persistent** storage with the TTL policy described above.

| Key | Type | Meaning |
|---|---|---|
| `Admin` | `Address` | Contract administrator. |
| `AssetRegistry` | `Address` | Address of the asset registry contract. |
| `Provider(Address)` | `ProviderProfile` | Registered maintenance provider. |
| `MaintenanceHistory(u64)` | `Vec<MaintenanceRecord>` | Append-only service history for an asset. |
| `MaintenanceSchedule(u64)` | `ScheduledMaintenance` | Upcoming scheduled service. |
| `Warranty(u64)` | `WarrantyInfo` | Warranty terms and status. |
| `Alerts(u64)` | `Vec<MaintenanceAlert>` | Alerts raised against an asset. |
| `AssetStats(u64)` | `AssetStats` | Derived cost/downtime/health rollup. |

## Entrypoints

`Auth` names the address whose `require_auth()` is called — see
[Authorization model](#authorization-model). Read-only `get_*` entrypoints and
the analytics functions perform no authorization. No mutating entrypoint is
unguarded.

### Setup and providers

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `init` | `admin, registry` | `()` | — (none) |
| `register_provider` | `provider: ProviderProfile` | `()` | stored `admin` |
| `deactivate_provider` | `provider_address` | `()` | stored `admin` |
| `get_provider_details` | `provider_address` | `Option<ProviderProfile>` | read-only |

### Maintenance records

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `add_maintenance_record` | `record: MaintenanceRecord` | `()` | `record.provider` |
| `get_maintenance_history` | `asset_id` | `Vec<MaintenanceRecord>` | read-only |
| `schedule_maintenance` | `owner, schedule` | `()` | `owner` |
| `update_maintenance_schedule` | `owner, schedule` | `()` | `owner` (via `schedule_maintenance`) |
| `cancel_scheduled_maintenance` | `owner, asset_id` | `()` | `owner` |
| `complete_scheduled_maintenance` | `asset_id, record` | `()` | `record.provider` (via `add_maintenance_record`) |
| `get_upcoming_maintenance` | `asset_id` | `Option<ScheduledMaintenance>` | read-only |
| `get_overdue_maintenance` | `asset_id` | `bool` | read-only |

`update_maintenance_schedule` and `complete_scheduled_maintenance` authenticate
indirectly: they delegate to `schedule_maintenance` and
`add_maintenance_record` respectively, which call `require_auth()`. The
protection is real but easy to miss, and easy to break by refactoring the
delegation away.

### Warranties

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `add_warranty_information` | `warranty: WarrantyInfo` | `()` | stored `admin` |
| `update_warranty_information` | `warranty: WarrantyInfo` | `()` | stored `admin` |
| `get_warranty` | `asset_id` | `Option<WarrantyInfo>` | read-only |
| `file_warranty_claim` | `asset_id, claim_amount` | `()` | stored `admin` |

### Alerts

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `create_maintenance_alert` | `alert: MaintenanceAlert` | `()` | stored `admin` |
| `acknowledge_maintenance_alert` | `asset_id, alert_index, by` | `()` | `by` |
| `get_alerts` | `asset_id` | `Vec<MaintenanceAlert>` | read-only |

### Analytics (all read-only)

`calculate_total_maintenance_cost`, `calculate_asset_downtime`,
`get_asset_health_score`, `get_asset_stats`, `is_maintenance_cost_excessive`.

## Events

Typed `#[contractevent]` structs emitted via [`src/events.rs`](src/events.rs);
topic 0 is the struct name in `lower_snake_case`, and `asset_id` (or the
subject address) is topic 1. See `contracts/EVENTS.md` for the workspace
convention.

| Event (topic 0) | Emitted by |
|---|---|
| `contract_initialized` | `init` |
| `provider_registered` | `register_provider` |
| `provider_deactivated` | `deactivate_provider` |
| `maintenance_recorded` | `add_maintenance_record` |
| `maintenance_scheduled` | `schedule_maintenance` |
| `maintenance_schedule_updated` | `update_maintenance_schedule` |
| `maintenance_schedule_cancelled` | `cancel_scheduled_maintenance` |
| `maintenance_completed` | `complete_scheduled_maintenance` |
| `warranty_added` | `add_warranty_information` |
| `warranty_updated` | `update_warranty_information` |
| `warranty_claim_filed` | `file_warranty_claim` |
| `alert_created` | `create_maintenance_alert` |
| `alert_acknowledged` | `acknowledge_maintenance_alert` |

Every state-changing entrypoint emits exactly one event. Cancelling a schedule
sits alongside completing one: both remove the schedule, but only a completion
appends to the append-only history.

## Errors

Typed `#[contracterror]` in [`src/error.rs`](src/error.rs). Codes follow the
workspace allocation in `contracts/ERRORS.md`: **1–99** are shared across every
contract, **500–599** belong to `asset-maintenance` (`ProviderNotRegistered`,
`ProviderInactive`, `ScheduleNotFound`, `WarrantyNotFound`, `WarrantyNotActive`,
`WarrantyExpired`, `MaxClaimsReached`, `AlertIndexOutOfBounds`, `AssetNotFound`,
`InvalidArguments`).

Validation failures raised by the historical `panic!("...")` calls still trap
with a `&str` message; converting the remainder to typed codes is tracked in
SC-45.

## Types

`MaintenanceType` (Preventive, Corrective, Emergency, Inspection, Upgrade,
Calibration), `AlertType`, `AlertSeverity`, `WarrantyStatus`, `PriorityLevel`,
`MaintenanceRecord`, `ScheduledMaintenance`, `WarrantyInfo`, `ProviderProfile`,
`MaintenanceAlert`, `AssetStats`.

## Worked example

```rust
use soroban_sdk::{testutils::Address as _, Address, Env, String};

let env = Env::default();
env.mock_all_auths();

let contract_id = env.register(AssetMaintenanceContract, ());
let client = AssetMaintenanceContractClient::new(&env, &contract_id);

let admin = Address::generate(&env);
let registry = Address::generate(&env);
let provider = Address::generate(&env);

client.init(&admin, &registry);

// The provider records a completed service against asset 1.
let record = MaintenanceRecord {
    record_id: 1,
    asset_id: 1,
    maintenance_type: MaintenanceType::Preventive,
    provider: provider.clone(),
    technician_id: String::from_str(&env, "tech-01"),
    service_date: 1_000,
    duration_hours: 3,
    // ... remaining fields
};
client.add_maintenance_record(&record);

let history = client.get_maintenance_history(&1);
assert_eq!(history.len(), 1);
```

## Tests

```sh
cargo test -p asset-maintenance
```

`test.rs` and `tests_coverage.rs` cover the entrypoints with example-based
tests; `proptests.rs` adds property-based tests over maintenance cost and
date-range inputs (balancing costs accepted, unbalanced or out-of-range values
rejected).
