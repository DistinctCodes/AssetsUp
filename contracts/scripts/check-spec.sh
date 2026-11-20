#!/usr/bin/env bash
# Interface snapshot check: make ABI changes deliberate.
#
# Dumps each contract's public interface from its built WASM and compares it
# with the committed snapshot at contracts/<crate>/spec.json. A renamed,
# re-typed or removed entrypoint therefore fails CI unless the snapshot is
# updated in the same pull request.
#
# Usage (from contracts/, after building the WASM):
#   cargo build --locked --workspace --target wasm32-unknown-unknown --release
#   ./scripts/check-spec.sh                      # compare
#   ./scripts/check-spec.sh --update             # (re)write the snapshots
#   ./scripts/check-spec.sh --require-snapshots  # a missing snapshot is an error
#
# Without --require-snapshots a crate that has no committed snapshot yet only
# produces a warning and a copy of the generated spec under
# target/spec-generated/, so the first snapshots can be bootstrapped from CI.
# Once they are committed, add --require-snapshots to the CI invocation.
#
# Requires the Stellar CLI (`stellar contract info interface`).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_DIR="$ROOT/target/wasm32-unknown-unknown/release"
GEN_DIR="$ROOT/target/spec-generated"
CRATES=(asset-maintenance assetsup contrib multisig-transfer multisig-wallet)

UPDATE=0
REQUIRE=0
for arg in "$@"; do
  case "$arg" in
    --update) UPDATE=1 ;;
    --require-snapshots) REQUIRE=1 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "error: unknown argument '$arg'" >&2; exit 2 ;;
  esac
done

command -v stellar >/dev/null 2>&1 || {
  echo "error: 'stellar' CLI not found on PATH." >&2
  exit 1
}

mkdir -p "$GEN_DIR"
changed=()
missing=()

for crate in "${CRATES[@]}"; do
  wasm="$WASM_DIR/${crate//-/_}.wasm"
  if [[ ! -f "$wasm" ]]; then
    echo "error: $wasm not found. Build first:" >&2
    echo "       cargo build --locked --workspace --target wasm32-unknown-unknown --release" >&2
    exit 1
  fi

  generated="$GEN_DIR/$crate.json"
  stellar contract info interface --wasm "$wasm" --output json-formatted > "$generated"
  snapshot="$ROOT/$crate/spec.json"

  if [[ "$UPDATE" -eq 1 ]]; then
    cp "$generated" "$snapshot"
    echo "updated  $crate/spec.json"
  elif [[ ! -f "$snapshot" ]]; then
    missing+=("$crate")
    echo "::warning::$crate has no committed interface snapshot ($crate/spec.json)"
  elif diff -u "$snapshot" "$generated"; then
    echo "ok       $crate"
  else
    changed+=("$crate")
  fi
done

if [[ ${#changed[@]} -gt 0 ]]; then
  echo >&2
  echo "error: the public interface changed for: ${changed[*]}" >&2
  echo "       If the change is intended, refresh the snapshots and commit them:" >&2
  echo "         ./scripts/check-spec.sh --update" >&2
  exit 1
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "no snapshot yet for: ${missing[*]} (generated copies are in $GEN_DIR)" >&2
  if [[ "$REQUIRE" -eq 1 ]]; then
    echo "error: --require-snapshots is set; run ./scripts/check-spec.sh --update and commit the result." >&2
    exit 1
  fi
fi
exit 0
