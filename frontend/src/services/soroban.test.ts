import { Account, nativeToScVal, Networks, StrKey } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import type { AnalyticsRecordInput } from '../types/contracts'
import { analyticsRecordExists, submitAnalytics, type SorobanDeps } from './soroban'

const user = StrKey.encodeEd25519PublicKey(new Uint8Array(32))
const input: AnalyticsRecordInput = { user, transactionHash: 'a'.repeat(64), pairId: 'XLM_USDC', sentAmount: 10_000_000n, receivedAmount: 20_000_000n, timestamp: 1n }
function deps(overrides: Partial<SorobanDeps> = {}): SorobanDeps {
  const account = new Account(user, '1')
  const server = {
    getAccount: vi.fn(async () => account),
    simulateTransaction: vi.fn(async () => ({ id: '1', latestLedger: 1, error: 'Error(Contract, #3)', events: [], _parsed: true })),
    prepareTransaction: vi.fn(async (transaction) => transaction), sendTransaction: vi.fn(), getTransaction: vi.fn(),
  }
  return { server: server as never, network: vi.fn(async () => ({ network: 'TESTNET', networkPassphrase: Networks.TESTNET })), address: vi.fn(async () => ({ address: user })), sign: vi.fn(async (xdr) => ({ signedTxXdr: xdr, signerAddress: user })), wait: vi.fn(async () => undefined), ...overrides }
}
describe('Soroban analytics safeguards', () => {
  it('rejects a wrong Freighter network before signing', async () => {
    const d = deps({ network: vi.fn(async () => ({ network: 'PUBLIC', networkPassphrase: Networks.PUBLIC })) })
    await expect(submitAnalytics(input, () => undefined, d)).rejects.toThrow('wrong_network'); expect(d.sign).not.toHaveBeenCalled()
  })
  it('rejects a signer mismatch before submission', async () => {
    const other = StrKey.encodeEd25519PublicKey(Uint8Array.from({ length: 32 }, () => 1)); const d = deps({ address: vi.fn(async () => ({ address: other })) })
    await expect(submitAnalytics(input, () => undefined, d)).rejects.toThrow('wrong_signer'); expect(d.server.sendTransaction).not.toHaveBeenCalled()
  })
  it('treats an existing record as a safe duplicate without signing', async () => {
    const d = deps(); vi.mocked(d.server.simulateTransaction).mockResolvedValue({ id: '1', latestLedger: 1, events: [], _parsed: true, transactionData: {} as never, minResourceFee: '0', result: { auth: [], retval: nativeToScVal(null) } })
    await expect(submitAnalytics(input, () => undefined, d)).resolves.toMatchObject({ duplicate: true }); expect(d.sign).not.toHaveBeenCalled()
  })
  it('distinguishes SwapNotFound from an unsafe analytics lookup failure', async () => {
    const missing = deps(); await expect(analyticsRecordExists(input, missing)).resolves.toBe(false)
    const failed = deps(); vi.mocked(failed.server.simulateTransaction).mockResolvedValue({ id: '1', latestLedger: 1, events: [], _parsed: true, error: 'RPC unavailable' })
    await expect(analyticsRecordExists(input, failed)).rejects.toThrow('analytics_lookup_failed')
  })
})
