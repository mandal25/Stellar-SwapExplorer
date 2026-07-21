import { StrKey } from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { TESTNET_USDC_ISSUER } from '../config/assets'
import { decimalToI128, decodeRegistryPair, hashToBytes, recordSwapArgs } from './contractValues'

const pair = { pair_id: 'XLM_USDC', active: true, max_slippage_bps: 500n, created_at: 1n, updated_at: 2n, base: { code: 'XLM', issuer: null, is_native: true }, quote: { code: 'USDC', issuer: TESTNET_USDC_ISSUER, is_native: false } }
describe('Soroban contract value normalization', () => {
  it('decodes and validates the deployed registry pair', () => { expect(decodeRegistryPair(pair)).toMatchObject({ pairId: 'XLM_USDC', active: true, maxSlippageBps: 500 }) })
  it('preserves an inactive pair for execution gating', () => { expect(decodeRegistryPair({ ...pair, active: false }).active).toBe(false) })
  it('rejects an issuer mismatch and malformed responses', () => {
    expect(() => decodeRegistryPair({ ...pair, quote: { ...pair.quote, issuer: StrKey.encodeEd25519PublicKey(new Uint8Array(32)) } })).toThrow('malformed_contract_response')
    expect(() => decodeRegistryPair({ active: true })).toThrow('malformed_contract_response')
  })
  it('converts exact seven-decimal values to i128 without floating point', () => {
    expect(decimalToI128('2.1933814')).toBe(21_933_814n); expect(decimalToI128('1')).toBe(10_000_000n); expect(() => decimalToI128('1.00000001')).toThrow()
  })
  it('converts an exact 64-character hash to BytesN-compatible bytes', () => {
    const hash = '4bf84dea63cf11808d90ec66a44cf0f533f717742f2c58e241fc332dc830ed53'
    expect(hashToBytes(hash)).toHaveLength(32); expect(hashToBytes(hash)[0]).toBe(0x4b); expect(() => hashToBytes(hash.slice(1))).toThrow()
  })
  it('constructs record_swap arguments in the deployed contract signature order', () => {
    const user = StrKey.encodeEd25519PublicKey(new Uint8Array(32)); const args = recordSwapArgs({ user, transactionHash: 'a'.repeat(64), pairId: 'XLM_USDC', sentAmount: 10_000_000n, receivedAmount: 21_933_814n, timestamp: 1_768_000_000n })
    expect(args).toHaveLength(6); expect(args[0].switch().name).toBe('scvAddress'); expect(args[1].bytes()).toHaveLength(32); expect(args[2].sym().toString()).toBe('XLM_USDC')
  })
})
