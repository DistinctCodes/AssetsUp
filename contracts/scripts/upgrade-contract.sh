#!/usr/bin/env bash
# =============================================================================
# upgrade-contract.sh — Upgrade a deployed AssetsUp Soroban contract
#
# Usage:
#   ./contracts/scripts/upgrade-contract.sh <contract-name> <network>
#
#   contract-name:  assetsup | multisig_transfer
#   network:        testnet  | mainnet
#
# Examples:
#   ./contracts/scripts/upgrade-contract.sh assetsup testnet
#   STELLAR_DEPLOYER_SECRET=S... ./contracts/scripts/upgrade-contract.sh multisig_transfer mainnet
#
# Required environment variables:
#   STELLAR_DEPLOYER_SECRET   Must be the admin key that can call upgrade()
#
# The contract ID is read from contracts/.env.<network>
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Usage guard ───────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 <contract-name> <network>"
  echo "  contract-name : assetsup | multisig_transfer"
  echo "  network       : testnet  | mainnet"
  exit 1
}

[[ $# -eq 2 ]] || usage

CONTRACT_NAME="$1"
NETWORK="$2"
CONTRACTS_DIR="$(dirname "$0")/.."
ENV_FILE="${CONTRACTS_DIR}/.env.${NETWORK}"

# ── Validate args ─────────────────────────────────────────────────────────────
case "$CONTRACT_NAME" in
  assetsup)           WASM_GLOB="assetsup*.wasm"; ENV_VAR="ASSETSUP_CONTRACT_ID" ;;
  multisig_transfer)  WASM_GLOB="multisig_transfer*.wasm"; ENV_VAR="MULTISIG_TRANSFER_CONTRACT_ID" ;;
  *) error "Unknown contract '${CONTRACT_NAME}'. Must be: assetsup | multisig_transfer" ;;
esac

case "$NETWORK" in
  testnet)
    NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
    RPC_URL="https://soroban-testnet.stellar.org"
    ;;
  mainnet)
    NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
    RPC_URL="https://soroban-mainnet.stellar.org"
    ;;
  *) error "Unknown network '${NETWORK}'. Must be: testnet | mainnet" ;;
esac

# ── Print header ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   AssetsUp — Contract Upgrade                         ${RESET}"
echo -e "${BOLD}   Contract : ${CONTRACT_NAME}                         ${RESET}"
echo -e "${BOLD}   Network  : ${NETWORK}                               ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo ""

# ── Mainnet confirmation ──────────────────────────────────────────────────────
if [[ "$NETWORK" == "mainnet" ]]; then
  echo -e "${YELLOW}  ⚠  WARNING: You are upgrading a MAINNET contract.${RESET}"
  echo -e "${YELLOW}     This will affect all live users.${RESET}"
  echo ""
  read -rp "  Type 'upgrade mainnet ${CONTRACT_NAME}' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "upgrade mainnet ${CONTRACT_NAME}" ]]; then
    echo "Aborted."
    exit 0
  fi
  echo ""
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────
if ! command -v stellar &>/dev/null; then
  error "stellar CLI not found. Install with: cargo install --locked stellar-cli --features opt"
fi

[[ -z "${STELLAR_DEPLOYER_SECRET:-}" ]] && \
  error "STELLAR_DEPLOYER_SECRET must be set. This should be the admin key for the contract."

[[ -f "$ENV_FILE" ]] || \
  error "Environment file not found: ${ENV_FILE}\n  Run deploy-${NETWORK}.sh first."

# ── Load contract ID from env file ────────────────────────────────────────────
CONTRACT_ID=$(grep "^${ENV_VAR}=" "$ENV_FILE" | cut -d= -f2)
[[ -z "$CONTRACT_ID" ]] && \
  error "${ENV_VAR} not found in ${ENV_FILE}.\n  Re-run the deploy script to populate it."

info "Contract ID : ${CONTRACT_ID}"
info "Network     : ${NETWORK}"
info "RPC URL     : ${RPC_URL}"

# ── Build ─────────────────────────────────────────────────────────────────────
info "Building ${CONTRACT_NAME}…"
cd "$CONTRACTS_DIR"
stellar contract build
success "Build complete."

WASM_PATH=$(find target/wasm32-unknown-unknown/release -name "$WASM_GLOB" | head -1)
[[ -f "$WASM_PATH" ]] || error "WASM not found after build: ${WASM_GLOB}"
info "WASM path   : ${WASM_PATH}"
WASM_SIZE=$(du -sh "$WASM_PATH" | cut -f1)
info "WASM size   : ${WASM_SIZE}"

# ── Upload new WASM to the ledger ─────────────────────────────────────────────
info "Uploading new WASM to ledger…"
NEW_WASM_HASH=$(stellar contract upload \
  --wasm "$WASM_PATH" \
  --source "$STELLAR_DEPLOYER_SECRET" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  2>&1 | tail -1)

[[ -z "$NEW_WASM_HASH" ]] && error "WASM upload returned empty hash."
success "New WASM hash: ${NEW_WASM_HASH}"

# ── Invoke upgrade() on the deployed contract ─────────────────────────────────
info "Invoking upgrade() on ${CONTRACT_NAME} (${CONTRACT_ID})…"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$STELLAR_DEPLOYER_SECRET" \
  --network "$NETWORK" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  -- upgrade \
  --new_wasm_hash "$NEW_WASM_HASH"

success "Upgrade transaction submitted."

# ── Update env file with new WASM hash (informational) ───────────────────────
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Append/update WASM hash comment in env file
if grep -q "^${ENV_VAR}_WASM_HASH=" "$ENV_FILE" 2>/dev/null; then
  # Replace existing line
  sed -i.bak "s|^${ENV_VAR}_WASM_HASH=.*|${ENV_VAR}_WASM_HASH=${NEW_WASM_HASH}  # upgraded ${TIMESTAMP}|" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
else
  echo "" >> "$ENV_FILE"
  echo "# Last upgrade" >> "$ENV_FILE"
  echo "${ENV_VAR}_WASM_HASH=${NEW_WASM_HASH}  # upgraded ${TIMESTAMP}" >> "$ENV_FILE"
fi

success "Updated ${ENV_FILE} with new WASM hash."

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   Upgrade Complete ✓                                  ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${GREEN}Contract        :${RESET} ${CONTRACT_NAME}"
echo -e "  ${GREEN}Contract ID     :${RESET} ${CONTRACT_ID}"
echo -e "  ${GREEN}New WASM hash   :${RESET} ${NEW_WASM_HASH}"
echo -e "  ${GREEN}Network         :${RESET} ${NETWORK}"
echo ""
case "$NETWORK" in
  testnet) EXPLORER="https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}" ;;
  mainnet) EXPLORER="https://stellar.expert/explorer/public/contract/${CONTRACT_ID}" ;;
esac
echo -e "  ${CYAN}Explorer: ${EXPLORER}${RESET}"
echo ""