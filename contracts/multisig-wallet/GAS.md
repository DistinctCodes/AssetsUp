# Fee estimate for a typical approval flow

Fees depend on network resource pricing and on the transaction, so this page
describes how to measure them rather than quoting numbers that go stale.

## The flow

For an m-of-n wallet a transaction takes `1 + m` invocations:

1. `submit_transaction` by one owner.
2. `confirm_transaction` by `m` owners. The last confirmation reaches the
   threshold and executes the transaction in the same invocation.

## Measure it

Simulate each call and read the resource fee from the output:

```bash
stellar contract invoke --id <WALLET_ID> --source <OWNER> --network testnet \
  --sim-only -- confirm_transaction --confirmer <OWNER_ADDR> --tx_id 1
```

Total estimate = `submit fee + m x confirm fee`. The final confirm costs more
because it also runs the execution.

## Tips

- Re-measure after contract upgrades.
- Budget extra for storage rent on long-lived transactions.
