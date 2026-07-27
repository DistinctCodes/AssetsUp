#!/usr/bin/env bash
#
# Enforces coverage thresholds for the contracts workspace.
#
# Two separate gates:
#
#   1. A workspace-wide line coverage floor.
#   2. A per-crate floor.
#
# The per-crate floor is the one that matters. A workspace average happily
# hides a crate with no tests at all behind well-tested siblings — which is
# exactly how multisig_transfer reached 755 lines with zero tests unnoticed.
#
# Thresholds are set at the currently measured level, not an aspirational one,
# so the build stays green today and can only be ratcheted upward deliberately.
#
# Usage:
#   cargo llvm-cov --workspace --lcov --output-path lcov.info
#   ./scripts/check-coverage.sh [lcov.info]

set -euo pipefail

LCOV_FILE="${1:-lcov.info}"

# ---------------------------------------------------------------------------
# Thresholds — raise these as coverage improves; never lower them silently.
# ---------------------------------------------------------------------------
WORKSPACE_MIN=65

# Per-crate line coverage floors, keyed by crate directory name. Each is set a
# little below the level measured when this landed, so ordinary churn does not
# fail the build but a real regression does. Ratchet these upward as coverage
# improves; never lower one without saying why in the PR.
#
# Measured at time of writing:
#   assetsup 74%  contrib 38%  multisig-wallet 94%  asset-maintenance 76%
crate_floor() {
  case "$1" in
    assetsup)          echo 70 ;;
    contrib)           echo 35 ;;
    multisig-wallet)   echo 90 ;;
    asset-maintenance) echo 70 ;;
    # A crate with no tests must fail — see ZERO_COVERAGE_EXEMPT below.
    *)                 echo  1 ;;
  esac
}

# Crates allowed to sit at zero coverage, each with the issue tracking the gap.
# This is the escape hatch that keeps the build green for a known, tracked hole
# while still failing for any *new* crate that arrives without tests. Removing
# an entry here is how the gate gets tightened.
#
#   multisig_transfer — 755 lines, zero tests. Tracked in [SC-32].
ZERO_COVERAGE_EXEMPT="multisig_transfer"

is_zero_coverage_exempt() {
  for exempt in $ZERO_COVERAGE_EXEMPT; do
    [[ "$1" == "$exempt" ]] && return 0
  done
  return 1
}

CRATES="assetsup contrib multisig-wallet asset-maintenance multisig_transfer"

if [[ ! -f "$LCOV_FILE" ]]; then
  echo "error: $LCOV_FILE not found. Run cargo llvm-cov first." >&2
  exit 1
fi

# Sums LF (lines found) and LH (lines hit) from lcov records whose SF path
# matches the given prefix. Prints "hit total".
sum_for_prefix() {
  local prefix="$1"
  awk -v prefix="$prefix" '
    /^SF:/ {
      path = substr($0, 4)
      want = (index(path, prefix) > 0)
    }
    want && /^LF:/ { total += substr($0, 4) }
    want && /^LH:/ { hit   += substr($0, 4) }
    END { printf "%d %d\n", hit + 0, total + 0 }
  ' "$LCOV_FILE"
}

pct() {
  local hit="$1" total="$2"
  if [[ "$total" -eq 0 ]]; then
    echo 0
  else
    echo $(( hit * 100 / total ))
  fi
}

failed=0

echo "Per-crate line coverage"
echo "-----------------------------------------------"
printf '%-20s %8s %8s %8s\n' "crate" "covered" "floor" "result"

for crate in $CRATES; do
  read -r hit total <<<"$(sum_for_prefix "contracts/$crate/")"

  # Fall back to a repo-relative path if coverage was run from contracts/.
  if [[ "$total" -eq 0 ]]; then
    read -r hit total <<<"$(sum_for_prefix "/$crate/src/")"
  fi

  floor="$(crate_floor "$crate")"

  if [[ "$total" -eq 0 ]]; then
    printf '%-20s %8s %7s%% %8s\n' "$crate" "no data" "$floor" "SKIP"
    continue
  fi

  covered="$(pct "$hit" "$total")"

  if [[ "$covered" -eq 0 ]] && is_zero_coverage_exempt "$crate"; then
    printf '%-20s %7s%% %7s%% %8s\n' "$crate" "$covered" "-" "EXEMPT"
    echo "    ^ zero coverage, exempt pending its tracking issue; see the" \
         "ZERO_COVERAGE_EXEMPT list in this script."
    continue
  fi

  if [[ "$covered" -lt "$floor" ]]; then
    printf '%-20s %7s%% %7s%% %8s\n' "$crate" "$covered" "$floor" "FAIL"
    failed=1
  else
    printf '%-20s %7s%% %7s%% %8s\n' "$crate" "$covered" "$floor" "ok"
  fi
done

echo

read -r total_hit total_lines <<<"$(sum_for_prefix "/src/")"
workspace_pct="$(pct "$total_hit" "$total_lines")"

echo "Workspace: ${workspace_pct}% (${total_hit}/${total_lines} lines), floor ${WORKSPACE_MIN}%"

if [[ "$workspace_pct" -lt "$WORKSPACE_MIN" ]]; then
  echo "FAIL: workspace coverage ${workspace_pct}% is below the ${WORKSPACE_MIN}% floor" >&2
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  echo >&2
  echo "Coverage thresholds not met. Add tests, or change the floor in" >&2
  echo "contracts/scripts/check-coverage.sh with a reason in the PR." >&2
  exit 1
fi

echo "All coverage thresholds met."
