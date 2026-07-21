# StellarSwap Soroban contracts

This workspace contains two `no_std` Soroban contracts. Pair Registry is the source of truth for supported Stellar Classic asset pairs. Swap Analytics stores user-authorized records describing swaps that have already completed.

## Architecture and trust boundary

```text
Frontend / Classic transaction submission
              |
              | user-authorized analytics record after success
              v
       Swap Analytics  ---- active-pair check ---->  Pair Registry
```

These contracts do **not** execute, route, escrow, verify, or settle swaps. Stellar Classic DEX offers and path-payment operations are created and submitted outside Soroban. In particular, an analytics record is not proof that the referenced Classic transaction succeeded; callers and indexers must independently validate the transaction hash against Stellar history when that guarantee is needed.

## Pair Registry

The constructor stores an administrator. Pair data lives in persistent storage; the administrator and the explicit pair-ID index live in instance storage. Reads and writes extend sensible TTLs so active state remains recoverable without relying on unsupported storage enumeration.

| Method | Summary |
|---|---|
| `register_pair` | Admin-authorized creation; validates assets, ID and slippage and rejects duplicates. Contract assigns timestamps. |
| `update_pair` | Admin-authorized replacement preserving `created_at`; contract updates `updated_at`. |
| `set_pair_status` | Admin-authorized activation or deactivation. |
| `get_pair` | Returns a pair or `PairNotFound`. |
| `assert_pair_active` | Succeeds only for a stored, active pair; intended for inter-contract calls. |
| `list_pair_ids` | Returns the stable registration-order index. |
| `get_admin` | Returns the current administrator. |
| `transfer_admin` | Current-admin-authorized administrator transfer. |

An `AssetInfo` is native only when it has no issuer. A credit asset must have an issuer and a non-empty code. Base and quote must differ, and `max_slippage_bps` is inclusive from 1 through 5000.

### Pair Registry errors

| Code | Name | Meaning |
|---:|---|---|
| 1 | `PairNotFound` | Pair ID is not registered. |
| 2 | `PairAlreadyExists` | Pair ID was previously registered. |
| 3 | `EmptyPairId` | Pair ID is empty. |
| 4 | `IdenticalAssets` | Base and quote are identical. |
| 5 | `InvalidNativeAsset` | Native asset incorrectly has an issuer. |
| 6 | `InvalidCreditAsset` | Non-native asset has no issuer. |
| 7 | `InvalidSlippage` | Slippage is outside 1–5000 bps. |
| 8 | `EmptyAssetCode` | Asset code is empty. |
| 9 | `PairInactive` | Pair exists but is inactive. |

Events use topics `register`, `updated`, `status`, and `admin`. Their data contains respectively the pair, updated pair, active flag, or new administrator; the affected ID/address is indexed in the topics.

## Swap Analytics

The constructor stores an administrator and Pair Registry contract address in instance storage. Swap records are keyed by `(user, transaction_hash)` and user statistics by user in persistent storage. Both are TTL-extended whenever accessed.

| Method | Summary |
|---|---|
| `record_swap` | Requires user authorization, positive amounts, a unique user/hash key, and an active Registry pair; writes the record and cumulative stats. |
| `get_swap` | Returns a stored user/hash record. |
| `get_user_stats` | Returns cumulative stats, or zeroed stats for a new user. |
| `set_favorite_pair` | Requires user authorization and an active Registry pair. |
| `get_registry` / `set_registry` | Reads or admin-authorized replacement of the Registry address. |
| `get_admin` / `transfer_admin` | Reads or current-admin-authorized transfer of administration. |

### Swap Analytics errors

| Code | Name | Meaning |
|---:|---|---|
| 1 | `InvalidAmount` | Sent or received amount is not positive. |
| 2 | `DuplicateSwap` | This user/hash record already exists. |
| 3 | `SwapNotFound` | This user/hash record does not exist. |
| 4 | `ArithmeticOverflow` | A cumulative statistic cannot be represented. |

Registry failures are deliberately propagated as inter-contract invocation failures, preserving the Pair Registry's stable error code. Events use topics `swap`, `favorite`, `registry`, and `admin`; their data contains the record, favorite pair, new Registry address, or new administrator.

## Build and test

From this directory:

```sh
cargo fmt --all --check
cargo test
stellar contract build
```

Optimized Wasm artifacts are produced under `target/wasm32v1-none/release/`. The committed `Cargo.lock` intentionally retains the Soroban-host-compatible `ed25519-dalek` 2.2.0 resolution.

## Testnet deployment

- Pair Registry: `CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB` ([contract](https://stellar.expert/explorer/testnet/contract/CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB), [deployment](https://stellar.expert/explorer/testnet/tx/ef6ab62eaf3b52e6e016b03ead1b4d00d956e655aa8649e4f438a025a32ae9e1))
- Swap Analytics: `CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M` ([contract](https://stellar.expert/explorer/testnet/contract/CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M), [deployment](https://stellar.expert/explorer/testnet/tx/2283c853b0d629b6c93bc24ccaf7cb03985c668036551001258e91179255f260))
- Registered `XLM_USDC`: [registration transaction](https://stellar.expert/explorer/testnet/tx/6a0b4e67aed3fd9fa23eec30915cd8d063f708fbc0025c2c2c668c01abc21835), using official Testnet USDC issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

The frontend reads active state and slippage policy from Pair Registry. Only after Horizon authoritatively confirms a Classic path payment may the user authorize a second Soroban transaction to Swap Analytics, which performs its own inter-contract active-pair check. These transactions are non-atomic: analytics failure never invalidates Classic settlement, and duplicate-safe analytics retry never resubmits the swap.
