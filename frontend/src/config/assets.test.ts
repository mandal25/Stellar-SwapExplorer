import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, TESTNET_USDC_ISSUER, XLM, otherAsset, toStellarAsset } from './assets'

describe('verified asset configuration', () => {
  it('converts native XLM to an SDK Asset', () => { expect(toStellarAsset(XLM).isNative()).toBe(true) })
  it('converts official Testnet USDC with the verified issuer', () => {
    const asset = toStellarAsset(TESTNET_USDC)
    expect(asset.getCode()).toBe('USDC'); expect(asset.getIssuer()).toBe(TESTNET_USDC_ISSUER)
  })
  it('always returns a different supported counterpart', () => {
    expect(otherAsset(XLM).id).toBe(TESTNET_USDC.id); expect(otherAsset(TESTNET_USDC).id).toBe(XLM.id)
  })
})
