import { Account, Networks, StrKey, Transaction, type TransactionBuilder } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import type { SwapExecutionStatus } from '../types/swap'
import { executePathPayment, extractConfirmedDestinationAmount, horizonFailureMessage, pathPaymentOperationArgs, pollConfirmedOperation, type PathPaymentDeps } from './pathPayment'

const address = StrKey.encodeEd25519PublicKey(new Uint8Array(32))
const input = { address, from: XLM, to: TESTNET_USDC, amount: '1.0000000', destMin: '1.9000000' }
function deps(overrides: Partial<PathPaymentDeps> = {}): PathPaymentDeps {
  return {
    loadAccount: vi.fn(async () => new Account(address, '1') as never),
    network: vi.fn(async () => ({ network: 'TESTNET', networkPassphrase: Networks.TESTNET })),
    sign: vi.fn(async (xdr) => ({ signedTxXdr: xdr, signerAddress: address })),
    submit: vi.fn(async () => ({ hash: 'a'.repeat(64) })), findReceived: vi.fn(async () => ({ sentAmount: '1.0000000', receivedAmount: '1.95', confirmedAt: new Date('2026-01-01T00:00:00Z') })), ...overrides,
  }
}
describe('PathPaymentStrictSend execution', () => {
  it('builds the exact direct operation arguments', () => {
    const args = pathPaymentOperationArgs(input)
    expect(args.sendAsset.isNative()).toBe(true); expect(args.sendAmount).toBe('1.0000000'); expect(args.destination).toBe(address)
    expect(args.destAsset.getCode()).toBe('USDC'); expect(args.destMin).toBe('1.9000000'); expect(args.path).toEqual([])
  })
  it('maps signing rejection without submitting', async () => {
    const d = deps({ sign: vi.fn(async () => ({ signedTxXdr: '', signerAddress: '', error: { message: 'rejected' } as never })) }); const states: SwapExecutionStatus[] = []
    expect(await executePathPayment(input, (state) => states.push(state), d)).toBeNull(); expect(states).toContain('rejected'); expect(d.submit).not.toHaveBeenCalled()
  })
  it('maps Horizon submission failure', async () => {
    const d = deps({ submit: vi.fn(async () => { throw new Error('transport detail') }) }); const states: SwapExecutionStatus[] = []
    await executePathPayment(input, (state) => states.push(state), d); expect(states.at(-1)).toBe('failed')
  })
  it('returns confirmed-but-unparsed only after successful submission', async () => {
    const d = deps({ findReceived: vi.fn(async () => null) }); const states: SwapExecutionStatus[] = []
    const result = await executePathPayment(input, (state) => states.push(state), d)
    expect(result).toMatchObject({ hash: 'a'.repeat(64), receivedAmount: null, confirmedAt: null }); expect(states).not.toContain('failed'); expect(d.submit).toHaveBeenCalledOnce()
  })
  it('maps Horizon result codes to friendly messages', () => {
    const error = { response: { data: { extras: { result_codes: { operations: ['op_under_destmin'] } } } } }
    expect(horizonFailureMessage(error)).toContain('slippage-protected minimum')
  })
  it('parses the operation destination amount, never a post-swap account balance', () => {
    const hash = 'c'.repeat(64); const record = { type: 'path_payment_strict_send', transaction_successful: true, transaction_hash: hash, from: address, to: address, source_amount: '1.0000000', source_asset_type: 'native', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: TESTNET_USDC.issuer!, amount: '2.1933814', created_at: '2026-01-01T00:00:00Z' }
    expect(extractConfirmedDestinationAmount([record], input, hash)).toBe('2.1933814')
    expect(extractConfirmedDestinationAmount([{ ...record, asset_code: 'FAKE' }], input, hash)).toBeNull()
  })
  it('preserves USDC to XLM destination orientation', () => {
    const reverse = { address, from: TESTNET_USDC, to: XLM, amount: '2.0000000', destMin: '0.8000000' }
    const hash = 'd'.repeat(64); const record = { type: 'path_payment_strict_send', transaction_successful: true, transaction_hash: hash, from: address, to: address, source_amount: '2.0000000', source_asset_type: 'credit_alphanum4', source_asset_code: 'USDC', source_asset_issuer: TESTNET_USDC.issuer!, asset_type: 'native', amount: '0.9123456', created_at: '2026-01-01T00:00:00Z' }
    expect(extractConfirmedDestinationAmount([record], reverse, hash)).toBe('0.9123456')
  })
  it('polls through empty indexing responses before parsing the operation', async () => {
    const hash = 'e'.repeat(64); const valid = { type: 'path_payment_strict_send', transaction_successful: true, transaction_hash: hash, from: address, to: address, source_amount: '1.0000000', source_asset_type: 'native', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: TESTNET_USDC.issuer!, amount: '2.0000000', created_at: '2026-01-01T00:00:00Z' }
    const load = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([valid])
    await expect(pollConfirmedOperation(load, hash, input, undefined, [0, 0])).resolves.toMatchObject({ receivedAmount: '2.0000000' }); expect(load).toHaveBeenCalledTimes(2)
  })
  it('retries a transient indexing error and supports cancellation', async () => {
    const hash = '6'.repeat(64); const valid = { type: 'path_payment_strict_send', transaction_successful: true, transaction_hash: hash, from: address, to: address, source_amount: '1', source_asset_type: 'native', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: TESTNET_USDC.issuer!, amount: '2', created_at: '2026-01-01T00:00:00Z' }
    const delayed = vi.fn().mockRejectedValueOnce(new Error('not indexed')).mockResolvedValueOnce([valid])
    await expect(pollConfirmedOperation(delayed, hash, input, undefined, [0, 0])).resolves.toMatchObject({ receivedAmount: '2' })
    const controller = new AbortController(); controller.abort()
    await expect(pollConfirmedOperation(vi.fn(), hash, input, controller.signal, [0])).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('rebuilds and re-signs exactly once for tx_bad_seq', async () => {
    let calls = 0; const d = deps({ submit: vi.fn(async (_tx: ReturnType<typeof TransactionBuilder.fromXDR>) => { calls += 1; if (calls === 1) throw { response: { data: { extras: { result_codes: { transaction: 'tx_bad_seq' } } } } }; return { hash: 'f'.repeat(64) } }) })
    const result = await executePathPayment(input, () => undefined, d)
    expect(result?.hash).toBe('f'.repeat(64)); expect(d.loadAccount).toHaveBeenCalledTimes(2); expect(d.sign).toHaveBeenCalledTimes(2); expect(d.submit).toHaveBeenCalledTimes(2)
  })
  it('creates a classic transaction rather than exposing XDR', async () => {
    const d = deps({ submit: vi.fn(async (tx) => { expect(tx).toBeInstanceOf(Transaction); expect(tx.operations[0].type).toBe('pathPaymentStrictSend'); return { hash: 'b'.repeat(64) } }) })
    await executePathPayment(input, () => undefined, d); expect(d.submit).toHaveBeenCalledOnce()
  })
})
