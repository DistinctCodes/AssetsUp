# AssetsUp — Contract Events Reference

This document describes every event emitted by both Soroban contracts. The backend indexer (BE-64) subscribes to these events via the Soroban RPC `getEvents` method to keep its PostgreSQL read-model in sync without querying contract storage on every request.

---

## Subscribing to Events (Node.js)

```typescript
// backend/src/stellar/event-indexer.ts
import { SorobanRpc } from "@stellar/stellar-sdk";

const server = new SorobanRpc.Server(process.env.STELLAR_RPC_URL!);

async function pollEvents(startLedger: number) {
  const response = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [
          process.env.ASSETSUP_CONTRACT_ID!,
          process.env.MULTISIG_TRANSFER_CONTRACT_ID!,
        ],
      },
    ],
    limit: 200,
  });

  for (const event of response.events) {
    const [contractId, eventName] = event.topic.map(t =>
      // topic[0] is always the contract ID symbol, topic[1] is the event name
      t.value().toString()
    );
    await handleEvent(contractId, eventName, event.value, event.ledger);
  }

  return response.latestLedger;
}

async function handleEvent(
  contractId: string,
  name: string,
  data: unknown,
  ledger: number
) {
  switch (name) {
    case "asset_created":     return onAssetCreated(data, ledger);
    case "asset_updated":     return onAssetUpdated(data, ledger);
    case "asset_deleted":     return onAssetDeleted(data, ledger);
    case "proposal_created":  return onProposalCreated(data, ledger);
    case "proposal_signed":   return onProposalSigned(data, ledger);
    case "transfer_executed": return onTransferExecuted(data, ledger);
    case "proposal_cancelled":return onProposalCancelled(data, ledger);
    default:
      console.warn(`Unknown event: ${name} from ${contractId}`);
  }
}
```

---

## `assetsup` Contract Events

### `asset_created`

Emitted when a new asset is stored for the first time.

**Topics:** `["asset_created"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `id` | `String` | `string` | The newly created asset ID |
| `name` | `String` | `string` | Asset name |
| `category` | `String` | `string` | Asset category |
| `department_id` | `String` | `string` | Owning department |
| `assigned_user_id` | `Address` | `string` | Initial user assignment |
| `status` | `Symbol` | `string` | Initial status (e.g. `"Active"`) |
| `created_by` | `Address` | `string` | Admin who created the record |
| `ledger_timestamp` | `u64` | `bigint` | On-chain creation time (seconds) |

**Trigger:** `create_asset()` success.

**Backend action:** Insert a new row in the `assets` table.

```typescript
async function onAssetCreated(data: unknown, ledger: number) {
  const { id, name, category, department_id, assigned_user_id, status, created_by } =
    data as Record<string, unknown>;

  await db.asset.upsert({
    where: { id: String(id) },
    create: {
      id: String(id), name: String(name), category: String(category),
      departmentId: String(department_id),
      assignedUserId: String(assigned_user_id),
      status: String(status), createdBy: String(created_by),
      syncedAtLedger: ledger,
    },
    update: {},
  });
}
```

---

### `asset_updated`

Emitted after any field on an asset is changed.

**Topics:** `["asset_updated"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `id` | `String` | `string` | Asset ID |
| `updated_fields` | `Vec<Symbol>` | `string[]` | Names of fields that changed |
| `updated_by` | `Address` | `string` | Admin who made the change |
| `ledger_timestamp` | `u64` | `bigint` | Time of update |

**Trigger:** `update_asset()` success.

**Backend action:** Fetch the full asset record from the contract (or use the diff) and update the DB row. Because only changed field names are emitted (not their new values), the indexer should re-fetch the record via `get_asset()` for a full sync:

```typescript
async function onAssetUpdated(data: unknown, ledger: number) {
  const { id } = data as Record<string, unknown>;
  // Re-fetch from contract to get all current values
  const asset = await assetsUpClient.getAsset(String(id));
  await db.asset.update({ where: { id: String(id) }, data: { ...mapAsset(asset), syncedAtLedger: ledger } });
}
```

---

### `asset_deleted`

Emitted when an asset is removed from contract storage.

**Topics:** `["asset_deleted"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `id` | `String` | `string` | Deleted asset ID |
| `deleted_by` | `Address` | `string` | Admin who deleted it |
| `ledger_timestamp` | `u64` | `bigint` | Time of deletion |

**Trigger:** `delete_asset()` success.

**Backend action:** Soft-delete or hard-delete the `assets` table row.

---

### `contract_upgraded` (assetsup)

Emitted after a successful WASM upgrade.

**Topics:** `["contract_upgraded"]`

**Data fields:**

| Field | Soroban type | TypeScript type |
|---|---|---|
| `new_wasm_hash` | `BytesN<32>` | `Buffer` (hex string) |
| `upgraded_by` | `Address` | `string` |
| `ledger_timestamp` | `u64` | `bigint` |

**Backend action:** Log the upgrade event. No DB model change required.

---

## `multisig_transfer` Contract Events

### `proposal_created`

Emitted when a new transfer proposal is opened.

**Topics:** `["proposal_created"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `id` | `String` | `string` | New proposal ID |
| `asset_id` | `String` | `string` | The asset involved |
| `from_user` | `Address` | `string` | Current asset holder |
| `to_user` | `Address` | `string` | Proposed recipient |
| `required_signatures` | `u32` | `number` | Threshold |
| `signers` | `Vec<Address>` | `string[]` | All required signers |
| `expires_at` | `u64` | `bigint` | Unix expiry timestamp |
| `proposed_by` | `Address` | `string` | Caller who opened the proposal |
| `ledger_timestamp` | `u64` | `bigint` | |

**Trigger:** `create_proposal()` success.

**Backend action:** Insert a row in the `transfer_proposals` table and send notifications to each signer.

```typescript
async function onProposalCreated(data: unknown, ledger: number) {
  const d = data as Record<string, unknown>;
  await db.transferProposal.create({
    data: {
      id: String(d.id),
      assetId: String(d.asset_id),
      fromUser: String(d.from_user),
      toUser: String(d.to_user),
      requiredSignatures: Number(d.required_signatures),
      signers: (d.signers as string[]),
      expiresAt: new Date(Number(BigInt(String(d.expires_at))) * 1000),
      status: "Pending",
      syncedAtLedger: ledger,
    },
  });
  // Notify signers via websocket / push
  await notifySigners(d.signers as string[], String(d.id));
}
```

---

### `proposal_signed`

Emitted each time a signer casts their vote (approve or reject).

**Topics:** `["proposal_signed"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `proposal_id` | `String` | `string` | |
| `signer` | `Address` | `string` | Who voted |
| `decision` | `Symbol` | `"Approve" \| "Reject"` | The vote |
| `signatures_collected` | `u32` | `number` | Running count of approvals so far |
| `required_signatures` | `u32` | `number` | Threshold |
| `new_status` | `Symbol` | `string` | `"Pending"` or `"Approved"` |
| `ledger_timestamp` | `u64` | `bigint` | |

**Trigger:** `sign_proposal()` success.

**Backend action:** Update the signer entry in DB. If `new_status == "Approved"`, mark the proposal as approved and optionally notify the initiator.

```typescript
async function onProposalSigned(data: unknown, ledger: number) {
  const d = data as Record<string, unknown>;
  await db.transferProposal.update({
    where: { id: String(d.proposal_id) },
    data: {
      status: String(d.new_status),
      syncedAtLedger: ledger,
    },
  });
  await db.proposalSignature.upsert({
    where: { proposalId_signer: { proposalId: String(d.proposal_id), signer: String(d.signer) } },
    create: { proposalId: String(d.proposal_id), signer: String(d.signer), decision: String(d.decision) },
    update: { decision: String(d.decision) },
  });
}
```

---

### `transfer_executed`

Emitted when a fully-approved proposal is executed, finalising the asset ownership change.

**Topics:** `["transfer_executed"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `proposal_id` | `String` | `string` | |
| `asset_id` | `String` | `string` | |
| `from_user` | `Address` | `string` | Previous owner |
| `to_user` | `Address` | `string` | New owner |
| `executed_by` | `Address` | `string` | Caller of `execute_transfer` |
| `ledger_timestamp` | `u64` | `bigint` | |

**Trigger:** `execute_transfer()` success.

**Backend action:** Update the proposal status to `Executed` AND update `assets.assigned_user_id` to `to_user`. This is the critical event that keeps the backend's asset table in sync after a transfer.

```typescript
async function onTransferExecuted(data: unknown, ledger: number) {
  const d = data as Record<string, unknown>;
  await db.$transaction([
    db.transferProposal.update({
      where: { id: String(d.proposal_id) },
      data: { status: "Executed", executedAt: new Date(), syncedAtLedger: ledger },
    }),
    db.asset.update({
      where: { id: String(d.asset_id) },
      data: { assignedUserId: String(d.to_user), syncedAtLedger: ledger },
    }),
  ]);
}
```

---

### `proposal_cancelled`

Emitted when an admin cancels a pending proposal.

**Topics:** `["proposal_cancelled"]`

**Data fields:**

| Field | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `proposal_id` | `String` | `string` | |
| `cancelled_by` | `Address` | `string` | Admin who cancelled |
| `ledger_timestamp` | `u64` | `bigint` | |

**Trigger:** `cancel_proposal()` success.

**Backend action:** Update proposal status to `Rejected` in the DB.

---

### `contract_upgraded` (multisig_transfer)

Same structure as the `assetsup` `contract_upgraded` event above.

---

## Event Index by Contract

### assetsup

| Event name | Trigger function | DB impact |
|---|---|---|
| `asset_created` | `create_asset` | INSERT assets |
| `asset_updated` | `update_asset` | UPDATE assets |
| `asset_deleted` | `delete_asset` | DELETE / soft-delete assets |
| `contract_upgraded` | `upgrade` | Log only |

### multisig_transfer

| Event name | Trigger function | DB impact |
|---|---|---|
| `proposal_created` | `create_proposal` | INSERT transfer_proposals |
| `proposal_signed` | `sign_proposal` | UPDATE transfer_proposals + INSERT proposal_signatures |
| `transfer_executed` | `execute_transfer` | UPDATE transfer_proposals + UPDATE assets |
| `proposal_cancelled` | `cancel_proposal` | UPDATE transfer_proposals |
| `contract_upgraded` | `upgrade` | Log only |