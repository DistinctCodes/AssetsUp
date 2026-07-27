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

## Storage layout

All entries use **instance** storage.

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

`Auth` names the address whose `require_auth()` is called. **"— (none)" marks an
entrypoint that performs no authorization at all**; these are unguarded and are
tracked in [SC-42].

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
| `add_warranty_information` | `warranty: WarrantyInfo` | `()` | — (none) |
| `update_warranty_information` | `warranty: WarrantyInfo` | `()` | — (none) |
| `get_warranty` | `asset_id` | `Option<WarrantyInfo>` | read-only |
| `file_warranty_claim` | `asset_id, claim_amount` | `()` | — (none) |

### Alerts

| Entrypoint | Args | Returns | Auth |
|---|---|---|---|
| `create_maintenance_alert` | `alert: MaintenanceAlert` | `()` | — (none) |
| `acknowledge_maintenance_alert` | `asset_id, alert_index, by` | `()` | `by` |
| `get_alerts` | `asset_id` | `Vec<MaintenanceAlert>` | read-only |

### Analytics (all read-only)

`calculate_total_maintenance_cost`, `calculate_asset_downtime`,
`get_asset_health_score`, `get_asset_stats`, `is_maintenance_cost_excessive`.

## Events

| Topics | Emitted by |
|---|---|
| `("MaintRec", asset_id)` | `add_maintenance_record` |
| `("MaintSch", asset_id)` | `schedule_maintenance` |
| `("MaintCmp", asset_id)` | `complete_scheduled_maintenance` |
| `("WarrAdd", asset_id)` | `add_warranty_information` |
| `("WarrClm", asset_id)` | `file_warranty_claim` |
| `("AlertCr", asset_id)` | `create_maintenance_alert` |

These topics use `CamelCase`, unlike the `snake_case` used elsewhere in the
workspace — see [SC-36]. `init`, `register_provider`, `deactivate_provider`,
`update_maintenance_schedule`, `update_warranty_information`, and
`acknowledge_maintenance_alert` emit no event.

## Errors

This crate has **no error enum**. Failures are raised with `panic!` on a
`&str` message rather than a typed `contracterror`, so callers cannot
distinguish failure modes by code. Unifying this with the rest of the workspace
is tracked in [SC-45].

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

Coverage is currently thin (4 tests for ~730 lines); expanding it is tracked in
[SC-41].
