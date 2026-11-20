# On-chain integration

How the backend and frontend relate to the Soroban contracts in `contracts/`.
This page describes what the code does **today**; places where the integration
is still a stub are marked so nobody assumes more is wired than is.

## What is wired today

| Piece | State |
| --- | --- |
| `backend/src/stellar/soroban.service.ts` | Reads its configuration and reports enabled/disabled. `registerAsset`, `getAsset` and `healthCheck` are **stubs**: the real Soroban invocation is a `TODO` and the methods return a placeholder result (`txHash: 'pending-implementation'`). |
| `contracts/scripts/deploy.sh` | Builds, optimizes, deploys, initializes and verifies the contracts and writes `contracts/deployments/<network>.json`. This is the one deployment path. |
| Frontend wallet (`frontend/store/wallet.store.ts`, `components/wallet/`, `components/assets/on-chain-tab.tsx`) | A wallet connection and an on-chain tab for an asset. The wallet belongs to the user; it is separate from the backend signer (see below). |

## Configuration

Backend (read by `SorobanService.onModuleInit`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `STELLAR_NETWORK` | `testnet` | `testnet`, `futurenet` or `mainnet`. |
| `SOROBAN_RPC_URL` | public RPC for the network | Soroban RPC endpoint. |
| `ASSETSUP_CONTRACT_ID` | empty | The deployed `assetsup` registry (`C...`). |
| `STELLAR_SECRET_KEY` | unset | The backend's signing key. Never commit it. |

The service is **enabled only when both `STELLAR_SECRET_KEY` and
`ASSETSUP_CONTRACT_ID` are set**; otherwise it logs a warning and every call
succeeds as a no-op, so local development works without a chain.

Network passphrase: not read by the backend today. Use the passphrase of the
network you deploy to (for example `Test SDF Network ; September 2015` for
testnet) when you add the real invocation.

## `deployments/<network>.json`

`deploy.sh` writes one file per network (git-ignored; see
`contracts/deployments/testnet.example.json` for the shape):

```json
{ "network": "testnet", "admin": "G...", "deployedAt": "...",
  "contracts": { "assetsup": "C...", "contrib": "C...", "multisig-wallet": "C...",
                 "asset-maintenance": "C...", "multisig-transfer": "C..." } }
```

Nothing in the backend reads this file yet. For now copy
`contracts.assetsup` into `ASSETSUP_CONTRACT_ID`.

## Where the contracts fit in the asset lifecycle

The intended calls (the backend does not make them yet):

| Lifecycle step | Contract call |
| --- | --- |
| Asset created | `assetsup.register_asset(asset, caller)` (caller is the admin or an authorized registrar) |
| Metadata edited | `assetsup.update_asset_metadata(...)` |
| Ownership transferred | `assetsup.transfer_asset_ownership(asset_id, new_owner, caller)`, or, for assets that need approvals, `multisig-transfer` (`create_transfer_request` -> `approve_transfer_request` -> `execute_transfer`) |
| Asset retired | `assetsup.retire_asset(asset_id, caller)` |
| Fractional ownership | `assetsup.tokenize_asset(...)` and the token entrypoints |
| Maintenance logged | `asset-maintenance.add_maintenance_record(record)` |

```text
register asset   backend --register_asset--> assetsup --event asset_registered--> indexer
transfer         backend --create_transfer_request--> multisig-transfer
                 approvers --approve_transfer_request--> multisig-transfer
                 anyone --execute_transfer--> multisig-transfer --transfer_owner--> assetsup
tokenize         owner --tokenize_asset--> assetsup --event asset_tokenized-->
```

## Mapping failures to error codes

Contract failures reach the backend as bare `u32` error codes. The allocation is
in [`contracts/ERRORS.md`](../contracts/ERRORS.md): `1-99` are shared (the same
meaning in every contract), each contract owns a block above that
(`assetsup` 100-199, `multisig-transfer` 400-499, `asset-maintenance` 500-599, ...).
The backend should look the code up per contract (for example assetsup `102` is
`AssetNotFound`, multisig-transfer `403` is `ApprovalDeadlinePassed`) and map it
to an HTTP error. No such mapping exists yet. Some entrypoints in `contrib` and
`asset-maintenance` still trap with a string panic instead of a typed error;
those surface as an opaque host error.

## Wallet vs backend signer

- The **backend signer** (`STELLAR_SECRET_KEY`) is a service account. It signs
  the transactions the backend submits on its own behalf, for example as the
  `assetsup` admin or an authorized registrar.
- The **frontend wallet** is the user's own account. Operations that must be
  authorized by a person (owning an asset, approving a transfer, locking
  tokens) have to be signed by that person's wallet; the backend cannot
  authorize them for the user.
- `require_auth` is enforced per address, so an entrypoint that names a `caller`
  needs that address's signature, whichever side builds the transaction.

## Local testnet setup

1. Install the Rust toolchain pinned by `contracts/rust-toolchain.toml` and the
   Stellar CLI (>= 22).
2. Create and fund an identity: `stellar keys generate --network testnet alice`
   (testnet accounts are funded by Friendbot; see the CLI docs for the exact
   flag in your version).
3. Deploy: `cd contracts && ./scripts/deploy.sh --network testnet --source alice`.
4. Put `contracts.assetsup` from `contracts/deployments/testnet.json` into
   `ASSETSUP_CONTRACT_ID` and set `STELLAR_SECRET_KEY` for the backend
   (testnet keys only).
5. Register an asset directly while the backend invocation is still a stub:

   ```sh
   stellar contract invoke --id <assetsup id> --source-account alice \
     --network testnet -- get_admin
   ```

Not yet possible: "register an asset on testnet through the app". That needs
the real `SorobanService.registerAsset`. This page will need updating when it
lands.
