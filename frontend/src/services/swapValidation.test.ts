import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, XLM, type AssetConfig } from '../config/assets'
import type { QuoteResult } from '../types/market'
import type { WalletViewModel } from '../types/stellar'
import { isQuoteFresh, isSupportedDirectPair, maxSpendable, validateSwap } from './swapValidation'

const quote: QuoteResult = { expectedOutput: '2', averagePrice: '2', bestPrice: '2', priceImpactBps: 0n, minimumReceived: '1.99', insufficientLiquidity: false, consumedInput: '1' }
const wallet: WalletViewModel = { status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success', xlmBalance: '10', usdcBalance: '5', spendableXlm: '8', spendableUsdc: '4', receivableUsdc: '1000', trustlineStatus: 'present', connect: async () => undefined, retryBalance: async () => undefined, refreshAccount: async () => undefined }
const valid = (overrides = {}) => validateSwap({ wallet, from: XLM, to: TESTNET_USDC, amount: '1.0000000', quote, quotedAt: new Date(), inProgress: false, ...overrides })

describe('swap validation', () => {
  it('accepts positive amounts with at most 7 decimals', () => { expect(valid()).toEqual({ valid: true }); expect(valid({ amount: '1.00000001' }).valid).toBe(false); expect(valid({ amount: '0' }).valid).toBe(false) })
  it('uses spendable rather than total balance and provides a safe Max', () => { expect(maxSpendable(wallet, XLM)).toBe('8'); expect(valid({ amount: '8.0000001' }).valid).toBe(false) })
  it('uses USDC balance net of selling liabilities', () => { expect(maxSpendable(wallet, TESTNET_USDC)).toBe('4'); expect(valid({ from: TESTNET_USDC, to: XLM, amount: '4.1' }).valid).toBe(false) })
  it('rejects stale quotes', () => { expect(isQuoteFresh(new Date(Date.now() - 20_000))).toBe(false); expect(valid({ quotedAt: new Date(Date.now() - 20_000) }).valid).toBe(false) })
  it('hard rejects wrong network and wrong issuer', () => {
    expect(valid({ wallet: { ...wallet, network: 'PUBLIC' } }).valid).toBe(false)
    const fake = { ...TESTNET_USDC, id: 'credit:USDC:GFAKE', issuer: 'GFAKE' } as AssetConfig
    expect(isSupportedDirectPair(XLM, fake)).toBe(false)
  })
  it('rejects missing and unauthorized trustlines', () => {
    expect(valid({ wallet: { ...wallet, trustlineStatus: 'missing' } }).valid).toBe(false)
    expect(valid({ wallet: { ...wallet, trustlineStatus: 'unauthorized' } }).valid).toBe(false)
  })
  it('rejects insufficient liquidity and duplicate progress', () => {
    expect(valid({ quote: { ...quote, insufficientLiquidity: true } }).valid).toBe(false)
    expect(valid({ inProgress: true }).valid).toBe(false)
  })
})
