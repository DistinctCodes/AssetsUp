# Contract security

Threat model, trust assumptions, and the pre-deployment checklist for the five
crates in `contracts/`. Contract changes are reviewed against the
[checklist](#pre-deployment-checklist) below.

**These contracts have not been externally audited.** They govern asset
ownership, multisig approvals, escrow, KYC, and dividends. Treat everything here
as pre-production until an audit is complete and the open items in
[Known accepted risks](#known-accepted-risks) are closed.

## Trust model

### Who is trusted

| Principal | Held by | Can do | Blast radius if compromised |
|---|---|---|---|
| **Contract admin** | One address per contract, set at `initialize` | Add/remove registrars, pause and unpause, change admin, approve KYC, manage oracle sources, register providers | **Total.** Can authorize itself as a registrar, register or retire arbitrary assets, and hand the admin role to an attacker. Admin transfer is single-step, so a compromised admin can lock out the legitimate operator irreversibly. |
| **Authorized registrar** | Addresses on the `assetsup`/`contrib` allowlist | Register assets, update asset metadata | Can mint fraudulent asset records and pollute the registry. Cannot directly steal an existing asset in `contrib`. |
| **Asset owner** | The `owner` field of an asset | Transfer, retire, tokenize, lease, insure their own asset | Limited to that owner's assets. |
| **Multisig signer** | Members of `owners` in `multisig-wallet` | Submit, confirm, and propose; *m* of them can execute anything | *m* compromised signers is equivalent to full wallet control. Fewer than *m* can grief by consuming ids but cannot execute. |
| **Approver** | Addresses satisfying a `multisig-transfer` `ApprovalRule` | Approve or reject transfer requests | Enough colluding approvers can move any asset in the category they govern. |
| **Oracle source** | Allowlisted addresses in `contrib::oracle` | Write asset valuations | Can distort valuations, which feed dividend and share calculations. |
| **Backend signer** | The service account the API signs with | Whatever role it has been granted on-chain | It is a hot key in a server process. Grant it the narrowest role that works — registrar, never admin. |

### Who is not trusted

Everyone else. Any address can call any entrypoint; Soroban does **not**
authenticate callers implicitly. An entrypoint is protected only if it calls
`require_auth()` on the correct address.

### Trust boundaries

- **Backend → contracts.** The backend is an ordinary client. Contracts must not
  assume the backend validated anything.
- **`multisig-transfer` → registry.** `multisig-transfer` calls into the
  registry contract stored at `AssetRegistry` to move ownership. That registry
  address is set at `initialize` with no authorization and is never re-verified.
- **`assetsup` ↔ `contrib`.** No trust relationship — they are independent
  deployments with separate storage that never call each other.

## Assets at risk, by contract

| Contract | What an attacker gains | Highest-risk entrypoints |
|---|---|---|
| `assetsup` | Ownership of any registered asset; fractional share balances; undistributed dividends | `transfer_asset_ownership`, `register_asset`, `retire_asset`, `mint_tokens`, `distribute_dividends` |
| `contrib` | Escrowed value; KYC approval status; staked balances; valuation feed | `create_escrow`, `confirm_release`, `approve_kyc`, `update_valuation`, `unstake_tokens` |
| `multisig-wallet` | Anything the wallet controls | `execute_transaction`, `execute_proposal`, `emergency_unfreeze` |
| `multisig-transfer` | Ownership of assets whose category rule it governs | `execute_transfer`, `configure_approval_rule`, `initialize` |
| `asset-maintenance` | Falsified audit evidence; fraudulent warranty claims | `add_maintenance_record`, `file_warranty_claim`, `add_warranty_information` |

## Known accepted risks

Each is tracked; none is closed. Do not deploy to a network holding real value
until the ones marked **blocking** are fixed.

| # | Risk | Status |
|---|---|---|
| 1 | **`assetsup` does not authenticate `caller`.** `register_asset`, `update_asset_metadata`, `transfer_asset_ownership`, and `retire_asset` compare a caller-supplied `caller` argument against an allowlist/owner/admin but never call `caller.require_auth()`. Any account can name a privileged address and pass the check. `transfer_asset_ownership` is a direct asset-theft path. | **Blocking** — [SC-42] |
| 2 | **Unguarded entrypoints in `asset-maintenance`.** `init`, `update_maintenance_schedule`, `complete_scheduled_maintenance`, `add_warranty_information`, `update_warranty_information`, `file_warranty_claim`, and `create_maintenance_alert` perform no authorization at all. Audit evidence is forgeable. | **Blocking** — [SC-42] |
| 3 | **`initialize` is front-runnable** in `contrib` and `multisig-transfer` — neither authorizes the caller, so whoever calls first becomes admin. Deploy and initialize in the same transaction, or accept the race. | **Blocking** — [SC-42] |
| 4 | **Admin transfer is single-step.** One typo permanently bricks administration, with no on-chain undo. | Open — [SC-48] |
| 5 | **Arithmetic can trap rather than error.** `overflow-checks = true` turns overflow into a panic. Value paths should return typed errors. | Open — [SC-43] |
| 6 | **No deliberate TTL policy.** A persistent entry whose TTL lapses is archived; an archived registry entry or pending approval is a correctness bug. | Open — [SC-44] |
| 7 | **Pause coverage is unverified.** `contrib` has a pause module; whether every mutating entrypoint honours it — and whether the other crates have one at all — is unconfirmed. | Open — [SC-47] |
| 8 | **No upgrade story.** No contract exposes an upgrade entrypoint and no storage-version key exists, so a storage layout change means redeploying and losing data. | Open — [SC-49] |
| 9 | **No dependency scanning.** Nothing checks for advisories in transitive dependencies. | Open — [SC-38] |
| 10 | **Error codes collide across contracts.** The same integer means different things per contract, so a backend cannot map a code without knowing which contract produced it. | Open — [SC-45] |
| 11 | **`multisig_transfer` has no tests**, and `multisig-wallet` and `asset-maintenance` have four each. | Open — [SC-32], [SC-40], [SC-41] |
| 12 | **Contracts are unaudited.** No external review has been performed. | Open |

## Pre-deployment checklist

Work through this before deploying to any network that holds real value. Each
item names the issue that established the requirement.

### Authorization — [SC-42]
- [ ] Every state-changing entrypoint calls `require_auth()` on the correct principal.
- [ ] No entrypoint trusts a caller-supplied address argument as proof of identity.
- [ ] `require_auth_for_args` is used where authorization must bind to amounts or recipients.
- [ ] Each protected entrypoint has a negative test **without** `mock_all_auths`.
- [ ] `initialize` cannot be front-run, or deployment and initialization are atomic.

### Arithmetic — [SC-43]
- [ ] No unchecked `+`/`-`/`*` on any path handling amounts, shares, or percentages.
- [ ] Overflow returns a typed error rather than trapping.
- [ ] Rounding direction is documented, and who absorbs the remainder is explicit.
- [ ] Boundary tests exist at `0`, `1`, and type max.

### Storage and TTL — [SC-44]
- [ ] Every storage write uses the right durability (instance / persistent / temporary).
- [ ] Long-lived data is never in `temporary`.
- [ ] Persistent entries that must outlive the default are extended on read and write.
- [ ] Instance TTL is bumped in every entrypoint touching instance storage.
- [ ] TTL constants are defined in one place.
- [ ] A test advances the ledger and proves critical entries survive.

### Emergency controls — [SC-47]
- [ ] Every mutating entrypoint respects the pause guard.
- [ ] Read-only entrypoints still work while paused.
- [ ] Whether withdrawal and escrow-release are exempt is a documented decision.
- [ ] A test fails if a new mutating entrypoint is added without a pause check.

### Admin and upgrades — [SC-48], [SC-49]
- [ ] Admin transfer is two-step; an address that never accepts leaves the original admin in place.
- [ ] Each contract's upgrade posture is documented (upgradeable or immutable).
- [ ] Upgrade entrypoints are admin-gated and emit an event.
- [ ] A storage-version key exists and migration is idempotent.
- [ ] An upgrade test proves state survives a version bump.

### Dependencies — [SC-38]
- [ ] `cargo audit` passes with no unignored advisories.
- [ ] `cargo deny` passes for licenses, advisories, and duplicate versions.
- [ ] Every ignored advisory has a written rationale and an expiry date.

### Build and size — [SC-34], [SC-37], [SC-52]
- [ ] Every deployable contract builds for `wasm32-unknown-unknown`.
- [ ] Release profile has size optimizations enabled and `overflow-checks = true` retained.
- [ ] Each contract's WASM size is within budget and the delta was reviewed.

### Tests and observability — [SC-32], [SC-36], [SC-39]
- [ ] `cargo test --all` passes.
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` is clean.
- [ ] `cargo fmt --all -- --check` is clean.
- [ ] No crate is at zero coverage; per-crate floors pass.
- [ ] Every state-changing entrypoint emits an event.
- [ ] The event catalogue matches what the backend consumes.

### Deployment — [SC-55]
- [ ] Deployment is scripted and reproducible from a clean checkout.
- [ ] Contract ids are recorded in `deployments/<network>.json`.
- [ ] No key material is committed or logged.
- [ ] Each deployed contract answered a read call.
- [ ] `multisig-wallet` was initialized with the real signer set and a threshold > 1.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.**

Report privately through
[GitHub Security Advisories](https://github.com/DistinctCodes/AssetsUp/security/advisories/new),
which creates a channel visible only to maintainers. If that is unavailable,
contact a maintainer listed on the organization profile directly.

Please include:

- The affected contract and entrypoint.
- What an attacker gains, and what they need to start.
- A reproduction — ideally a failing test against this workspace.
- Any suggested fix.

What to expect:

| Stage | Target |
|---|---|
| Acknowledgement | 3 working days |
| Initial assessment and severity | 10 working days |
| Fix or documented mitigation | Depends on severity; critical issues are prioritized above all other work |

Please give maintainers a reasonable window to ship a fix before disclosing
publicly. Reporters are credited in the advisory unless they ask not to be.

### Scope

**In scope:** everything under `contracts/` — all five crates, the release
profile, CI workflows that produce deployable artifacts, and the deployment
scripts.

**Out of scope:** the unaudited status itself and the items already listed in
[Known accepted risks](#known-accepted-risks) — those are tracked, not news.
Backend and frontend issues belong in their own reports.
