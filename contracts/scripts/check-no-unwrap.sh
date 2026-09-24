#!/usr/bin/env bash
# Fail if production contract entrypoints contain bare .unwrap() / .expect().
# Allowed: inside #[cfg(test)] modules, and .unwrap_or / .unwrap_or_else.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

check_file() {
  local file="$1"
  # Strip test modules (rough: from #[cfg(test)] to end of file is imperfect,
  # so we only scan known production files and exclude known test files).
  if grep -nE '\.(unwrap|expect)\(' "$file" | grep -vE '\.(unwrap_or|unwrap_or_else)\(' | grep -vE '^\s*//' ; then
    echo "ERROR: bare .unwrap()/.expect() in $file"
    FAIL=1
  fi
}

echo "Checking multisig-wallet production sources..."
check_file "$ROOT/multisig-wallet/src/lib.rs"
# events.rs has none

echo "Checking contrib production sources..."
for f in lib.rs pause.rs insurance.rs lease.rs escrow.rs kyc.rs oracle.rs staking.rs audit.rs; do
  check_file "$ROOT/contrib/src/$f"
done

echo "Checking asset-maintenance production sources..."
check_file "$ROOT/asset-maintenance/src/lib.rs"

if [ "$FAIL" -ne 0 ]; then
  echo "check-no-unwrap: FAILED"
  exit 1
fi
echo "check-no-unwrap: OK"
exit 0
