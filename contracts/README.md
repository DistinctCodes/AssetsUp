# AssetsUp Soroban Contracts

Stellar/Soroban smart contracts backing the AssetsUp asset-management platform.
The workspace holds five crates covering the asset registry, multisig approval
of high-value transfers, escrow and KYC, and on-chain maintenance history.

## Crate map

| Crate | Directory | Deployable | Responsibility |
|---|---|---|---|
| `assetsup` | [`assetsup/`](assetsup/) | yes | Primary asset registry: registration, ownership transfer, tokenization, dividends, voting, leasing, insurance, detokenization. |
| `contrib` | [`contrib/`](contrib/) | yes | Secondary registry: audit log, emergency pause, insurance, leasing, KYC, price oracle, staking, escrow. |
| `multisig-wallet` | [`multisig-wallet/`](multisig-wallet/) | yes | General-purpose *m-of-n* wallet: transaction submission, confirmation, execution, owner/threshold governance, emergency freeze. |
| `multisig-transfer` | [`multisig-transfer/`](multisig-transfer/) | yes | Approval workflow for asset transfers, gated on per-category approval rules. Calls into a registry contract to move ownership. |
| `asset-maintenance` | [`asset-maintenance/`](asset-maintenance/) | yes | On-chain maintenance history, schedules, warranties, provider registry, and alerts. |

All five build to WASM and are deployable. `assetsup`, `contrib`,
`multisig-wallet`, and `multisig-transfer` additionally declare `crate-type =
["lib", "cdylib"]` so they can be imported by integration tests; only
`asset-maintenance` is `cdylib`-only.

Every crate has its own README with an entrypoint table, storage layout,
emitted events, and error list. Start there.

## How `assetsup` and `contrib` relate

This is the most common source of confusion in the workspace, because the two
crates share several module names (`audit`, `insurance`, `lease`).

They are **two independent contracts, deployed separately, with separate
storage**. Neither reads the other's state. The overlap is duplicated code, not
a shared library:

- **`assetsup` is the authoritative asset registry.** It is the larger crate
  (~8,900 lines), it is the one the backend is expected to treat as the source
  of truth for asset identity and ownership, and it is the only one with
  tokenization, dividends, voting, detokenization, and transfer restrictions.
- **`contrib` is a second, smaller registry** with an audit log, an emergency
  pause, insurance, leasing, KYC, a price oracle, staking, and escrow.

Where a module name appears in both, the implementations have diverged and are
not interchangeable. `assetsup::insurance` models policies and claims with a
full claim state machine; `contrib::insurance` is a smaller policy/claim store.
The same holds for `lease` and `audit`.

`contrib` used to carry ~1,670 lines of source that had no `mod` declaration
and were never compiled — including a `tokenization.rs` that duplicated
`assetsup`'s and did not even parse. [SC-57] resolved that: the genuine
duplicates (tokenization, detokenization, transfer restrictions, and the
`error.rs` that only served them) were deleted from `contrib` in favor of
`assetsup`'s versions, and the remaining files (KYC, oracle, staking, escrow —
capability `assetsup` doesn't have) were rewritten to fit the crate's module
conventions and wired into `ContribContract`. Every file in `contrib/src/` now
compiles; see [`contrib/README.md`](contrib/README.md) for its entrypoints.

Deduplicating the module names that still legitimately appear in both crates
(`audit`, `insurance`, `lease`) — deciding which one owns each concern — is
tracked in [SC-46]. Until that lands, treat the two as separate contracts and
consult the per-crate README for the behaviour of the specific one you are
calling.

## Toolchain

The Rust toolchain is **pinned** in [`rust-toolchain.toml`](rust-toolchain.toml).
`rustup` picks it up automatically for any command run inside `contracts/`, and
every contracts job in [`.github/workflows/CI.yaml`](../.github/workflows/CI.yaml)
reads the same `channel` value, so local and CI builds always use the same
compiler.

Current pin: **Rust 1.96.0**, with the `rustfmt` and `clippy` components and the
`wasm32-unknown-unknown` target.

Floating `stable` is deliberately avoided. A new stable release can introduce
clippy lints that fail `-D warnings` on a pull request that changed nothing,
turning an unrelated Rust release into a broken build for every open PR.

### Upgrading the toolchain

Bump the toolchain **in its own dedicated pull request** so that any lint churn
is isolated from feature work and reviewable on its own:

1. Edit `channel` in `contracts/rust-toolchain.toml`.
2. Run `cargo fmt --all`, then `cargo clippy --all-targets --all-features -- -D warnings`
   and fix any lints the new release introduced.
3. Confirm `cargo test --all` still passes and that the pinned `soroban-sdk`
   version still compiles — the SDK sets its own MSRV and can lag new releases.
4. Open the PR with only the toolchain bump and its lint fixes.

CI needs no change: it reads the channel from the file.

## Local development

```sh
cd contracts

cargo build --all
cargo test --all
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

CI enforces all four. Run them before opening a pull request.

Build a contract for deployment:

```sh
cargo build --package assetsup --target wasm32-unknown-unknown --release
```

## Deployment

Scripted, reproducible testnet deployment lives in
[`scripts/deploy.sh`](scripts/deploy.sh). See
[`scripts/README.md`](scripts/README.md) for prerequisites and usage.

## Security

The trust model, per-contract attack surface, and the pre-deployment checklist
are documented in [`SECURITY.md`](SECURITY.md). Contract changes are reviewed
against that checklist.

## Naming conventions

- Crate (package) names use **hyphens**: `multisig-wallet`, `asset-maintenance`.
- Directory names match the package name for every crate, so
  `cargo <cmd> -p <dirname>` works throughout. The last exception,
  `multisig_transfer/` holding the package `multisig-transfer`, was renamed in
  [SC-33].
- Workspace member paths are listed bare and alphabetically — no `./` prefixes,
  no mixed separators.
