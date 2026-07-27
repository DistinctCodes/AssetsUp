#!/usr/bin/env bash
#
# Reproducible deployment of the AssetsUp contract suite.
#
# Handles build -> optimize -> deploy -> initialize -> verify for every
# deployable contract, and writes the resulting contract ids to
# deployments/<network>.json for the backend to consume.
#
# Usage:
#   ./scripts/deploy.sh --network testnet --source alice
#   ./scripts/deploy.sh --network testnet --source alice --skip-build
#
# No key material is read or written by this script. Identities are managed by
# the Stellar CLI keystore and referenced by name only.

set -euo pipefail

# Associative arrays require bash 4+. macOS ships bash 3.2 as /bin/bash, so
# reach for a newer one (brew install bash) rather than failing obscurely later.
if (( BASH_VERSINFO[0] < 4 )); then
  echo "error: bash 4+ required, found ${BASH_VERSION}." >&2
  echo "       On macOS: brew install bash, then re-run with that bash." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
cd "$CONTRACTS_DIR"

NETWORK=""
SOURCE=""
SKIP_BUILD=0
WASM_DIR="target/wasm32-unknown-unknown/release"

# Deployable contracts, in dependency order. multisig-transfer is initialized
# with the assetsup registry address, so assetsup must be deployed first.
CONTRACTS=(
  "assetsup"
  "contrib"
  "multisig-wallet"
  "asset-maintenance"
  "multisig-transfer"
)

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy.sh --network <name> --source <identity> [--skip-build]

  --network   Stellar network to deploy to (testnet, futurenet, local, mainnet).
  --source    Name of a Stellar CLI identity to sign and pay with. Must be
              funded. Never pass a secret key here.
  --skip-build  Reuse existing .wasm artifacts instead of rebuilding.

Prerequisites:
  - Rust toolchain pinned by contracts/rust-toolchain.toml (rustup installs it
    automatically) with the wasm32-unknown-unknown target.
  - stellar CLI >= 22 on PATH.
  - A funded identity: stellar keys generate --network testnet <name>
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)    NETWORK="${2:-}"; shift 2 ;;
    --source)     SOURCE="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *) echo "error: unknown argument '$1'" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$NETWORK" || -z "$SOURCE" ]]; then
  echo "error: --network and --source are both required" >&2
  usage
  exit 2
fi

if [[ "$SOURCE" == S* && ${#SOURCE} -eq 56 ]]; then
  echo "error: --source looks like a secret key. Pass an identity NAME instead;" >&2
  echo "       secrets must never appear in shell history or CI logs." >&2
  exit 2
fi

command -v stellar >/dev/null 2>&1 || {
  echo "error: 'stellar' CLI not found on PATH. See https://developers.stellar.org/docs/tools/cli" >&2
  exit 1
}

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }

# Package name -> crate directory. These disagree for multisig-transfer.
crate_dir() {
  case "$1" in
    multisig-transfer) echo "multisig_transfer" ;;
    *) echo "$1" ;;
  esac
}

# ---------------------------------------------------------------- build

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  log "Building ${#CONTRACTS[@]} contracts for wasm32-unknown-unknown (release)"
  for c in "${CONTRACTS[@]}"; do
    log "  building $c"
    cargo build --package "$c" --target wasm32-unknown-unknown --release
  done
else
  log "Skipping build (--skip-build)"
fi

log "Optimizing WASM artifacts"
for c in "${CONTRACTS[@]}"; do
  wasm="$WASM_DIR/${c//-/_}.wasm"
  if [[ ! -f "$wasm" ]]; then
    echo "error: expected artifact not found: $wasm" >&2
    exit 1
  fi
  before=$(wc -c < "$wasm" | tr -d ' ')
  stellar contract optimize --wasm "$wasm" >/dev/null
  optimized="${wasm%.wasm}.optimized.wasm"
  after=$(wc -c < "$optimized" | tr -d ' ')
  printf '    %-20s %8s -> %8s bytes\n' "$c" "$before" "$after"
done

# ---------------------------------------------------------------- deploy

OUT_DIR="deployments"
OUT_FILE="$OUT_DIR/$NETWORK.json"
mkdir -p "$OUT_DIR"

declare -A DEPLOYED

log "Deploying to '$NETWORK' as identity '$SOURCE'"
for c in "${CONTRACTS[@]}"; do
  wasm="$WASM_DIR/${c//-/_}.optimized.wasm"
  id=$(stellar contract deploy \
        --wasm "$wasm" \
        --source-account "$SOURCE" \
        --network "$NETWORK")
  DEPLOYED["$c"]="$id"
  printf '    %-20s %s\n' "$c" "$id"
done

# ---------------------------------------------------------------- initialize

ADMIN=$(stellar keys address "$SOURCE")
log "Initializing contracts (admin: $ADMIN)"

invoke() {
  local contract_id="$1"; shift
  stellar contract invoke \
    --id "$contract_id" \
    --source-account "$SOURCE" \
    --network "$NETWORK" \
    -- "$@"
}

log "  assetsup.initialize"
invoke "${DEPLOYED[assetsup]}" initialize --admin "$ADMIN" >/dev/null

log "  contrib.initialize"
invoke "${DEPLOYED[contrib]}" initialize --admin "$ADMIN" >/dev/null

log "  asset-maintenance.init (registry: assetsup)"
invoke "${DEPLOYED[asset-maintenance]}" init \
  --admin "$ADMIN" --registry "${DEPLOYED[assetsup]}" >/dev/null

log "  multisig-transfer.initialize (registry: assetsup)"
invoke "${DEPLOYED[multisig-transfer]}" initialize \
  --admin "$ADMIN" --asset_registry "${DEPLOYED[assetsup]}" >/dev/null

# multisig-wallet needs an owner set and a threshold. A single-owner wallet is
# invalid (InsufficientOwners), so it is left uninitialized here and must be
# initialized deliberately with the real signer set.
warn "multisig-wallet deployed but NOT initialized: it needs >= 2 owners and a"
warn "threshold. Initialize it explicitly with your real signer set:"
warn "  stellar contract invoke --id ${DEPLOYED[multisig-wallet]} \\"
warn "    --source-account $SOURCE --network $NETWORK \\"
warn "    -- initialize --admin $ADMIN --owners '[...]' --threshold 2"

# ---------------------------------------------------------------- verify

log "Verifying deployments with a read call against each contract"

verify() {
  local name="$1" id="$2"; shift 2
  if invoke "$id" "$@" >/dev/null 2>&1; then
    printf '    %-20s \033[1;32mOK\033[0m\n' "$name"
  else
    printf '    %-20s \033[1;31mFAILED\033[0m\n' "$name"
    return 1
  fi
}

failed=0
verify "assetsup"         "${DEPLOYED[assetsup]}"         get_admin || failed=1
verify "contrib"          "${DEPLOYED[contrib]}"          get_admin || failed=1
verify "asset-maintenance" "${DEPLOYED[asset-maintenance]}" get_asset_stats --asset_id 0 || failed=1
verify "multisig-transfer" "${DEPLOYED[multisig-transfer]}" get_asset_history --asset_id 0000000000000000000000000000000000000000000000000000000000000000 || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo "error: at least one contract failed verification" >&2
  exit 1
fi

# ---------------------------------------------------------------- record

log "Writing $OUT_FILE"
{
  printf '{\n'
  printf '  "network": "%s",\n' "$NETWORK"
  printf '  "admin": "%s",\n' "$ADMIN"
  printf '  "deployedAt": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "contracts": {\n'
  last_index=$(( ${#CONTRACTS[@]} - 1 ))
  for i in "${!CONTRACTS[@]}"; do
    c="${CONTRACTS[$i]}"
    sep=","
    [[ "$i" -eq "$last_index" ]] && sep=""
    printf '    "%s": "%s"%s\n' "$c" "${DEPLOYED[$c]}" "$sep"
  done
  printf '  }\n'
  printf '}\n'
} > "$OUT_FILE"

log "Done. Contract ids are in $OUT_FILE (git-ignored)."
