# Recovery when all signer keys are lost (design note)

Status: **proposal, not implemented.** Today the wallet has no way back if every
owner key is lost.

## Proposed timelocked recovery

1. Owners register a `recovery_address` through the normal proposal flow, so it
   needs the usual threshold of confirmations.
2. `initiate_recovery(new_owners, new_threshold)` can be called by the recovery
   address only. It stores the request and the ledger timestamp.
3. Any current owner can `cancel_recovery` during the delay (suggested: 7 days).
   A live owner therefore always wins over a recovery attempt.
4. After the delay, `finalize_recovery` replaces the owner set and threshold,
   subject to the existing rules (at least 2 owners, `1 <= threshold <= owners`).

## Events

`RecoveryInitiated`, `RecoveryCancelled` and `RecoveryFinalized`, following the
naming convention in `contracts/EVENTS.md`.

## Open questions

- Delay length and whether it is configurable per wallet.
- Whether the recovery address may itself be a multisig wallet.
