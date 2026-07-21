import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecoveredClassicSwap } from '../services/manualRecovery'
import { useManualRecovery, type ManualRecoveryDeps } from './useManualRecovery'

const hash = '53f3c15e494c407732a88e4eda689a948b6ac8d5baf0aa082fc1412c69db54c7'; const wallet = 'GTEST'
const recovered: RecoveredClassicSwap = { hash, wallet, sentAsset: 'XLM', receivedAsset: 'USDC', sentAmount: '0.1000000', receivedAmount: '0.2193263', timestamp: new Date('2026-07-19T07:38:07Z'), analytics: { user: wallet, transactionHash: hash, pairId: 'XLM_USDC', sentAmount: 1_000_000n, receivedAmount: 2_193_263n, timestamp: 1n } }
function deps(): ManualRecoveryDeps { return { exists: vi.fn(async () => false), recover: vi.fn(async () => recovered), submit: vi.fn(async () => ({ hash: 'a'.repeat(64), explorerUrl: 'testnet', duplicate: false })) } }
describe('useManualRecovery', () => {
  beforeEach(() => vi.clearAllMocks())
  it('checks get_swap before Horizon and submits analytics only after review confirmation', async () => {
    const d = deps(); const refresh = vi.fn(); const { result } = renderHook(() => useManualRecovery(wallet, refresh, d))
    act(() => { result.current.begin(); result.current.changeHash(hash) }); await act(() => result.current.check())
    expect(vi.mocked(d.exists).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(d.recover).mock.invocationCallOrder[0]); expect(d.submit).not.toHaveBeenCalled(); expect(result.current.status).toBe('review')
    await act(() => result.current.confirm()); expect(d.submit).toHaveBeenCalledWith(recovered.analytics, expect.any(Function)); expect(result.current.status).toBe('success'); expect(refresh).toHaveBeenCalledOnce()
  })
  it('shows Already recorded and never calls Horizon or submission', async () => {
    const d = deps(); vi.mocked(d.exists).mockResolvedValue(true); const refresh = vi.fn(); const { result } = renderHook(() => useManualRecovery(wallet, refresh, d))
    act(() => { result.current.begin(); result.current.changeHash(hash) }); await act(() => result.current.check())
    expect(result.current.status).toBe('already-recorded'); expect(result.current.message).toContain('Already recorded'); expect(d.recover).not.toHaveBeenCalled(); expect(d.submit).not.toHaveBeenCalled(); expect(refresh).toHaveBeenCalledOnce()
  })
  it('rejects malformed hashes locally and cancels stale Horizon results', async () => {
    const d = deps(); let resolve!: (value: RecoveredClassicSwap) => void; vi.mocked(d.recover).mockImplementation(() => new Promise((done) => { resolve = done })); const { result } = renderHook(() => useManualRecovery(wallet, vi.fn(), d))
    act(() => { result.current.begin(); result.current.changeHash('bad') }); await act(() => result.current.check()); expect(result.current.message).toContain('64-character'); expect(d.exists).not.toHaveBeenCalled()
    act(() => result.current.changeHash(hash)); let pending!: Promise<void>; await act(async () => { pending = result.current.check(); await Promise.resolve() }); act(() => result.current.close()); await act(async () => { resolve(recovered); await pending })
    expect(result.current.open).toBe(false); expect(result.current.recovered).toBeNull(); expect(d.submit).not.toHaveBeenCalled()
  })
})
