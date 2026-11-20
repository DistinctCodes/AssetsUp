# contracts-ts

Generated TypeScript clients for the AssetsUp Soroban contracts. The contents of
the per-contract folders are **generated** (not committed) by:

```bash
cd contracts
cargo build --locked --workspace --target wasm32-unknown-unknown --release
./scripts/generate-bindings.sh
```

CI runs the same script in the `interface` job and uploads the result as the
`contract-interface` artifact. Wiring these clients into `backend/` and
`frontend/` as a dependency is not done yet; see the pull request that added
this folder.
