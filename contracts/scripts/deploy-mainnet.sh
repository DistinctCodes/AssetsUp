#!/usr/bin/env bash
# =============================================================================
# deploy-mainnet.sh — Deploy AssetsUp Soroban contracts to Stellar Mainnet
#
# Usage:
#   STELLAR_DEPLOYER_SECRET=S... ./contracts/scripts/deploy-mainnet.sh
#
# Required environment variables:
#   STELLAR_DEPLOYER_SECRET   Secret key of the funded deployer account (S...)
#
# Optional environment variables:
#   ADMIN_ADDRESS             Address to set as contract admin (G...)
#                             Defaults to the deployer's public key
#
# Outputs:
#   contracts/.env.mainnet    Written with ASSETSUP_CONTRACT_ID and
#                             MULTISIG_TRANSFER_CONTRACT_ID
#
# WARNING: This deploys to STELLAR MAINNET. Real XLM will be consumed.
#          Ensure the deployer account has sufficient XLM for fees.
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Constants ─────────────────────────────────────────────────────────────────
NETWORK="mainnet"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
RPC_URL="https://soroban-mainnet.stellar.org"
ENV_FILE="$(dirname "$0")/../.env.mainnet"
CONTRACTS_DIR="$(dirname "$0")/.."

# ── 1. Prerequisite checks ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${RED}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${RED}   AssetsUp — Stellar MAINNET Deployment               ${RESET}"
echo -e "${BOLD}${RED}═══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "${YELLOW}  ⚠  WARNING: You are about to deploy to STELLAR MAINNET.${RESET}"
echo -e "${YELLOW}     Real XLM will be consumed. This cannot be undone.${RESET}"
echo ""

# Explicit confirmation gate
read -rp "  Type 'deploy mainnet' to confirm: " CONFIRM
if [[ "$CONFIRM" != "deploy mainnet" ]]; then
  echo "Aborted."
  exit 0
fi
echo ""

if ! command -v stellar &>/dev/null; then
  error "stellar CLI not found. Install it with:\n  cargo install --locked stellar-cli --features opt"
fi

info "stellar CLI: $(stellar --version)"

# ── 2. Deployer keypair — REQUIRED on mainnet ─────────────────────────────────
if [[ -z "${STELLAR_DEPLOYER_SECRET:-}" ]]; then
  error "STELLAR_DEPLOYER_SECRET must be set for mainnet deployments.\n  export STELLAR_DEPLOYER_SECRET=S..."
fi

info "Deriving deployer public key…"
# Try stellar CLI key address derivation first, fall back to python stellar-sdk
DEPLOYER_PUBLIC=$(stellar keys address "$STELLAR_DEPLOYER_SECRET" 2>/dev/null || \
  python3 -c "
from stellar_sdk import Keypair
kp = Keypair.from_secret('$STELLAR_DEPLOYER_SECRET')
print(kp.public_key)
" 2>/dev/null) || error "Could not derive public key. Verify STELLAR_DEPLOYER_SECRET is a valid Stellar secret key."

ADMIN_ADDRESS="${ADMIN_ADDRESS:-$DEPLOYER_PUBLIC}"
info "Deployer public key : $DEPLOYER_PUBLIC"
info "Admin address       : $ADMIN_ADDRESS"

# ── 3. Check deployer account exists and has XLM ─────────────────────────────
info "Checking deployer account on mainnet…"
ACCOUNT_CHECK=$(curl -sf "https://horizon.stellar.org/accounts/${DEPLOYER_PUBLIC}" 2>/dev/null || echo "{}")
if echo "$ACCOUNT_CHECK" | grep -q '"status":404' 2>/dev/null || ! echo "$ACCOUNT_CHECK" | grep -q '"account_id"' 2>/dev/null; then
  error "Deployer account ${DEPLOYER_PUBLIC} not found on mainnet.\n  Fund it with XLM before deploying."
fi

XLM_BALANCE=$(echo "$ACCOUNT_CHECK" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for b in data.get('balances', []):
    if b['asset_type'] == 'native':
        print(b['balance'])
        break
" 2>/dev/null || echo "unknown")
info "Deployer XLM balance: ${XLM_BALANCE} XLM"

# ── 4. Build all contracts ────────────────────────────────────────────────────
info "Building all Soroban contracts for mainnet…"
cd "$CONTRACTS_DIR"
stellar contract build
success "Build complete."

# ── Locate compiled WASMs ─────────────────────────────────────────────────────
ASSETSUP_WASM=$(find target/wasm32-unknown-unknown/release -name "assetsup*.wasm" | head -1)
MULTISIG_WASM=$(find target/wasm32-unknown-unknown/release -name "multisig_transfer*.wasm" | head -1)

[[ -f "$ASSETSUP_WASM" ]]  || error "assetsup WASM not found after build."
[[ -f "$MULTISIG_WASM" ]] || error "multisig_transfer WASM not found after build."

info "assetsup WASM         : $ASSETSUP_WASM"
info "multisig_transfer WASM: $MULTISIG_WASM"

# ── Helper: deploy one contract ───────────────────────────────────────────────
deploy_contract() {
  local name="$1"
  local wasm="$2"

  info "Deploying ${name} to mainnet…"
  local contract_id
  contract_id=$(stellar contract deploy \
    --wasm "$wasm" \
    --source "$STELLAR_DEPLOYER_SECRET" \
    --network "$NETWORK" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --rpc-url "$RPC_URL" \
    2>&1 | tail -1)

  if [[ ! "$contract_id" =~ ^[A-Z0-9]{56}$ ]]; then
    error "Unexpected output from 'stellar contract deploy' for ${name}:\n  ${contract_id}"
  fi

  success "${name} deployed: ${contract_id}"
  echo "$contract_id"
}

# ── 5. Deploy assetsup ────────────────────────────────────────────────────────
ASSETSUP_CONTRACT_ID=$(deploy_contract "assetsup" "$ASSETSUP_WASM")

# ── 6. Deploy multisig_transfer ───────────────────────────────────────────────
MULTISIG_CONTRACT_ID=$(deploy_contract "multisig_transfer" "$MULTISIG_WASM")

# ── 7. Initialise contracts ───────────────────────────────────────────────────
info "Initialising assetsup contract (admin = ${ADMIN_ADDRESS})…"
stellar contract invoke \
  --id "$ASSETSUP_CONTRACT_ID" \
  --source "$STELLAR_DEPLOYER_SECRET" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  -- initialize \
  --admin "$ADMIN_ADDRESS"
success "assetsup initialised."

info "Initialising multisig_transfer contract (admin = ${ADMIN_ADDRESS})…"
stellar contract invoke \
  --id "$MULTISIG_CONTRACT_ID" \
  --source "$STELLAR_DEPLOYER_SECRET" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  -- initialize \
  --admin "$ADMIN_ADDRESS"
success "multisig_transfer initialised."

# ── 8. Write .env.mainnet ─────────────────────────────────────────────────────
info "Writing contract IDs to ${ENV_FILE}…"
cat > "$ENV_FILE" <<EOF
# Auto-generated by deploy-mainnet.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT edit manually — re-run the deploy script to regenerate.

ASSETSUP_CONTRACT_ID=${ASSETSUP_CONTRACT_ID}
MULTISIG_TRANSFER_CONTRACT_ID=${MULTISIG_CONTRACT_ID}

# Network metadata
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=${RPC_URL}
STELLAR_NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"
EOF
success "Wrote ${ENV_FILE}"

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   Mainnet Deployment Complete ✓                       ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${GREEN}assetsup contract ID         :${RESET} ${ASSETSUP_CONTRACT_ID}"
echo -e "  ${GREEN}multisig_transfer contract ID:${RESET} ${MULTISIG_CONTRACT_ID}"
echo -e "  ${GREEN}Admin address                :${RESET} ${ADMIN_ADDRESS}"
echo -e "  ${GREEN}Environment file             :${RESET} ${ENV_FILE}"
echo ""
echo -e "  Stellar Expert (mainnet):"
echo -e "    https://stellar.expert/explorer/public/contract/${ASSETSUP_CONTRACT_ID}"
echo -e "    https://stellar.expert/explorer/public/contract/${MULTISIG_CONTRACT_ID}"
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "    1. Load ${ENV_FILE} into your backend environment"
echo -e "    2. Verify contracts on Stellar Expert"
echo -e "    3. Run smoke tests against mainnet endpoints"
echo ""