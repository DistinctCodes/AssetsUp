# AssetUp Soroban Contract

This contract manages asset registration and tokenization on Stellar (Soroban).

## Admin Initialization
- **Function**: `initialize(env: Env, admin: Address)` in `src/lib.rs`
- **Behavior**: Stores the provided `admin` address under the `DataKey::Admin` key.
- **Auth**: The `admin` must authorize the initialize call.

## Asset Model
Defined in `src/asset.rs` as `Asset` with fields:
- `id: BytesN<32>`
- `name: String`
- `asset_type: AssetType`
- `category: String`
- `branch_id: u64`
- `department_id: u64`
- `status: AssetStatus`
- `purchase_date: u64`
- `purchase_cost: i128`
- `current_value: i128`
- `warranty_expiry: u64`
- `stellar_token_id: BytesN<32>` (tokenization target)
- `owner: Address`

## Register Asset
- **Function**: `register_asset(env: Env, asset: Asset)`
- **Auth**: Requires `asset.owner` to authorize.
- **Errors**: `AssetAlreadyExists` if the id is already present.

## Tokenization (Pro/Enterprise)
- **Function**: `tokenize_asset(env: Env, caller: Address, asset_id: BytesN<32>, token_id: BytesN<32>)`
- **Purpose**: Sets/updates the on-chain `stellar_token_id` for an existing asset.
- **Access Control**: Only the stored admin can call. The `caller` must equal the stored admin and must authorize, otherwise `Unauthorized` is returned.
- **Errors**:
  - `AssetNotFound` if the asset ID does not exist.
  - `Unauthorized` if `caller` is not the admin.

> Business policy note: While plan enforcement (Pro/Enterprise) is handled off-chain (e.g., in your app backend / UI), on-chain we strictly enforce admin-only tokenization to align with premium plan usage.

## Errors
Defined in `src/errors.rs` as `ContractError`:
- `AssetAlreadyExists`
- `AssetNotFound`
- `Unauthorized`

## Tests
Located in `src/tests/`:
- `initialize.rs`: Covers admin initialization and re-initialization panic.
- `asset.rs`: Covers asset registration and duplicate detection.
- `tokenize.rs`: Covers
  - Successful tokenization by admin.
  - Unauthorized caller blocked with `Unauthorized`.
  - Tokenization of non-existent asset returns `AssetNotFound`.

Run tests from the `contracts/` workspace root:
```bash
cargo test
```

## Example Usage (Pseudocode)
```rust
let admin = Address::from_account_str("G...admin...");
client.initialize(&admin);

// Asset previously registered by its owner...

// Admin tokenizes
let caller = admin.clone();
let asset_id: BytesN<32> = make_id();
let token_id: BytesN<32> = make_token_id();
client.tokenize_asset(&caller, &asset_id, &token_id);
```
