# Contrib Contract Deployment

Deployment and initialization of the `contrib` contract is consolidated into the canonical workspace deployment script.

Please refer to [`contracts/scripts/README.md`](../../scripts/README.md) for the single documented workflow:

```bash
cd contracts
./scripts/deploy.sh --network testnet --source alice
```

This single command handles building, optimizing, deploying, and cross-contract initialization for `contrib` and the other contracts in the AssetsUp suite.
