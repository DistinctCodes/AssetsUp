#!/usr/bin/env bash
#
# deploy.sh — Compile the contrib contract to WASM and deploy to Stellar Testnet
#
# Steps:
#   1. Build the contract with `cargo build --target wasm32-unknown-unknown --release`
#   2. Deploy the WASM to Testnet via `stellar contract deploy`
#   3. Log the contract ID and persist it to .env
#
# Prerequisites:
#   - Rust toolchain with wasm32-unknown-unknown target
#   - stellar CLI (>= 22)
#   - .env file with ADMIN_SECRET, NETWORK_PASSPHRASE, RPC_URL
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$CONTRACT_ROOT/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# ── Colours ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Load .env ──────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  error "$ENV_FILE not found. Copy .env.example → .env and fill in values."
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${ADMIN_SECRET:?ADMIN_SECRET must be set in $ENV_FILE}"
: "${NETWORK_PASSPHRASE:?NETWORK_PASSPHRASE must be set in $ENV_FILE}"
: "${RPC_URL:?RPC_URL must be set in $ENV_FILE}"

# ── Step 1: Build WASM ────────────────────────────────────────────────────────
info "Building contrib contract to WASM…"

(
  cd "$WORKSPACE_ROOT"
  cargo build --package contrib --target wasm32-unknown-unknown --release
)

WASM_PATH="${WORKSPACE_ROOT}/target/wasm32-unknown-unknown/release/contrib.wasm"

if [[ ! -f "$WASM_PATH" ]]; then
  error "WASM not found at $WASM_PATH — build may have failed."
fi

WASM_SIZE="$(du -h "$WASM_PATH" | cut -f1)"
info "WASM built: $WASM_PATH ($WASM_SIZE)"

# ── Step 2: Deploy to Testnet ─────────────────────────────────────────────────
info "Deploying contract to Stellar Testnet…"

DEPLOY_OUTPUT="$(
  stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source-key "$ADMIN_SECRET" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --rpc-url "$RPC_URL" \
    --ignore-checks
)"

# stellar contract deploy prints the contract ID (e.g. C... or CA... )
CONTRACT_ID="$(echo "$DEPLOY_OUTPUT" | tr -d '[:space:]')"

if [[ -z "$CONTRACT_ID" ]]; then
  error "Deployment output was empty. Check stellar CLI output above."
fi

info "Contract deployed!"
info "  Contract ID : $CONTRACT_ID"
info "  RPC URL     : $RPC_URL"

# ── Step 3: Persist contract ID to .env ───────────────────────────────────────
if grep -q "^CONTRACT_ID=" "$ENV_FILE"; then
  sed -i.bak "s/^CONTRACT_ID=.*/CONTRACT_ID=${CONTRACT_ID}/" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
else
  echo "" >> "$ENV_FILE"
  echo "CONTRACT_ID=${CONTRACT_ID}" >> "$ENV_FILE"
fi

info "Contract ID saved to $ENV_FILE"

echo ""
echo "──────────────────────────────────────────────"
echo " Next step: initialize the contract"
echo "   ./scripts/initialize.sh"
echo "──────────────────────────────────────────────"
