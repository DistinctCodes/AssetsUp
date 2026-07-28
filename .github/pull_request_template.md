<!--
Keep the description short. Link the issues this PR closes with closing
keywords so they close on merge:

Closes #123
Closes #124
-->

## Summary

<!-- What changes and why, in a few lines. -->

## Linked issues

Closes #

## Checks

- [ ] Lint passes for every area touched
- [ ] Build passes
- [ ] Tests pass
- [ ] No secrets, keys, or `.env` values are committed

<details>
<summary><strong>Contract changes only</strong> — expand if this PR touches <code>contracts/</code></summary>

Run from `contracts/`:

```sh
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all
```

- [ ] All three pass
- [ ] Reviewed against the relevant sections of
      [`contracts/SECURITY.md`](../blob/main/contracts/SECURITY.md#pre-deployment-checklist)

Confirm the sections that apply to this change:

- [ ] **Authorization** — every new or modified state-changing entrypoint calls
      `require_auth()` on the correct principal, and no entrypoint treats a
      caller-supplied address argument as proof of identity. Negative tests
      exist **without** `mock_all_auths`.
- [ ] **Arithmetic** — no unchecked arithmetic on any path handling amounts,
      shares, or percentages; overflow returns a typed error.
- [ ] **Storage and TTL** — correct durability chosen, and persistent entries
      that must outlive the default are extended.
- [ ] **Pause** — new mutating entrypoints respect the pause guard.
- [ ] **Admin and upgrades** — privileged entrypoints are admin-gated and emit
      an event.
- [ ] **Events** — every new state change emits an observable event, and the
      event catalogue is updated.
- [ ] **Size** — WASM size impact considered for new dependencies or large code
      additions.

If this PR knowingly leaves one of these open, say which and why:

</details>
