#!/usr/bin/env bash
#
# setup-testnet.sh — Fund the admin account on Stellar Testnet via Friendbot
#
# Usage:
#   ./setup-testnet.sh            # reads ADMIN_SECRET from .env
#   ./setup-testnet.sh <pubkey>   # fund an arbitrary address
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# ── Load .env ──────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example and fill in values." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# ── Derive public key from secret ─────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
  ADMIN_PUBLIC="$1"
else
  if [[ -z "${ADMIN_SECRET:-}" ]]; then
    echo "ERROR: ADMIN_SECRET is not set in $ENV_FILE" >&2
    exit 1
  fi

  ADMIN_PUBLIC="$(stellar keys address --secret-key "$ADMIN_SECRET" 2>/dev/null || \
    echo "$ADMIN_SECRET" | stellar keys address 2>/dev/null || \
    printf '%s' "$ADMIN_SECRET" | stellar keys address)"

  if [[ -z "$ADMIN_PUBLIC" ]]; then
    echo "ERROR: Could not derive public key from ADMIN_SECRET" >&2
    exit 1
  fi
fi

echo "Funding account: $ADMIN_PUBLIC"

# ── Call Friendbot ─────────────────────────────────────────────────────────────
RESPONSE=$(curl -sS "https://friendbot.stellar.org/?addr=${ADMIN_PUBLIC}") || {
  echo "ERROR: Failed to reach Friendbot" >&2
  exit 1
}

# Friendbot returns the transaction envelope on success or JSON error
if echo "$RESPONSE" | grep -q '"hash"'; then
  echo "Account funded successfully!"
  echo "  Address : $ADMIN_PUBLIC"
  echo "  Tx hash : $(echo "$RESPONSE" | grep -o '"hash":"[^"]*"' | cut -d'"' -f4)"
else
  # Already funded accounts return a friendly message
  if echo "$RESPONSE" | grep -qi "already"; then
    echo "Account already funded: $ADMIN_PUBLIC"
  else
    echo "WARNING: Unexpected Friendbot response:" >&2
    echo "$RESPONSE" >&2
  fi
fi

echo ""
echo "Verify on Testnet explorer:"
echo "  https://stellar.expert/explorer/testnet/account/$ADMIN_PUBLIC"
