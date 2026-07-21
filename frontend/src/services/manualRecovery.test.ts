import { Networks } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC_ISSUER } from '../config/assets'
import operationsFixture from '../test/fixtures/horizon-53f3c15e-operations.json'
import transactionFixture from '../test/fixtures/horizon-53f3c15e-transaction.json'
import { recoverClassicSwap, type ManualRecoveryDeps } from './manualRecovery'
import type { ConfirmedPathOperation } from './pathPayment'

const hash = transactionFixture.hash; const wallet = transactionFixture.source_account
function deps(overrides: Partial<ManualRecoveryDeps> = {}): ManualRecoveryDeps {
  return { network: vi.fn(async () => ({ network: 'TESTNET', networkPassphrase: Networks.TESTNET })), address: vi.fn(async () => ({ address: wallet })), transaction: vi.fn(async () => transactionFixture), operations: vi.fn(async () => operationsFixture._embedded.records as ConfirmedPathOperation[]), wait: vi.fn(async () => undefined), ...overrides }
}
describe('manual Classic swap recovery', () => {
  it('recovers the supplied sanitized transaction using exact decimal-safe values', async () => {
    const result = await recoverClassicSwap(hash, wallet, undefined, deps())
    expect(result).toMatchObject({ hash, wallet, sentAsset: 'XLM', sentAmount: '0.1000000', receivedAsset: 'USDC', receivedAmount: '0.2193263', timestamp: new Date('2026-07-19T07:38:07Z') })
    expect(result.analytics).toMatchObject({ sentAmount: 1_000_000n, receivedAmount: 2_193_263n, timestamp: BigInt(Math.floor(new Date('2026-07-19T07:38:07Z').valueOf() / 1000)), pairId: 'XLM_USDC' })
  })
  it('rejects invalid hashes and the wrong network before Horizon reads', async () => {
    const invalid = deps(); await expect(recoverClassicSwap('bad', wallet, undefined, invalid)).rejects.toThrow('invalid_hash'); expect(invalid.transaction).not.toHaveBeenCalled()
    const wrong = deps({ network: vi.fn(async () => ({ network: 'PUBLIC', networkPassphrase: Networks.PUBLIC })) }); await expect(recoverClassicSwap(hash, wallet, undefined, wrong)).rejects.toThrow('wrong_network'); expect(wrong.transaction).not.toHaveBeenCalled()
  })
  it('rejects failed transactions and transactions owned by another wallet', async () => {
    await expect(recoverClassicSwap(hash, wallet, undefined, deps({ transaction: vi.fn(async () => ({ ...transactionFixture, successful: false })) }))).rejects.toThrow('transaction_failed')
    await expect(recoverClassicSwap(hash, 'GOTHER', undefined, deps())).rejects.toThrow('wrong_wallet')
  })
  it('rejects wrong operations and unofficial assets', async () => {
    const record = operationsFixture._embedded.records[0]
    await expect(recoverClassicSwap(hash, wallet, undefined, deps({ operations: vi.fn(async () => [{ ...record, type: 'payment' }] as ConfirmedPathOperation[]) }))).rejects.toThrow('wrong_operation')
    await expect(recoverClassicSwap(hash, wallet, undefined, deps({ operations: vi.fn(async () => [{ ...record, asset_issuer: TESTNET_USDC_ISSUER.replace('G', 'A') }] as ConfirmedPathOperation[]) }))).rejects.toThrow('wrong_asset')
  })
  it('reports a friendly indexing delay after bounded empty operation pages', async () => {
    const d = deps({ operations: vi.fn(async () => []) }); await expect(recoverClassicSwap(hash, wallet, undefined, d)).rejects.toThrow('horizon_delay'); expect(d.operations).toHaveBeenCalledTimes(5)
  })
  it('distinguishes a missing Testnet transaction from temporary operation indexing', async () => {
    const d = deps({ transaction: vi.fn(async () => { throw { response: { status: 404 } } }) })
    await expect(recoverClassicSwap(hash, wallet, undefined, d)).rejects.toThrow('transaction_not_found'); expect(d.transaction).toHaveBeenCalledTimes(3); expect(d.operations).not.toHaveBeenCalled()
  })
})
