#!/usr/bin/env bash
# Generate typed TypeScript clients for every contract from its built WASM.
#
# The output goes to packages/contracts-ts/<crate>/ (override with
# BINDINGS_OUT). A signature change in the Rust code then shows up as a type
# error in whatever imports the client, instead of at runtime.
#
# Usage (from contracts/, after building the WASM):
#   cargo build --locked --workspace --target wasm32-unknown-unknown --release
#   ./scripts/generate-bindings.sh
#
# Requires the Stellar CLI (`stellar contract bindings typescript`).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$ROOT/target/wasm32-unknown-unknown/release"
OUT="${BINDINGS_OUT:-$ROOT/../packages/contracts-ts}"
CRATES=(asset-maintenance assetsup contrib multisig-transfer multisig-wallet)

command -v stellar >/dev/null 2>&1 || {
  echo "error: 'stellar' CLI not found on PATH." >&2
  exit 1
}

for crate in "${CRATES[@]}"; do
  wasm="$WASM_DIR/${crate//-/_}.wasm"
  if [[ ! -f "$wasm" ]]; then
    echo "error: $wasm not found. Build first:" >&2
    echo "       cargo build --locked --workspace --target wasm32-unknown-unknown --release" >&2
    exit 1
  fi
  echo "==> bindings for $crate"
  stellar contract bindings typescript \
    --wasm "$wasm" \
    --output-dir "$OUT/$crate" \
    --overwrite
done

echo "generated bindings in $OUT"
