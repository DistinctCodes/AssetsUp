#!/usr/bin/env bash
# =============================================================================
# deploy-testnet.sh — Deploy AssetsUp Soroban contracts to Stellar Testnet
#
# Usage:
#   ./contracts/scripts/deploy-testnet.sh
#
# Environment variables (optional — auto-generated if not set):
#   STELLAR_DEPLOYER_SECRET   Secret key of the deployer account (S...)
#   ADMIN_ADDRESS             Address to set as contract admin (G...)
#                             Defaults to the deployer's public key
#
# Outputs:
#   contracts/.env.testnet    Written with ASSETSUP_CONTRACT_ID and
#                             MULTISIG_TRANSFER_CONTRACT_ID
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
NETWORK="testnet"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
FRIENDBOT_URL="https://friendbot.stellar.org"
ENV_FILE="$(dirname "$0")/../.env.testnet"
CONTRACTS_DIR="$(dirname "$0")/.."

# ── 1. Prerequisite checks ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   AssetsUp — Stellar Testnet Deployment               ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo ""

if ! command -v stellar &>/dev/null; then
  error "stellar CLI not found. Install it with:\n  cargo install --locked stellar-cli --features opt"
fi

info "stellar CLI: $(stellar --version)"

# ── 2. Deployer keypair ───────────────────────────────────────────────────────
if [[ -z "${STELLAR_DEPLOYER_SECRET:-}" ]]; then
  warn "STELLAR_DEPLOYER_SECRET not set — generating a fresh keypair for this deployment."
  KEYPAIR_JSON=$(stellar keys generate --no-fund deployer-testnet-$$ 2>/dev/null || true)
  # Use stellar keys show to extract values
  STELLAR_DEPLOYER_SECRET=$(stellar keys show deployer-testnet-$$ --secret-key 2>/dev/null)
  DEPLOYER_PUBLIC=$(stellar keys show deployer-testnet-$$ 2>/dev/null)
  warn "Generated keypair — store the secret key securely if you want to reuse this deployer!"
  echo -e "  ${YELLOW}Public key:  ${DEPLOYER_PUBLIC}${RESET}"
  echo -e "  ${YELLOW}Secret key:  ${STELLAR_DEPLOYER_SECRET}${RESET}"
else
  info "Using provided STELLAR_DEPLOYER_SECRET."
  DEPLOYER_PUBLIC=$(stellar keys address "$STELLAR_DEPLOYER_SECRET" 2>/dev/null || \
    python3 -c "
from stellar_sdk import Keypair
kp = Keypair.from_secret('$STELLAR_DEPLOYER_SECRET')
print(kp.public_key)
" 2>/dev/null || \
    stellar keys show --secret-key "$STELLAR_DEPLOYER_SECRET" 2>/dev/null || \
    { error "Could not derive public key from STELLAR_DEPLOYER_SECRET. Ensure stellar-sdk or Python is available."; })
fi

ADMIN_ADDRESS="${ADMIN_ADDRESS:-$DEPLOYER_PUBLIC}"
info "Deployer public key : $DEPLOYER_PUBLIC"
info "Admin address       : $ADMIN_ADDRESS"

# ── 3. Fund via Friendbot ─────────────────────────────────────────────────────
info "Funding deployer account via Friendbot…"
FUND_RESPONSE=$(curl -sf "${FRIENDBOT_URL}?addr=${DEPLOYER_PUBLIC}" || true)
if echo "$FUND_RESPONSE" | grep -q '"successful":true' 2>/dev/null || \
   echo "$FUND_RESPONSE" | grep -q '"hash"' 2>/dev/null; then
  success "Friendbot funding successful."
elif echo "$FUND_RESPONSE" | grep -qi "createAccountAlreadyExist\|already funded" 2>/dev/null; then
  warn "Account already exists — skipping Friendbot (this is fine for redeployments)."
else
  warn "Friendbot response unclear. Proceeding anyway — account may already be funded."
fi

# ── 4. Build all contracts ────────────────────────────────────────────────────
info "Building all Soroban contracts…"
cd "$CONTRACTS_DIR"
stellar contract build
success "Build complete."

# ── Locate compiled WASMs ─────────────────────────────────────────────────────
ASSETSUP_WASM=$(find target/wasm32-unknown-unknown/release -name "assetsup*.wasm" | head -1)
MULTISIG_WASM=$(find target/wasm32-unknown-unknown/release -name "multisig_transfer*.wasm" | head -1)

[[ -f "$ASSETSUP_WASM" ]]  || error "assetsup WASM not found after build. Check contracts/assetsup/Cargo.toml."
[[ -f "$MULTISIG_WASM" ]] || error "multisig_transfer WASM not found after build. Check contracts/multisig_transfer/Cargo.toml."

info "assetsup WASM        : $ASSETSUP_WASM"
info "multisig_transfer WASM: $MULTISIG_WASM"

# ── Helper: deploy one contract ───────────────────────────────────────────────
deploy_contract() {
  local name="$1"
  local wasm="$2"

  info "Deploying ${name}…"
  local contract_id
  contract_id=$(stellar contract deploy \
    --wasm "$wasm" \
    --source "$STELLAR_DEPLOYER_SECRET" \
    --network "$NETWORK" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --rpc-url "$RPC_URL" \
    2>&1 | tail -1)

  # Validate output looks like a contract ID (56-char alphanumeric)
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

# ── 8. Write .env.testnet ─────────────────────────────────────────────────────
info "Writing contract IDs to ${ENV_FILE}…"
cat > "$ENV_FILE" <<EOF
# Auto-generated by deploy-testnet.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT edit manually — re-run the deploy script to regenerate.

ASSETSUP_CONTRACT_ID=${ASSETSUP_CONTRACT_ID}
MULTISIG_TRANSFER_CONTRACT_ID=${MULTISIG_CONTRACT_ID}

# Network metadata
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=${RPC_URL}
STELLAR_NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"
EOF
success "Wrote ${ENV_FILE}"

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}   Deployment Complete ✓                               ${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${GREEN}assetsup contract ID         :${RESET} ${ASSETSUP_CONTRACT_ID}"
echo -e "  ${GREEN}multisig_transfer contract ID:${RESET} ${MULTISIG_CONTRACT_ID}"
echo -e "  ${GREEN}Admin address                :${RESET} ${ADMIN_ADDRESS}"
echo -e "  ${GREEN}Environment file             :${RESET} ${ENV_FILE}"
echo ""
echo -e "  Stellar Explorer (testnet):"
echo -e "    https://stellar.expert/explorer/testnet/contract/${ASSETSUP_CONTRACT_ID}"
echo -e "    https://stellar.expert/explorer/testnet/contract/${MULTISIG_CONTRACT_ID}"
echo ""