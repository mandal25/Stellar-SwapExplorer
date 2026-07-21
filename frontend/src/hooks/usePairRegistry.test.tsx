import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePairRegistry } from './usePairRegistry'

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))
vi.mock('../services/soroban', () => ({ fetchRegistryPair: (...args: unknown[]) => fetchMock(...args) }))
const pair = { pairId: 'XLM_USDC', active: true, maxSlippageBps: 500, createdAt: 0n, updatedAt: 0n, base: { code: 'XLM', issuer: null, isNative: true }, quote: { code: 'USDC', issuer: 'issuer', isNative: false } }
describe('usePairRegistry', () => {
  beforeEach(() => vi.clearAllMocks())
  it('disables swapping for an inactive pair', async () => { fetchMock.mockResolvedValue({ ...pair, active: false }); const { result } = renderHook(() => usePairRegistry('GTEST')); await act(async () => undefined); expect(result.current.canSwap).toBe(false); expect(result.current.message).toContain('inactive') })
  it('ignores stale results after an account change', async () => {
    let resolveFirst!: (value: typeof pair) => void; fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve })).mockResolvedValueOnce({ ...pair, maxSlippageBps: 100 })
    const { result, rerender } = renderHook(({ address }) => usePairRegistry(address), { initialProps: { address: 'GONE' } }); rerender({ address: 'GTWO' }); await act(async () => undefined); await act(async () => resolveFirst({ ...pair, maxSlippageBps: 500 }))
    expect(result.current.pair?.maxSlippageBps).toBe(100)
  })
})
