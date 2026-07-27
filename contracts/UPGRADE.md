# Contract upgrade posture and runbook

What happens when a contract needs to change after it holds real data ([SC-49]).

## Posture per contract

| Contract | Posture | Entrypoint |
|---|---|---|
| `assetsup` | **Upgradeable** | `upgrade(new_wasm_hash)`, `migrate()` |
| `contrib` | Immutable — redeploy | — |
| `multisig-wallet` | Immutable — redeploy | — |
| `multisig-transfer` | Immutable — redeploy | — |
| `asset-maintenance` | Immutable — redeploy | — |

`assetsup` is upgradeable because it is the asset registry. Redeploying it
means a new contract id and either abandoning every ownership record or
manually re-importing them — the one dataset in this system you cannot
recreate.

The other four are left immutable **for now**, deliberately rather than by
omission. Each is either a workflow contract whose state can be rebuilt
(`multisig-transfer` requests, `asset-maintenance` records could be replayed
from events) or a wallet whose signers can simply move to a new deployment.
Immutability also means a compromised admin key cannot swap their code. Making
any of them upgradeable is a decision to take on its own, not a default.

## The trade

Upgradeability means **a compromised admin key can replace `assetsup` with
arbitrary code**, including code that reassigns every asset. That is a larger
blast radius than any other admin power in the system.

Mitigations in place:

- The upgrade entrypoint is admin-gated and emits an `upgraded` event, so a
  swap is observable on-chain.
- Admin transfer is two-step ([SC-48]), so the admin role cannot be moved to an
  address that never proves control.

Mitigation worth adding: hold the admin role in the `multisig-wallet` contract
rather than a single address, so an upgrade needs *m* signers. This is the
single highest-value change available to reduce that blast radius.

## Storage versioning

Replacing the WASM does **not** touch storage. The old bytes stay exactly where
they are and are decoded by the new code — which is precisely how upgrades lose
data, silently, when a stored type changed shape.

`assetsup` records the layout version its stored data conforms to:

- `upgrade::CURRENT_VERSION` — the layout **this build** expects.
- `DataKey::StorageVersion` — the layout **the stored data** currently uses.
- `migrate()` — advances the second to the first, applying each step in order.

`migrate()` is **idempotent**. Running it twice is a no-op, so a retried or
duplicated migration transaction cannot corrupt state — which matters because a
submission can fail ambiguously and you need to be able to just run it again.

Migrating from a version *newer* than this build is refused outright: the code
cannot know a layout that did not exist when it was compiled.

## Changing a stored type

Do all three in the same change, or the migration will be missing when it is
needed:

1. Bump `CURRENT_VERSION` in `assetsup/src/upgrade.rs`.
2. Add the arm to `migrate_from` transforming the previous version to the new
   one. It must be safe to skip when already past it.
3. Add a test that writes state in the old shape, migrates, and asserts it
   reads back correctly.

Adding a field with a sensible default usually needs no data rewrite — but the
version must still advance, so the next migration knows where it is starting
from.

## Runbook

Order matters: **upgrade, then migrate.** The migration code lives in the new
WASM, so it does not exist until the upgrade has landed.

### 1. Before

- [ ] `cargo test --all` passes on the new build.
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` is clean.
- [ ] If a stored type changed: `CURRENT_VERSION` is bumped, `migrate_from` has
      the new arm, and a test proves state survives.
- [ ] WASM size is within budget (`./scripts/check-wasm-size.sh`).
- [ ] Reviewed against the checklist in [`SECURITY.md`](SECURITY.md).
- [ ] Note the current admin address and confirm you can sign for it.

### 2. Record the pre-upgrade state

Capture enough to verify nothing was lost:

```sh
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- get_total_asset_count

stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- storage_version
```

Note the asset count and pick two or three specific asset ids to spot-check
afterwards.

### 3. Consider pausing

For an upgrade that changes a stored layout, pause first so no write lands
between the WASM swap and the migration:

```sh
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- pause_contract
```

`upgrade` and `migrate` both work while paused — deliberately, since an upgrade
is often how you fix the incident that caused the pause.

For an upgrade that only changes logic, pausing is unnecessary.

### 4. Upload and upgrade

```sh
cargo build --package assetsup --target wasm32-unknown-unknown --release
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/assetsup.wasm

WASM_HASH=$(stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/assetsup.optimized.wasm \
  --source-account "$ADMIN" --network "$NETWORK")

stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- upgrade --new_wasm_hash "$WASM_HASH"
```

The contract id does not change. Every consumer keeps working.

### 5. Migrate

```sh
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- migrate
```

Safe to re-run if the result is ambiguous.

### 6. Verify

```sh
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- storage_version      # expect the new CURRENT_VERSION

stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- get_total_asset_count   # expect the pre-upgrade count
```

Spot-check the asset ids noted in step 2 and confirm owner and status are
unchanged. Then unpause if you paused.

### 7. If it goes wrong

There is no automatic rollback. The recovery path is to upgrade *forward* to a
corrected build — which is why the previous WASM hash is worth keeping: it is
what you upgrade back to.

```sh
stellar contract invoke --id "$CONTRACT_ID" --source-account "$ADMIN" \
  --network "$NETWORK" -- upgrade --new_wasm_hash "$PREVIOUS_WASM_HASH"
```

A rollback does **not** undo a migration that already rewrote data. If a
migration is destructive, it needs a tested reverse migration before it is run
on a network holding real value — or it should not be destructive in the first
place.

## What the tests cover

`assetsup/src/tests/upgrade.rs` covers the admin gate on both entrypoints, the
version stamp at initialize, migration idempotency across repeated runs, that a
full registry including transferred and retired assets survives a migration,
and that a future version is refused.

The WASM swap itself is **not** unit-tested: the test environment registers
contracts natively rather than from uploaded WASM, so
`update_current_contract_wasm` cannot execute there. That step is verified by
this runbook on testnet before it is run anywhere else.
