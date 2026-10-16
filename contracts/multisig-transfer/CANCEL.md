# Cancelling a pending transfer request

A pending request can be cancelled before it expires. It does not have to wait
for its deadline.

## `cancel_transfer_request(caller, request_id)`

Source: `src/lib.rs`.

- `caller` must authorize the call and be the request's initiator or the admin.
  Anyone else gets `Unauthorized`.
- The request must be `Pending` or `Approved`. Otherwise the call fails with
  `RequestNotPending`. An unknown id fails with `RequestNotFound`.
- The status becomes `Cancelled`.
- The asset is removed from the pending map, so a new request for the same asset
  can be created straight away.
- A `transfer_cancelled` event is emitted with the request id and the caller.
