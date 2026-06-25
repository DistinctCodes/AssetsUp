# AssetsUp — Contract Interface Reference

This document is the **contract between Soroban developers and the NestJS backend team (BE-60 – BE-64)**. It specifies every public function of both deployed contracts, their argument types in both Soroban XDR and TypeScript, and Node.js code examples using `@stellar/stellar-sdk v14.5.0`.

---

## Contents

1. [XDR ↔ TypeScript Type Map](#xdr--typescript-type-map)
2. [Setup](#setup)
3. [`assetsup` Contract](#assetsup-contract)
4. [`multisig_transfer` Contract](#multisig_transfer-contract)
5. [Error Handling](#error-handling)

---

## XDR ↔ TypeScript Type Map

| Soroban / XDR Type | TypeScript equivalent | Notes |
|---|---|---|
| `Address` | `string` | G… public key or C… contract ID |
| `String` | `string` | UTF-8, arbitrary length |
| `Symbol` | `string` | ≤ 32 chars, used as enum discriminant |
| `bool` | `boolean` | |
| `u32` | `number` | Fits safely in JS `number` |
| `i32` | `number` | |
| `u64` | `bigint` | Use `BigInt()` literals |
| `i64` | `bigint` | |
| `u128` | `bigint` | |
| `i128` | `bigint` | Financial amounts (stroops) |
| `BytesN<32>` | `Buffer` | Fixed 32-byte array (WASM hash) |
| `Option<T>` | `T \| null` | |
| `Vec<T>` | `T[]` | |
| `Map<K, V>` | `Map<K, V>` | |

---

## Setup

```bash
# Install the SDK (already in backend/package.json)
npm install @stellar/stellar-sdk@14.5.0

# Load contract IDs from the env file written by the deploy scripts
source contracts/.env.testnet   # or .env.mainnet
```

```typescript
// backend/src/stellar/soroban.config.ts
import { Networks } from "@stellar/stellar-sdk";
import { AssetsUpClient } from "../../contracts/types/assetsup";
import { MultisigTransferClient } from "../../contracts/types/multisig_transfer";

const RPC_URL = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const PASSPHRASE = process.env.STELLAR_NETWORK === "mainnet"
  ? Networks.PUBLIC
  : Networks.TESTNET;

export const assetsUpClient = new AssetsUpClient({
  contractId: process.env.ASSETSUP_CONTRACT_ID!,
  rpcUrl: RPC_URL,
  networkPassphrase: PASSPHRASE,
});

export const multisigClient = new MultisigTransferClient({
  contractId: process.env.MULTISIG_TRANSFER_CONTRACT_ID!,
  rpcUrl: RPC_URL,
  networkPassphrase: PASSPHRASE,
});
```

---

## `assetsup` Contract

**Contract source:** `contracts/assetsup/`  
**Contract ID env var:** `ASSETSUP_CONTRACT_ID`

### `initialize`

One-time setup. Must be called immediately after first deployment.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `admin` | `Address` | `string` | G… address that will be the contract admin |

**Return type:** `()` (void)  
**Access:** Anyone — but only succeeds once. Fails with `AlreadyInitialized` on repeat calls.  
**When to call:** Called automatically by `deploy-testnet.sh` / `deploy-mainnet.sh`. The backend never calls this.

---

### `get_asset`

Fetch a single asset record by its ID.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `id` | `String` | `string` | Asset identifier |

**Return type:** `Asset` struct (see `contracts/types/assetsup.ts`)  
**Access:** Public — no auth required.  
**Errors:** `AssetNotFound (4)`

```typescript
// Node.js example
import { assetsUpClient } from "./soroban.config";

const asset = await assetsUpClient.getAsset("asset-001");
console.log(asset.name, asset.status);
```

---

### `list_assets`

Paginated list of all assets.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `page` | `u32` | `number` | Zero-based page index |
| `page_size` | `u32` | `number` | Records per page (max 100) |

**Return type:** `AssetPage { items: Asset[], total: u32 }`  
**Access:** Public.

```typescript
// Node.js example
const { items, total } = await assetsUpClient.listAssets(0, 20);
console.log(`Showing ${items.length} of ${total} assets`);
```

---

### `get_assets_by_user`

All assets currently assigned to a user.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `user` | `Address` | `string` | User's Stellar public key |

**Return type:** `Vec<Asset>`  
**Access:** Public.

```typescript
const assets = await assetsUpClient.getAssetsByUser("GABC...XYZ");
```

---

### `get_assets_by_department`

All assets belonging to a department.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `department_id` | `String` | `string` | Department identifier |

**Return type:** `Vec<Asset>`  
**Access:** Public.

---

### `get_admin`

Return the current admin address.

**Parameters:** none  
**Return type:** `Address` → `string`  
**Access:** Public.

---

### `create_asset`

Create a new asset record in contract storage.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `caller` | `Address` | `string` | Must match the contract admin |
| `payload` | `CreateAssetPayload` | `CreateAssetPayload` | See struct below |

**`CreateAssetPayload` fields:**

| Field | Soroban type | TypeScript type |
|---|---|---|
| `name` | `String` | `string` |
| `category` | `String` | `string` |
| `serial_number` | `String` | `string` |
| `description` | `Option<String>` | `string \| null` |
| `department_id` | `String` | `string` |
| `location_id` | `String` | `string` |
| `assigned_user_id` | `Address` | `string` |
| `purchase_date` | `String` | `string` (ISO-8601) |
| `purchase_value` | `i128` | `bigint` (stroops) |
| `condition` | `Symbol` | `AssetCondition` enum |
| `status` | `Symbol` | `AssetStatus` enum |

**Return type:** `String` (the new asset ID)  
**Access:** Admin only. Soroban `require_auth()` is called on `caller`.  
**Errors:** `Unauthorized (3)`, `AssetAlreadyExists (5)`, `InvalidInput (6)`

```typescript
// Node.js example — full write flow
import { Keypair, SorobanRpc } from "@stellar/stellar-sdk";
import { assetsUpClient } from "./soroban.config";
import { AssetCondition, AssetStatus } from "../../contracts/types/assetsup";

const adminKeypair = Keypair.fromSecret(process.env.ADMIN_SECRET!);
const server = new SorobanRpc.Server(process.env.STELLAR_RPC_URL!);

// 1. Fetch source account
const sourceAccount = await server.getAccount(adminKeypair.publicKey());

// 2. Build the transaction
const txBuilder = await assetsUpClient.buildCreateAsset(
  adminKeypair.publicKey(),
  {
    name: "MacBook Pro 16\"",
    category: "IT Equipment",
    serial_number: "C02XG0JXJGH5",
    description: "Assigned to engineering team",
    department_id: "dept-engineering",
    location_id: "loc-hq-floor2",
    assigned_user_id: "GSTAFF...",
    purchase_date: "2024-01-15",
    purchase_value: BigInt(2500 * 1e7),  // 2500 XLM in stroops
    condition: AssetCondition.New,
    status: AssetStatus.Active,
  },
  sourceAccount
);

// 3. Sign and submit
const tx = txBuilder.build();
await server.prepareTransaction(tx);  // sets resource fees
tx.sign(adminKeypair);
const result = await server.sendTransaction(tx);
console.log("Asset created, tx hash:", result.hash);
```

---

### `update_asset`

Update fields on an existing asset.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `caller` | `Address` | `string` | Admin address |
| `id` | `String` | `string` | Asset to update |
| `payload` | `UpdateAssetPayload` | `UpdateAssetPayload` | Partial — only provided fields are changed |

**Return type:** Updated `Asset` struct  
**Access:** Admin only.  
**Errors:** `Unauthorized (3)`, `AssetNotFound (4)`

```typescript
const txBuilder = await assetsUpClient.buildUpdateAsset(
  adminKeypair.publicKey(),
  "asset-001",
  { status: AssetStatus.UnderMaintenance, condition: AssetCondition.Fair },
  sourceAccount
);
```

---

### `delete_asset`

Remove an asset from contract storage.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `caller` | `Address` | `string` | Admin address |
| `id` | `String` | `string` | Asset to delete |

**Return type:** `bool` (`true` on success)  
**Access:** Admin only.  
**Errors:** `Unauthorized (3)`, `AssetNotFound (4)`

---

### `upgrade`

Replace the contract's WASM with a new version. Used by `upgrade-contract.sh`.

| Parameter | Soroban type | TypeScript type | Description |
|---|---|---|---|
| `new_wasm_hash` | `BytesN<32>` | `Buffer` | Hash of the uploaded WASM |

**Return type:** `()` (void)  
**Access:** Admin only.  
**When to call:** Only via `contracts/scripts/upgrade-contract.sh`. Never called from the application layer.

---

## `multisig_transfer` Contract

**Contract source:** `contracts/multisig_transfer/`  
**Contract ID env var:** `MULTISIG_TRANSFER_CONTRACT_ID`

### `initialize`

One-time setup.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `admin` | `Address` | `string` |

**Return type:** `()` — Called by the deploy scripts only.

---

### `get_proposal`

Fetch a single transfer proposal.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `id` | `String` | `string` |

**Return type:** `TransferProposal` (see `contracts/types/multisig_transfer.ts`)  
**Access:** Public.  
**Errors:** `ProposalNotFound (4)`

```typescript
const proposal = await multisigClient.getProposal("proposal-001");
console.log(proposal.status, proposal.signers);
```

---

### `list_proposals_by_asset`

All proposals (in any state) for a given asset.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `asset_id` | `String` | `string` |

**Return type:** `Vec<TransferProposal>`  
**Access:** Public.

---

### `list_proposals_for_signer`

All pending proposals where the given user is a required signer.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `signer` | `Address` | `string` |

**Return type:** `Vec<TransferProposal>`  
**Access:** Public. Useful for building a "my approvals" inbox in the UI.

```typescript
const pending = await multisigClient.listProposalsForSigner("GSIGNER...");
```

---

### `get_proposal_stats`

Aggregate statistics (total, pending, approved, executed, rejected counts).

**Parameters:** none  
**Return type:** `ProposalStats`  
**Access:** Public.

---

### `has_signed`

Check whether a specific address has already signed a proposal.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `proposal_id` | `String` | `string` |
| `signer` | `Address` | `string` |

**Return type:** `bool`  
**Access:** Public.

---

### `create_proposal`

Propose an asset transfer that requires multi-party approval.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `caller` | `Address` | `string` |
| `payload` | `CreateTransferPayload` | See struct below |

**`CreateTransferPayload` fields:**

| Field | Soroban type | TypeScript type | Notes |
|---|---|---|---|
| `asset_id` | `String` | `string` | Must exist in `assetsup` contract |
| `from_user` | `Address` | `string` | Current holder |
| `to_user` | `Address` | `string` | Recipient |
| `notes` | `Option<String>` | `string \| null` | |
| `required_signatures` | `u32` | `number` | Must be ≤ `signers.length` |
| `signers` | `Vec<Address>` | `string[]` | |
| `expires_at` | `u64` | `bigint` | Unix timestamp (seconds) |

**Return type:** `String` (new proposal ID)  
**Access:** Admin or the current `from_user` of the asset.  
**Errors:** `Unauthorized (3)`, `InvalidInput (11)`

```typescript
// Node.js example
const txBuilder = await multisigClient.buildCreateProposal(
  adminKeypair.publicKey(),
  {
    asset_id: "asset-001",
    from_user: "GCURRENT...",
    to_user: "GNEW...",
    notes: "Quarterly department reallocation",
    required_signatures: 2,
    signers: ["GMANAGER1...", "GMANAGER2...", "GFINANCE..."],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 7 * 86400), // 7 days
  },
  sourceAccount
);
```

---

### `sign_proposal`

Cast an approve or reject vote on a proposal.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `signer` | `Address` | `string` |
| `proposal_id` | `String` | `string` |
| `decision` | `Symbol` | `SignerDecision` (`"Approve"` or `"Reject"`) |

**Return type:** Updated `TransferProposal`  
**Access:** Must be one of the listed signers. Soroban `require_auth()` on `signer`.  
**Errors:** `SignerNotFound (7)`, `AlreadySigned (8)`, `ProposalExpired (10)`, `ProposalNotPending (6)`

```typescript
import { SignerDecision } from "../../contracts/types/multisig_transfer";

const txBuilder = await multisigClient.buildSignProposal(
  signerKeypair.publicKey(),
  "proposal-001",
  SignerDecision.Approve,
  sourceAccount
);
const tx = txBuilder.build();
await server.prepareTransaction(tx);
tx.sign(signerKeypair);
await server.sendTransaction(tx);
```

---

### `execute_transfer`

Finalise an approved proposal, updating the asset's `assigned_user_id` in the `assetsup` contract.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `caller` | `Address` | `string` |
| `proposal_id` | `String` | `string` |

**Return type:** Final `TransferProposal` with `status: Executed`  
**Access:** Admin or proposal initiator. Only callable when `status == Approved`.  
**Errors:** `InsufficientSignatures (9)`, `ProposalNotPending (6)`, `Unauthorized (3)`

```typescript
const txBuilder = await multisigClient.buildExecuteTransfer(
  adminKeypair.publicKey(),
  "proposal-001",
  sourceAccount
);
```

---

### `cancel_proposal`

Reject and close a pending proposal.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `caller` | `Address` | `string` |
| `proposal_id` | `String` | `string` |

**Return type:** `bool`  
**Access:** Admin only.

---

### `upgrade`

Upgrade contract WASM. Called by `upgrade-contract.sh` only.

| Parameter | Soroban type | TypeScript type |
|---|---|---|
| `new_wasm_hash` | `BytesN<32>` | `Buffer` |

**Return type:** `()`  
**Access:** Admin only.

---

## Error Handling

Soroban contract errors are returned as `ScError` XDR values. The backend should map them:

```typescript
// backend/src/stellar/soroban-errors.ts
import { AssetsUpError } from "../../contracts/types/assetsup";
import { MultisigTransferError } from "../../contracts/types/multisig_transfer";

export function parseSorobanError(err: unknown): string {
  const msg = String(err);
  if (msg.includes("Error(Contract, #4)")) return "Asset or proposal not found";
  if (msg.includes("Error(Contract, #3)")) return "Unauthorized — admin key required";
  if (msg.includes("Error(Contract, #8)")) return "Signer has already voted";
  if (msg.includes("Error(Contract, #10)")) return "Proposal has expired";
  return `Soroban contract error: ${msg}`;
}
```

All error codes are defined in `contracts/types/assetsup.ts` (`AssetsUpError`) and `contracts/types/multisig_transfer.ts` (`MultisigTransferError`).