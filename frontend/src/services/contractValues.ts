import { Address, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk'
import { TESTNET_USDC_ISSUER } from '../config/assets'
import type { AnalyticsRecordInput, RegistryPair, UserStats } from '../types/contracts'

export const PAIR_ID = 'XLM_USDC' as const

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('malformed_contract_response')
  return value as Record<string, unknown>
}
function text(value: unknown): string { return typeof value === 'string' ? value : value instanceof Address ? value.toString() : String(value ?? '') }
function integer(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value)
  throw new Error('malformed_contract_response')
}

export function decodeRegistryPair(value: unknown): RegistryPair {
  const pair = object(value); const base = object(pair.base); const quote = object(pair.quote)
  const decoded: RegistryPair = {
    pairId: text(pair.pair_id), active: pair.active === true, maxSlippageBps: Number(integer(pair.max_slippage_bps)),
    createdAt: integer(pair.created_at), updatedAt: integer(pair.updated_at),
    base: { code: text(base.code), issuer: base.issuer == null ? null : text(base.issuer), isNative: base.is_native === true },
    quote: { code: text(quote.code), issuer: quote.issuer == null ? null : text(quote.issuer), isNative: quote.is_native === true },
  }
  if (decoded.pairId !== PAIR_ID || decoded.base.code !== 'XLM' || !decoded.base.isNative || decoded.base.issuer !== null || decoded.quote.code !== 'USDC' || decoded.quote.isNative || decoded.quote.issuer !== TESTNET_USDC_ISSUER || !Number.isInteger(decoded.maxSlippageBps) || decoded.maxSlippageBps < 1 || decoded.maxSlippageBps > 5000) throw new Error('malformed_contract_response')
  return decoded
}

export function decodeUserStats(value: unknown): UserStats {
  const stats = object(value)
  return { swapCount: integer(stats.swap_count), totalSent: integer(stats.total_sent), totalReceived: integer(stats.total_received), favoritePair: stats.favorite_pair == null ? null : text(stats.favorite_pair) }
}

export function decimalToI128(value: string): bigint {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{0,7})?$/.test(trimmed)) throw new Error('invalid_decimal')
  const [whole, fraction = ''] = trimmed.split('.')
  const result = BigInt(whole) * 10_000_000n + BigInt((fraction + '0000000').slice(0, 7))
  if (result <= 0n) throw new Error('invalid_decimal')
  return result
}

export function hashToBytes(hash: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) throw new Error('invalid_transaction_hash')
  return Uint8Array.from(hash.match(/../g)!, (part) => Number.parseInt(part, 16))
}

export function recordSwapArgs(input: AnalyticsRecordInput): xdr.ScVal[] {
  return [
    new Address(input.user).toScVal(), nativeToScVal(hashToBytes(input.transactionHash), { type: 'bytes' }),
    nativeToScVal(input.pairId, { type: 'symbol' }), nativeToScVal(input.sentAmount, { type: 'i128' }),
    nativeToScVal(input.receivedAmount, { type: 'i128' }), nativeToScVal(input.timestamp, { type: 'u64' }),
  ]
}

export function nativeResult(value: xdr.ScVal): unknown { return scValToNative(value) }
