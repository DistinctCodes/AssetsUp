# KYC revocation event

An event is already emitted when KYC is revoked.

## `KycRevoked`

Published by `events::kyc_revoked` in `src/events.rs`, called from `revoke_kyc`
in `src/kyc.rs`.

| Field | Type | Meaning |
|---|---|---|
| `address` | `Address` | The address whose KYC was revoked. |
| `caller` | `Address` | The admin who revoked it. |
| `timestamp` | `u64` | Ledger timestamp. |

## When it is emitted

After `revoke_kyc` sets the record's status to `Revoked`. Only an admin can call
it, and the call needs their authorization.

## Related events

`kyc_submitted` and `kyc_approved` cover the other transitions, so an off-chain
system can follow a record from submission to approval to revocation.

Note: an approval that passes its `expires_at` reads as not approved without an
event, because nothing is called when it ages out.
