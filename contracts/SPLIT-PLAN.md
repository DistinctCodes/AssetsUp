# Splitting `assetsup`: assessment and migration plan

Assessment for [SC-46]. **No code is moved by this change.** The issue asks for
a plan agreed before implementation, and that is what this is.

## The numbers, corrected

The issue describes `assetsup` as "8,894 lines across 33 files". That figure
counts tests. The split-relevant number is smaller:

| | Files | Lines |
|---|---:|---:|
| `assetsup` contract source | 13 | 3,504 |
| `assetsup` tests | 22 | 6,238 |
| **Total** | **35** | **9,742** |

So the contract itself is ~3,500 lines, not ~8,900. Two thirds of the crate is
test code, which is a good sign rather than a problem, and it materially
changes the case for splitting: this is a large module, not an unmanageable
one.

Contract source by module:

| Module | Lines | Concern |
|---|---:|---|
| `lib.rs` | 1,063 | Entrypoint facade for everything below |
| `insurance.rs` | 518 | Policies and the claim state machine |
| `tokenization.rs` | 475 | Fractional shares, balances, locks |
| `error.rs` | 256 | Error enum |
| `types.rs` | 227 | Shared types |
| `lease.rs` | 226 | Lease lifecycle |
| `detokenization.rs` | 198 | Detokenization proposals |
| `transfer_restrictions.rs` | 159 | Whitelists |
| `voting.rs` | 153 | Weighted voting |
| `dividends.rs` | 118 | Distribution and claims |
| `audit.rs` | 53 | Audit log |
| `asset.rs` | 39 | Asset struct and registry keys |
| `branch.rs` | 19 | Branch records |

## Recommendation

**Do not split `assetsup` into multiple contracts yet.** Resolve the
`assetsup`/`contrib` duplication first, then reassess against a measured WASM
size problem rather than an assumed one.

The reasoning:

1. **There is no size emergency.** `assetsup` builds to 103 KB with the
   hardened release profile from [SC-37], down from 163 KB. That is
   comfortably inside Soroban's limits. Splitting to solve a size problem that
   is not currently binding trades a real cost for a speculative benefit.

2. **Splitting multiplies the attack surface it is meant to reduce.** Today the
   asset registry and the modules acting on it share one storage space and one
   atomic transaction boundary. Separate contracts mean cross-contract calls,
   which means each callee must independently verify the caller — and the
   authorization audit in [SC-42] found ten entrypoints that were not checking
   authorization *within a single contract*. Adding trust boundaries before
   that class of bug is under control makes things worse, not better.

3. **The real coupling problem is `assetsup` versus `contrib`, not
   `assetsup`'s internals.** Two contracts implement `audit`, `insurance` and
   `lease` differently, and nobody can say which is authoritative. That is a
   correctness and ownership problem today. Module boundaries inside
   `assetsup` are a code-organization problem, which is much less urgent.

4. **Nothing can be upgraded piecemeal regardless.** The issue cites piecemeal
   upgrade as a motivation, but no contract in the workspace exposes an upgrade
   entrypoint at all ([SC-49]). Splitting does not deliver that benefit until
   upgradeability exists.

## What to do first: resolve the duplication

`assetsup` and `contrib` are independent contracts with separate storage that
share several module names. The overlap is duplicated code, not a shared
library.

An important finding while mapping the boundaries: **most of `contrib` is not
compiled.** `contrib/src/lib.rs` declares only `audit`, `pause`, `types`,
`insurance` and `lease`. The escrow, KYC, staking, oracle, tokenization,
detokenization, transfer-restriction and `error.rs` files have no `mod`
declaration and are not part of the crate — about 1,670 lines that never ship.
The deployed `ContribContract` therefore has no escrow, no KYC, no staking, no
oracle, and no typed errors, despite the source files sitting right there.

That reframes the whole question. The overlap is much smaller than it appears:

| Concern | `assetsup` | `contrib` (compiled) | Proposed owner |
|---|---|---|---|
| Asset registry | ✅ richer | ✅ separate copy | **`assetsup`** — it is the authoritative registry |
| Audit log | ✅ | ✅ | **`assetsup`** |
| Insurance | ✅ full claim state machine | smaller policy/claim store | **`assetsup`** — `contrib`'s is a strict subset |
| Leasing | ✅ richer lifecycle | check-in/cancel only | **`assetsup`** — same |
| Emergency pause | ✅ (now full coverage, [SC-47]) | ✅ dedicated module | **`assetsup`** |
| Tokenization, dividends, voting, detokenization | ✅ | ❌ dead files | **`assetsup`** |
| Escrow, KYC, staking, oracle | — | ❌ dead files | **Undecided** — see below |

For every concern that actually ships in both, `assetsup`'s implementation is
the superset. There is no case where `contrib`'s compiled version is the better
one to keep.

### Proposed resolution

1. **Decide what `contrib` is for.** Two honest options:
   - *Delete it.* Everything it compiles today, `assetsup` already does better.
   - *Make it the second contract it was evidently meant to be* by wiring in
     escrow, KYC, staking and the oracle — the capabilities `assetsup` genuinely
     lacks. This needs a security review of code that has never compiled;
     `tokenization.rs` does not even parse as valid contract code.

   This is a maintainer decision, not one to make inside a refactor.

2. **Whichever is chosen, delete the dead files.** Leaving 1,670 lines of
   uncompiled source that looks like working code is actively misleading —
   every reader so far, including the issue that prompted this assessment, has
   assumed `contrib` owns escrow and KYC.

3. **Only then** reassess splitting `assetsup`.

## If the split does go ahead

Recorded so the decision does not have to be reconstructed later.

### What is a separate contract versus a shared internal

Genuinely separate — distinct lifecycles, distinct principals, meaningful
alone:

| Candidate | Lines | Why it stands alone |
|---|---:|---|
| **Insurance** | 518 | Insurers and claimants are not asset owners. The claim state machine is self-contained. The largest single module and the weakest coupling to the registry. |
| **Leasing** | 226 | Lessor/lessee lifecycle is independent of ownership; a lease does not change the owner. |

Not separable — they are the registry, or meaningless without its state:

| Module | Why it stays |
|---|---|
| `asset`, `branch`, `audit` | These *are* the registry. |
| `tokenization` | Share balances are the registry's ownership model in fractional form. |
| `dividends`, `voting`, `detokenization` | All read token balances on every call. Splitting turns each into a cross-contract read. |
| `transfer_restrictions` | Consulted inside every transfer; a hot path. |

So the realistic target is **three contracts, not eight**: a registry core,
insurance, and leasing.

### Shared types

Extract into a `assetsup-types` library crate (`crate-type = ["lib"]`, never
deployed) rather than duplicating: `AssetStatus`, `AssetType`, `ActionType`,
`CustomAttribute`, and the shared error range 1–99 from
[`ERRORS.md`](ERRORS.md). The error allocation already anticipates this — each
contract owns a numeric block, so a split does not create code collisions.

### Interfaces

Insurance and leasing both need "does this asset exist and who owns it". That
is one read entrypoint on the registry:

```rust
fn get_asset_info(env: Env, asset_id: BytesN<32>) -> Result<AssetInfo, Error>;
```

Neither needs to *write* to the registry, which keeps the trust relationship
one-directional and avoids the confused-deputy risk that a write interface
would introduce.

### Migration sequence

Each step keeps `cargo test --all` green:

1. Extract `assetsup-types`; both crates depend on it. No behaviour change.
2. Create `assetsup-insurance` with the registry address stored at init. Move
   `insurance.rs` **and its tests** together.
3. Add the cross-contract read and integration tests covering the seam
   (registry → insurance), building on [SC-51].
4. Remove insurance entrypoints from `assetsup`. **This is the breaking step** —
   it changes the deployed ABI, so it needs the upgrade story from [SC-49] to
   exist first, or a coordinated redeploy.
5. Repeat for leasing.
6. Record WASM size before and after each step. If the registry core does not
   shrink meaningfully, stop — the split is not paying for itself.

### Expected size effect

Insurance and leasing are 744 lines of 3,504, roughly 21% of the source. A
proportional saving would take the registry core from 103 KB to about 81 KB,
before accounting for the cross-contract call machinery each new contract adds
back. The saving is real but modest, which is the main argument for waiting
until there is a size problem worth solving.

## Open questions for maintainers

1. Delete `contrib`, or wire in its dead modules? Everything else waits on this.
2. Is 103 KB actually near a limit you are worried about, or is the size
   concern precautionary?
3. Does the backend bridge need to treat insurance and leasing as separate
   deployments, or is one contract address simpler for it?
4. Is there an upgrade story planned ([SC-49])? Step 4 above is blocked on it.
