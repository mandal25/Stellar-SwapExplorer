import { describe, expect, it } from 'vitest'
import { normalizeLevels } from './orderbook'
import { calculateQuote, slippagePercentToBps } from './quote'

describe('read-only quotes', () => {
  const levels = normalizeLevels([{ price: '2', amount: '3' }, { price: '1.5', amount: '4' }])
  it('consumes multiple orderbook levels', () => {
    const quote = calculateQuote('5', levels, 50n)!
    expect(quote.expectedOutput).toBe('9'); expect(quote.averagePrice).toBe('1.8'); expect(quote.insufficientLiquidity).toBe(false)
  })
  it('reports insufficient liquidity without fabricating a fill', () => {
    const quote = calculateQuote('10', levels, 50n)!
    expect(quote.insufficientLiquidity).toBe(true); expect(quote.consumedInput).toBe('7'); expect(quote.expectedOutput).toBe('12')
  })
  it('calculates preview slippage and minimum received exactly', () => {
    expect(slippagePercentToBps('0.5')).toBe(50n); expect(slippagePercentToBps('1')).toBe(100n); expect(slippagePercentToBps('2')).toBe(200n)
    expect(calculateQuote('1', normalizeLevels([{ price: '2', amount: '2' }]), 200n)?.minimumReceived).toBe('1.96')
  })
})
