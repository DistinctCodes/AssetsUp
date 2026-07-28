# Build profiles, WASM size, and quality gates

## Release profile

Soroban charges for resource usage and enforces a size limit on deployed
contracts, so the release profile in [`Cargo.toml`](Cargo.toml) is tuned for the
smallest artifact that is still safe to run.

| Setting | Value | Why |
|---|---|---|
| `opt-level` | `"z"` | Optimize for size rather than speed. |
| `lto` | `true` | Cross-crate inlining and dead-code elimination. |
| `codegen-units` | `1` | Lets LLVM see the whole crate at once. |
| `strip` | `"symbols"` | Symbol names are dead weight on-chain. |
| `debug` | `0` | No debug info in a deployed artifact. |
| `panic` | `"abort"` | Unwinding tables are unusable in Soroban. |
| `overflow-checks` | `true` | **Kept deliberately** — see below. |

### Why `overflow-checks` stays on

It costs size and gas. These contracts move asset value, share counts, and
dividend splits, where a silent wraparound is far worse than a trapped
transaction. The trap is not the end state we want either — converting these
into typed errors is tracked in [SC-43] — but until then, trapping beats
wrapping.

### `release-with-logs`

A second profile inherits `release` and re-enables `debug-assertions`, for
debugging on testnet where a precondition failure should be loud:

```sh
cargo build --workspace --target wasm32-unknown-unknown --profile release-with-logs
```

Never deploy this to mainnet. Debug assertions change failure behaviour and add
size.

## Measured WASM size

Built with `cargo build --workspace --target wasm32-unknown-unknown --release`,
before any `stellar contract optimize` pass.

| Contract | Before | After | Change |
|---|---:|---:|---:|
| `assetsup` | 162,775 | 103,140 | **−36.6%** |
| `contrib` | 79,282 | 47,758 | **−39.8%** |
| `multisig_wallet` | 74,214 | 43,157 | **−41.8%** |
| `asset_maintenance` | 65,756 | 23,421 | **−64.4%** |
| `multisig_transfer` | 58,609 | 31,707 | **−45.9%** |
| **Total** | **440,636** | **249,183** | **−43.4%** |

`asset-maintenance` gains the most because it was carrying the most
monomorphized code that `lto` could collapse. `assetsup` remains the largest by
a wide margin and is the crate to watch against the deployment limit — it is
the subject of the split assessment in [SC-46].

These are the baselines. Tracking size per PR and enforcing a budget is
[SC-52].

All 298 tests pass unchanged under `panic = "abort"`.

## Quality gates in CI

| Job | Command | Gate |
|---|---|---|
| Format Check | `cargo fmt --all -- --check` | Fails on any formatting drift. |
| Clippy Lint | `cargo clippy --all-targets --all-features -- -D warnings` | Warnings are errors. |
| Test Suite | `cargo test --all` | All tests must pass. |
| Build Check | `cargo build --all` | Native build. |
| Build WASM | `cargo build --package contrib --target wasm32-unknown-unknown --release` | Deployability. Extending this to all contracts is [SC-34]. |
| Dependency Audit | `cargo audit`, `cargo deny check` | Advisories, licences, sources. |
| Code Coverage | `cargo llvm-cov` + `scripts/check-coverage.sh` | Workspace and per-crate floors. |

### Dependency audit

[`deny.toml`](deny.toml) configures four checks: advisories, a permissive
licence allowlist, duplicate-version detection, and a crates.io-only source
policy. The job also runs weekly on a schedule, because a lockfile that was
clean at merge time can become vulnerable without anything in the repo
changing.

Run it locally:

```sh
cargo install --locked cargo-deny cargo-audit
cd contracts
cargo deny --all-features check
cargo audit --file Cargo.lock --deny warnings
```

**Triaging an advisory** — the process is documented inline in `deny.toml`.
The short version: determine whether the vulnerable path is reachable from a
contract entrypoint; if it is, fix it rather than ignoring it; if it genuinely
is not, add it to `ignore` with the reasoning and a review date no more than 90
days out.

Two ignores are currently in place, both unmaintained-crate notices for
compile-time proc macros reached through `soroban-sdk` (`derivative`, `paste`).
Neither puts code into a deployed contract.

Yanked crates are set to `warn` rather than `deny`: `soroban-sdk` 22 pins yanked
versions of `spin` and `keccak` inside its own tree, unresolvable from this
workspace by any `cargo update`. Denying would mean a permanently red job that
everyone learns to ignore. The SDK upgrade in [SC-35] is expected to clear both.

### Coverage

```sh
cargo install --locked cargo-llvm-cov
cd contracts
cargo llvm-cov --workspace --lcov --output-path lcov.info
./scripts/check-coverage.sh
```

Two gates, and the second is the one that matters:

1. **Workspace floor** — currently 65%.
2. **Per-crate floor** — a workspace average happily hides a crate with no
   tests behind well-tested siblings, which is exactly how `multisig_transfer`
   reached 755 lines with zero tests unnoticed.

Measured when this landed:

| Crate | Coverage | Floor |
|---|---:|---:|
| `multisig-wallet` | 94% | 90% |
| `asset-maintenance` | 76% | 70% |
| `assetsup` | 74% | 70% |
| `contrib` | 38% | 35% |
| `multisig_transfer` | 0% | exempt |
| **Workspace** | **67%** | **65%** |

Floors sit a few points under the measured value so ordinary churn does not
fail the build while a real regression does. Ratchet them upward as coverage
improves.

Any crate at zero coverage **fails**, unless it is named in the
`ZERO_COVERAGE_EXEMPT` list in the script with its tracking issue.
`multisig_transfer` is the only entry, pending [SC-32]. That keeps the build
green for a known, tracked hole while still failing for any new crate that
arrives without tests — removing the entry is how the gate gets tightened.
