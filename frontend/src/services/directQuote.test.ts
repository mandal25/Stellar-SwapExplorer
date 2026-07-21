import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, XLM, TESTNET_USDC_ISSUER } from '../config/assets'
import { normalizeDirectQuote } from './directQuote'

describe('direct strict-send quote normalization', () => {
  it('regresses the 0.3148969 orderbook versus 2.1933814 confirmed result mismatch', () => {
    const quote = normalizeDirectQuote({ source_asset_type: 'native', source_amount: '1.0000000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: TESTNET_USDC_ISSUER, destination_amount: '2.1933814', path: [] }, XLM, TESTNET_USDC, 50n, '0.3148969')!
    expect(quote.expectedOutput).toBe('2.1933814'); expect(quote.minimumReceived).toBe('2.1824144'); expect(quote.bestPrice).toBe('0.3148969'); expect(quote.priceImpactBps).toBeNull()
  })
  it('orients XLM to USDC average price as output per input without floating point math', () => {
    const quote = normalizeDirectQuote({ source_asset_type: 'native', source_amount: '0.1000000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: TESTNET_USDC_ISSUER, destination_amount: '0.2193263', path: [] }, XLM, TESTNET_USDC, 50n, '0.3148969')!
    expect(quote.averagePrice).toBe('2.193263'); expect(quote.minimumReceived).toBe('0.2182296')
  })
  it('keeps USDC to XLM source and destination orientation', () => {
    const quote = normalizeDirectQuote({ source_asset_type: 'credit_alphanum4', source_asset_code: 'USDC', source_asset_issuer: TESTNET_USDC_ISSUER, source_amount: '2.1933814', destination_asset_type: 'native', destination_amount: '1.0000000', path: [] }, TESTNET_USDC, XLM, 100n, '2.8571429')!
    expect(quote.expectedOutput).toBe('1'); expect(quote.minimumReceived).toBe('0.99'); expect(quote.averagePrice).toBe('0.455917'); expect(quote.priceImpactBps).toBeNull()
  })
  it('does not calculate fake impact from incompatible orderbook and blended path data', () => {
    const quote = normalizeDirectQuote({ source_asset_type: 'native', source_amount: '0.1', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: TESTNET_USDC_ISSUER, destination_amount: '0.2193263', path: [] }, XLM, TESTNET_USDC, 50n, '0.3148969')!
    expect(quote.priceImpactBps).toBeNull()
  })
  it('rejects routed and wrong-destination records', () => {
    expect(normalizeDirectQuote({ source_asset_type: 'native', source_amount: '1', destination_asset_type: 'native', destination_amount: '2', path: [{}] }, XLM, TESTNET_USDC, 50n)).toBeNull()
  })
})
