#!/usr/bin/env bash
#
# initialize.sh — Call the initialize() function on the deployed contrib contract
#
# The contract's initialize(env, admin) sets the admin address and initial state.
# This script derives the admin public address from ADMIN_SECRET and invokes
# the function via `stellar contract invoke`.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
: "${CONTRACT_ID:?CONTRACT_ID must be set in $ENV_FILE (run deploy.sh first)}"

# ── Derive admin address ──────────────────────────────────────────────────────
info "Deriving admin address from ADMIN_SECRET…"

ADMIN_ADDRESS="$(stellar keys address --secret-key "$ADMIN_SECRET" 2>/dev/null || \
  echo "$ADMIN_SECRET" | stellar keys address 2>/dev/null || \
  printf '%s' "$ADMIN_SECRET" | stellar keys address)"

if [[ -z "$ADMIN_ADDRESS" ]]; then
  error "Could not derive admin address from ADMIN_SECRET."
fi

info "Admin address: $ADMIN_ADDRESS"

# ── Invoke initialize ─────────────────────────────────────────────────────────
info "Calling initialize(admin: $ADMIN_ADDRESS) on contract $CONTRACT_ID…"

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-key "$ADMIN_SECRET" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --rpc-url "$RPC_URL" \
  -- \
  initialize \
  --admin "$ADMIN_ADDRESS"

info "Contract initialized successfully!"
info ""
info "You can verify by calling get_admin:"
info "  stellar contract invoke \\"
info "    --id $CONTRACT_ID \\"
info "    --source-key \"\$ADMIN_SECRET\" \\"
info "    --network-passphrase \"\$NETWORK_PASSPHRASE\" \\"
info "    --rpc-url \"\$RPC_URL\" \\"
info "    -- get_admin"
