import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import { normalizeOrderbook } from './orderbook'

describe('orderbook normalization', () => {
  it('normalizes prices, levels, spread, and depth without floating point math', () => {
    const book = normalizeOrderbook({ bids: [{ price: '0.9', amount: '3' }], asks: [{ price: '1.1', amount: '2' }, { price: '1.2', amount: '4' }] }, XLM, TESTNET_USDC)
    expect(book.bestBid).toBe('0.9'); expect(book.bestAsk).toBe('1.1'); expect(book.spread).toBe('0.2'); expect(book.depth).toBe('3.3333333')
    expect(book.asks[0].priceScaled).toBe(11_000_000n)
  })
  it('orients bid price as counter per base and converts counter offer amount to base input depth', () => {
    const forward = normalizeOrderbook({ bids: [{ price: '0.3148969', amount: '4.7613928' }] }, XLM, TESTNET_USDC)
    const reverse = normalizeOrderbook({ bids: [{ price: '2.8571429', amount: '138.3321983' }] }, TESTNET_USDC, XLM)
    expect(forward.bids[0].price).toBe('0.3148969'); expect(forward.bids[0].amountScaled).toBeGreaterThan(15_0000000n)
    expect(reverse.bids[0].price).toBe('2.8571429'); expect(reverse.bids[0].amountScaled).toBeGreaterThan(48_0000000n)
  })
})
