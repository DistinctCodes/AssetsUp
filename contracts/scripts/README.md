# Deployment scripts

## `deploy.sh`

Builds, optimizes, deploys, initializes, and verifies the full AssetsUp contract
suite in one command, then records the resulting contract ids for the backend to
consume.

```sh
cd contracts
./scripts/deploy.sh --network testnet --source alice
```

| Flag | Meaning |
|---|---|
| `--network` | Stellar network: `testnet`, `futurenet`, `local`, `mainnet`. |
| `--source` | **Name** of a Stellar CLI identity to sign and pay with. |
| `--skip-build` | Reuse existing `.wasm` artifacts instead of rebuilding. |

### Prerequisites

1. **Rust toolchain** — pinned by [`../rust-toolchain.toml`](../rust-toolchain.toml).
   `rustup` installs it automatically on first use inside `contracts/`, including
   the `wasm32-unknown-unknown` target.

2. **Stellar CLI** ≥ 22 on `PATH`:

   ```sh
   cargo install --locked stellar-cli
   stellar --version
   ```

3. **A funded identity.** Generate and fund one on testnet:

   ```sh
   stellar keys generate --network testnet alice
   stellar keys address alice
   ```

4. **bash 4+.** macOS ships bash 3.2; install a newer one with `brew install bash`
   and invoke the script with it. The script checks this and fails early.

### What it does

1. **Build** — each deployable contract for `wasm32-unknown-unknown --release`.
2. **Optimize** — `stellar contract optimize`, reporting before/after sizes.
3. **Deploy** — in dependency order, so `assetsup` exists before the contracts
   that take its address.
4. **Initialize** — wires cross-contract addresses:
   - `assetsup.initialize(admin)`
   - `contrib.initialize(admin)`
   - `asset-maintenance.init(admin, registry = assetsup)`
   - `multisig-transfer.initialize(admin, asset_registry = assetsup)`
5. **Verify** — calls a read entrypoint on each deployed contract and fails the
   run if any does not respond.
6. **Record** — writes `deployments/<network>.json`.

### `multisig-wallet` is deliberately not initialized

A wallet needs at least two owners and a real threshold; initializing it with
the deploying identity as sole owner would be both invalid
(`InsufficientOwners`) and a security mistake. The script deploys it and prints
the exact `initialize` command to run with your real signer set.

### Output

`deployments/<network>.json` is **git-ignored** — it is environment state, not
source. [`../deployments/testnet.example.json`](../deployments/testnet.example.json)
is committed and documents the shape:

```json
{
  "network": "testnet",
  "admin": "G...",
  "deployedAt": "2026-01-01T00:00:00Z",
  "contracts": {
    "assetsup": "C...",
    "contrib": "C...",
    "multisig-wallet": "C...",
    "asset-maintenance": "C...",
    "multisig-transfer": "C..."
  }
}
```

### Key material

The script never reads, writes, or logs a secret key. `--source` takes an
identity **name** that the Stellar CLI resolves from its own keystore; passing
something that looks like a secret key is rejected outright, because it would
otherwise land in shell history and CI logs.
