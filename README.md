StellarSwap Explorer is a Testnet-only interface for native XLM and official Testnet USDC. Stellar Classic settles swaps with `PathPaymentStrictSend`; two deployed Soroban contracts separately provide pair policy and user-authorized post-settlement analytics.

## [Open the Live Demo](https://stellar-swap-explorer.vercel.app)

> **Testnet only:** these assets have no monetary value. The app rejects Public Network, never requests a secret key, and never stores signed XDR or wallet data.

## Production deployment status

- Production frontend deployed on Vercel: [stellar-swap-explorer.vercel.app](https://stellar-swap-explorer.vercel.app).
- Stellar Testnet only; Mainnet is intentionally unsupported.
- Freighter provides public-account access and user-authorized Testnet signing without exposing secret keys.
- Stellar Classic DEX swaps execute as slippage-protected `PathPaymentStrictSend` transactions through Horizon.
- The deployed Pair Registry supplies active-pair and slippage policy; the deployed Swap Analytics contract records separate, user-authorized post-settlement analytics.
- Classic settlement and Soroban analytics remain separate, non-atomic transactions.

## Architecture and current features

```text
Pair Registry ── active pair + slippage policy ──> Frontend
      │                                             │
      └──── active-pair validation ───────┐         ├─ Classic PathPaymentStrictSend ──> Horizon
                                         v         │
                                  Swap Analytics <─┘ separate user-authorized record
```

- Contracts: production `pair_registry` and `swap_analytics` contracts with validation, authorization, events, TTL extension, stable errors, and tests.
- Frontend Phases 1–3: Freighter Testnet connection, balances/trustlines, live orderbook and direct strict-send quotes, review, signing, submission, authoritative Horizon confirmation, and current-session history.
- Frontend Phase 4: deployed Pair Registry validation and execution gating, registry maximum-slippage enforcement, persistent aggregate stats, and a second Soroban transaction built only from confirmed Horizon values.

Classic settlement and analytics are non-atomic. A confirmed Classic swap remains successful if analytics fails. The UI retains its immutable confirmed amounts, time, user, direction, and hash for **Retry analytics**; retry never repeats the swap.

Swap Analytics stores aggregates and records keyed by `(user, transaction_hash)`. Its current schema cannot reliably enumerate full per-user history without an external indexer, so the UI shows persistent aggregates plus explicitly current-session detail.

## Testnet deployment

| Item | Value | Explorer |
|---|---|---|
| Pair Registry | `CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB` | [Contract](https://stellar.expert/explorer/testnet/contract/CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB) |
| Pair Registry deployment | `ef6ab62eaf3b52e6e016b03ead1b4d00d956e655aa8649e4f438a025a32ae9e1` | [Transaction](https://stellar.expert/explorer/testnet/tx/ef6ab62eaf3b52e6e016b03ead1b4d00d956e655aa8649e4f438a025a32ae9e1) |
| Swap Analytics | `CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M` | [Contract](https://stellar.expert/explorer/testnet/contract/CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M) |
| Swap Analytics deployment | `2283c853b0d629b6c93bc24ccaf7cb03985c668036551001258e91179255f260` | [Transaction](https://stellar.expert/explorer/testnet/tx/2283c853b0d629b6c93bc24ccaf7cb03985c668036551001258e91179255f260) |
| XLM_USDC registration | `6a0b4e67aed3fd9fa23eec30915cd8d063f708fbc0025c2c2c668c01abc21835` | [Transaction](https://stellar.expert/explorer/testnet/tx/6a0b4e67aed3fd9fa23eec30915cd8d063f708fbc0025c2c2c668c01abc21835) |

# Screenshots

## Mobile Responsive UI

<img width="1170" height="9948" alt="stellar-swap-explorer vercel app_(iPhone 12 Pro)" src="https://github.com/user-attachments/assets/c87e1450-e553-41c6-bbf4-1e3be172ef19" />

### GitHub Actions CI

<img width="1885" height="815" alt="Screenshot 2026-07-19 142147" src="https://github.com/user-attachments/assets/1954ffa0-85eb-46e3-84c4-f98f7d013497" />

### Test Results
<img width="932" height="950" alt="Screenshot 2026-07-19 171829" src="https://github.com/user-attachments/assets/d7ab88ce-7f97-4268-9a37-83da39859149" />

## Demo Video

[Watch the 1–2 minute project demo]https://drive.google.com/file/d/1c2qCGNLUDVPM_vpMgV0YSUV1RyGVPpAv/view?usp=drive_link

`XLM_USDC` is active with a 500 bps maximum and official Testnet USDC issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Swap Analytics calls Pair Registry to require the pair to remain active.

Verified Classic swap example: [4bf84dea63cf11808d90ec66a44cf0f533f717742f2c58e241fc332dc830ed53](https://stellar.expert/explorer/testnet/tx/4bf84dea63cf11808d90ec66a44cf0f533f717742f2c58e241fc332dc830ed53).

## Local development

```sh
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

On Windows, use `copy .env.example .env.local`. Public deployed IDs are in `.env.example`; local environment files remain ignored.

### Vercel configuration

Set the Vercel project root directory to `frontend`, use `npm run build`, and publish `dist`. Configure the same public `VITE_*` values documented in [`frontend/.env.example`](frontend/.env.example):

- `VITE_STELLAR_NETWORK`
- `VITE_STELLAR_NETWORK_PASSPHRASE`
- `VITE_HORIZON_URL`
- `VITE_SOROBAN_RPC_URL`
- `VITE_PAIR_REGISTRY_CONTRACT_ID`
- `VITE_SWAP_ANALYTICS_CONTRACT_ID`

These variables contain public Testnet endpoints, the Testnet passphrase, and public contract IDs—not credentials. Never add secret keys, signed XDR, wallet data, or local `.env` contents to Vercel or source control.

```sh
# frontend
npm test -- --run
npm run lint
npm run build

# contracts
cd ../contracts
cargo fmt --all --check
cargo test
stellar contract build
```
