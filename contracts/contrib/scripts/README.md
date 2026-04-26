# Contrib Contract — Deploy & Initialize on Stellar Testnet

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable | `rustup default stable` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| stellar CLI | >= 22 | `cargo install stellar-cli` |
| curl | any | system package |

## Environment Setup

```bash
cd contracts/contrib/scripts

# 1. Create your .env from the example
cp .env.example .env

# 2. Fill in your admin secret key
#    Generate a new keypair with: stellar keys generate
#    Or use an existing one.
$EDITOR .env
```

The `.env` file requires three variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_SECRET` | Ed25519 secret key (starts with `S`) | `SBUV...` |
| `NETWORK_PASSPHRASE` | Stellar network identifier | `Test SDF Network ; September 2015` |
| `RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org:443` |

## Deploy Workflow

Run the three scripts in order:

### Step 1 — Fund the admin account

```bash
./setup-testnet.sh
```

This calls [Friendbot](https://developers.stellar.org/docs/learn/fund-and-create-an-account#testnet) to credit 10,000 XLM to the admin account on Testnet. Safe to re-run (idempotent).

### Step 2 — Compile & deploy the contract

```bash
./deploy.sh
```

What it does:

1. Compiles `contrib` to WASM via `cargo build --target wasm32-unknown-unknown --release`
2. Uploads the WASM and creates the contract instance via `stellar contract deploy`
3. Logs the **contract ID** to stdout
4. Persists the contract ID in `.env` as `CONTRACT_ID=...`

### Step 3 — Initialize the contract

```bash
./initialize.sh
```

What it does:

1. Derives the admin public address from `ADMIN_SECRET`
2. Calls `initialize(admin)` on the deployed contract via `stellar contract invoke`
3. The contract sets the admin, marks the contract as unpaused, sets total count to 0, and authorizes the admin as a registrar

### Verify

```bash
# Check the stored admin
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-key "$ADMIN_SECRET" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  -- get_admin

# Should print the admin's public address (G...)
```

## Redeploying

To deploy a new instance after code changes:

```bash
./deploy.sh       # builds, deploys, saves new CONTRACT_ID to .env
./initialize.sh   # initializes the new instance
```

> **Note:** `deploy.sh` always creates a **new** contract instance. The old contract ID remains on-chain but is no longer referenced in your `.env`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `error: no such target: wasm32-unknown-unknown` | `rustup target add wasm32-unknown-unknown` |
| `stellar: command not found` | `cargo install stellar-cli` |
| `RESOURCE_EXHAUSTED` on deploy | Contract WASM too large; enable `opt-level = "z"` in `Cargo.toml` (already set) |
| `Already initialized` on invoke | Contract was already initialized. Deploy a new instance. |
| `Insufficient balance` | Run `./setup-testnet.sh` again or wait for Friendbot rate limit to reset. |
