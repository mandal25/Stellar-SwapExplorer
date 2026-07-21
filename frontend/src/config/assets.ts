import { Asset } from '@stellar/stellar-sdk'

export const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'

export type AssetConfig = {
  id: 'native:XLM' | `credit:USDC:${string}`
  type: 'native' | 'credit'
  code: 'XLM' | 'USDC'
  issuer: string | null
  displayName: string
  decimals: 7
}

export const XLM: AssetConfig = Object.freeze({ id: 'native:XLM', type: 'native', code: 'XLM', issuer: null, displayName: 'Stellar Lumens', decimals: 7 })
export const TESTNET_USDC: AssetConfig = Object.freeze({ id: `credit:USDC:${TESTNET_USDC_ISSUER}`, type: 'credit', code: 'USDC', issuer: TESTNET_USDC_ISSUER, displayName: 'Testnet USDC', decimals: 7 })
export const SUPPORTED_ASSETS = [XLM, TESTNET_USDC] as const

export function toStellarAsset(asset: AssetConfig): Asset {
  return asset.type === 'native' ? Asset.native() : new Asset(asset.code, asset.issuer!)
}

export function otherAsset(asset: AssetConfig): AssetConfig {
  return asset.id === XLM.id ? TESTNET_USDC : XLM
}
