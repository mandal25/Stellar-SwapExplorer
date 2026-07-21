import { describe, expect, it } from 'vitest'
import { TESTNET_USDC, XLM, TESTNET_USDC_ISSUER } from '../config/assets'
import operationsFixture from '../test/fixtures/horizon-53f3c15e-operations.json'
import transactionFixture from '../test/fixtures/horizon-53f3c15e-transaction.json'
import effectsFixture from '../test/fixtures/horizon-53f3c15e-effects.json'
import { extractConfirmedOperation, type ConfirmedPathOperation } from './pathPayment'

const hash = '53f3c15e494c407732a88e4eda689a948b6ac8d5baf0aa082fc1412c69db54c7'
const address = 'GCCNEM3QBQUCW6FVIB3JNJVKQSIODRWG7Z55XWJFQYVHD3SM5OGFK4FF'
const input = { address, from: XLM, to: TESTNET_USDC, amount: '0.1', destMin: '0.2182296' }
const records = operationsFixture._embedded.records as ConfirmedPathOperation[]

describe('real sanitized Horizon 53f3c15e fixture', () => {
  it('accepts equivalent decimal source amounts and recovers exact confirmed values', () => {
    const result = extractConfirmedOperation(records, input, hash)
    expect(transactionFixture).toMatchObject({ successful: true, hash, created_at: '2026-07-19T07:38:07Z' })
    expect(result).toEqual({ sentAmount: '0.1000000', receivedAmount: '0.2193263', confirmedAt: new Date('2026-07-19T07:38:07Z') })
    expect(BigInt(result!.sentAmount.replace('.', ''))).toBe(1_000_000n); expect(BigInt(result!.receivedAmount.replace('.', ''))).toBe(2_193_263n)
    expect(effectsFixture._embedded.records[0]).toMatchObject({ type: 'account_credited', amount: '0.2193263', asset_code: 'USDC', asset_issuer: TESTNET_USDC_ISSUER })
  })
  it('rejects wrong transaction, account, source asset, destination asset, and unsuccessful operations', () => {
    const record = records[0]
    expect(extractConfirmedOperation([{ ...record, transaction_hash: '0'.repeat(64) }], input, hash)).toBeNull()
    expect(extractConfirmedOperation([{ ...record, from: 'GOTHER' }], input, hash)).toBeNull()
    expect(extractConfirmedOperation([{ ...record, source_asset_type: 'credit_alphanum4' }], input, hash)).toBeNull()
    expect(extractConfirmedOperation([{ ...record, asset_issuer: 'GOTHER' }], input, hash)).toBeNull()
    expect(extractConfirmedOperation([{ ...record, transaction_successful: false }], input, hash)).toBeNull()
  })
})
