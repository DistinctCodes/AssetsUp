#!/usr/bin/env bash
#
# Reports each contract's release WASM size and fails if any exceeds its
# budget ([SC-52]).
#
# Soroban enforces a ledger limit on deployed contract size and charges by
# resource usage. Without tracking, growth is invisible until a deploy fails —
# which is the worst possible moment to discover it.
#
# Usage:
#   cargo build --workspace --target wasm32-unknown-unknown --release
#   ./scripts/check-wasm-size.sh
#
#   ./scripts/check-wasm-size.sh --json      # machine-readable, for PR diffing
#   ./scripts/check-wasm-size.sh --baseline  # rewrite the recorded baselines
#
# Budgets are set roughly 25% above the measured size, so ordinary feature work
# does not trip them but a sudden jump does. Raising a budget should be a
# deliberate, reviewed decision — say why in the PR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
cd "$CONTRACTS_DIR"

WASM_DIR="target/wasm32-unknown-unknown/release"
BASELINE_FILE="scripts/wasm-size-baseline.txt"

MODE="report"
case "${1:-}" in
  --json)     MODE="json" ;;
  --baseline) MODE="baseline" ;;
  "")         ;;
  *) echo "error: unknown argument '$1'" >&2; exit 2 ;;
esac

# Per-contract budget in bytes. Keyed by the artifact name, which uses
# underscores even where the crate name uses hyphens.
budget_for() {
  case "$1" in
    assetsup)          echo 215000 ;;
    contrib)           echo 100000 ;;
    multisig_wallet)   echo  95000 ;;
    asset_maintenance) echo  85000 ;;
    multisig_transfer) echo  85000 ;;
    # An unbudgeted contract fails rather than passing silently: a new
    # deployable contract must get a reviewed budget.
    *)                 echo 0 ;;
  esac
}

if [[ ! -d "$WASM_DIR" ]]; then
  echo "error: $WASM_DIR not found." >&2
  echo "       Run: cargo build --workspace --target wasm32-unknown-unknown --release" >&2
  exit 1
fi

shopt -s nullglob
wasm_files=("$WASM_DIR"/*.wasm)
shopt -u nullglob

if [[ ${#wasm_files[@]} -eq 0 ]]; then
  echo "error: no .wasm artifacts in $WASM_DIR" >&2
  exit 1
fi

# ---------------------------------------------------------------- baseline

if [[ "$MODE" == "baseline" ]]; then
  : > "$BASELINE_FILE"
  {
    echo "# Recorded release WASM sizes in bytes."
    echo "# Regenerate with: ./scripts/check-wasm-size.sh --baseline"
    for wasm in "${wasm_files[@]}"; do
      name=$(basename "$wasm" .wasm)
      printf '%s %s\n' "$name" "$(wc -c < "$wasm" | tr -d ' ')"
    done
  } >> "$BASELINE_FILE"
  echo "Wrote $BASELINE_FILE"
  exit 0
fi

baseline_for() {
  [[ -f "$BASELINE_FILE" ]] || { echo ""; return; }
  awk -v n="$1" '$1 == n { print $2 }' "$BASELINE_FILE"
}

# ---------------------------------------------------------------- json

if [[ "$MODE" == "json" ]]; then
  printf '{\n'
  last=$(( ${#wasm_files[@]} - 1 ))
  for i in "${!wasm_files[@]}"; do
    name=$(basename "${wasm_files[$i]}" .wasm)
    size=$(wc -c < "${wasm_files[$i]}" | tr -d ' ')
    sep=","; [[ "$i" -eq "$last" ]] && sep=""
    printf '  "%s": %s%s\n' "$name" "$size" "$sep"
  done
  printf '}\n'
  exit 0
fi

# ---------------------------------------------------------------- report

failed=0
total=0

printf '%-22s %10s %10s %10s %8s\n' "contract" "size" "baseline" "budget" "result"
printf -- '---------------------------------------------------------------\n'

for wasm in "${wasm_files[@]}"; do
  name=$(basename "$wasm" .wasm)
  size=$(wc -c < "$wasm" | tr -d ' ')
  budget="$(budget_for "$name")"
  baseline="$(baseline_for "$name")"
  total=$(( total + size ))

  if [[ "$budget" -eq 0 ]]; then
    printf '%-22s %10s %10s %10s %8s\n' "$name" "$size" "${baseline:--}" "none" "FAIL"
    echo "    ^ no budget configured. Add one to budget_for() in this script." >&2
    failed=1
    continue
  fi

  # Show the delta against the recorded baseline so growth is visible even
  # while still inside budget.
  delta=""
  if [[ -n "$baseline" && "$baseline" -gt 0 ]]; then
    diff=$(( size - baseline ))
    if [[ "$diff" -gt 0 ]]; then
      delta="+${diff}"
    elif [[ "$diff" -lt 0 ]]; then
      delta="${diff}"
    else
      delta="0"
    fi
  fi

  if [[ "$size" -gt "$budget" ]]; then
    printf '%-22s %10s %10s %10s %8s\n' "$name" "$size" "${baseline:--}" "$budget" "FAIL"
    over=$(( size - budget ))
    echo "    ^ over budget by ${over} bytes" >&2
    failed=1
  else
    headroom=$(( budget - size ))
    printf '%-22s %10s %10s %10s %8s\n' "$name" "$size" "${baseline:--}" "$budget" "ok"
    if [[ -n "$delta" && "$delta" != "0" ]]; then
      printf '    delta vs baseline: %s bytes (%s headroom)\n' "$delta" "$headroom"
    fi
  fi
done

printf -- '---------------------------------------------------------------\n'
printf '%-22s %10s\n' "total" "$total"

if [[ "$failed" -ne 0 ]]; then
  echo >&2
  echo "WASM size budget exceeded. Either reduce the artifact, or raise the" >&2
  echo "budget in scripts/check-wasm-size.sh with a reason in the PR." >&2
  exit 1
fi

echo
echo "All contracts within budget."
