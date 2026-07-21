import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import { normalizeOrderbook } from '../services/orderbook'
import { calculateQuote } from '../services/quote'
import type { WalletViewModel } from '../types/stellar'
import { useSwapExecution } from './useSwapExecution'

const { executeMock, recoverMock, fetchMock, directFetchMock, analyticsMock } = vi.hoisted(() => ({ executeMock: vi.fn(), recoverMock: vi.fn(), fetchMock: vi.fn(), directFetchMock: vi.fn(), analyticsMock: vi.fn() }))
const book = normalizeOrderbook({ bids: [{ price: '2', amount: '100' }], asks: [{ price: '2.1', amount: '100' }] }, XLM, TESTNET_USDC)
vi.mock('../services/orderbook', async (original) => ({ ...await original<typeof import('../services/orderbook')>(), fetchOrderbook: fetchMock }))
vi.mock('../services/directQuote', () => ({ fetchDirectQuote: directFetchMock }))
vi.mock('../services/pathPayment', () => ({ executePathPayment: (...args: unknown[]) => executeMock(...args), recoverConfirmedPathPayment: (...args: unknown[]) => recoverMock(...args) }))
vi.mock('../services/soroban', () => ({ submitAnalytics: (...args: unknown[]) => analyticsMock(...args), friendlySorobanError: () => 'The swap is confirmed, but analytics failed.' }))
const wallet: WalletViewModel = { status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success', xlmBalance: '10', usdcBalance: '5', spendableXlm: '8', spendableUsdc: '5', receivableUsdc: '1000', trustlineStatus: 'present', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn(async () => undefined) }
const draft = { from: XLM, to: TESTNET_USDC, amount: '1', slippage: '0.5' as const, quote: calculateQuote('1', book.bids, 50n), quotedAt: new Date() }

describe('useSwapExecution', () => {
  beforeEach(() => { vi.clearAllMocks(); fetchMock.mockResolvedValue({ ...book, refreshedAt: new Date() }); directFetchMock.mockResolvedValue(draft.quote); executeMock.mockResolvedValue({ hash: 'a'.repeat(64), sentAmount: '1.0000000', receivedAmount: '2.0000000', confirmedAt: new Date('2026-01-01T00:00:00Z') }); recoverMock.mockResolvedValue({ sentAmount: '0.1000000', receivedAmount: '0.2193263', confirmedAt: new Date('2026-07-19T07:38:07Z') }); analyticsMock.mockResolvedValue({ hash: 'b'.repeat(64), explorerUrl: 'https://stellar.expert/explorer/testnet/tx/' + 'b'.repeat(64), duplicate: false }) })
  it('refreshes balances/market, clears amount, and adds successful history', async () => {
    const refresh = vi.fn(); const clear = vi.fn(); const { result } = renderHook(() => useSwapExecution(wallet, refresh, clear))
    await act(() => result.current.requestReview(draft)); expect(result.current.review).not.toBeNull()
    await act(() => result.current.confirm())
    expect(wallet.refreshAccount).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce(); expect(clear).toHaveBeenCalledOnce()
    expect(result.current.history[0].hash).toBe('a'.repeat(64)); expect(result.current.status).toBe('confirmed'); expect(result.current.history[0].analyticsStatus).toBe('confirmed')
  })
  it('prevents duplicate confirm clicks while execution is in flight', async () => {
    let resolve!: (value: { hash: string; sentAmount: string; receivedAmount: string; confirmedAt: Date }) => void
    executeMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft))
    let first!: Promise<void>; await act(async () => { first = result.current.confirm(); void result.current.confirm(); await Promise.resolve() })
    expect(executeMock).toHaveBeenCalledOnce()
    await act(async () => { resolve({ hash: 'c'.repeat(64), sentAmount: '1', receivedAmount: '2', confirmedAt: new Date() }); await first })
  })
  it('keeps Classic success when analytics fails and retries analytics only', async () => {
    analyticsMock.mockRejectedValueOnce(new Error('rpc')).mockResolvedValueOnce({ hash: 'd'.repeat(64), explorerUrl: 'testnet', duplicate: false })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm())
    expect(result.current.status).toBe('confirmed'); expect(result.current.history[0].analyticsStatus).toBe('failed'); expect(executeMock).toHaveBeenCalledOnce()
    await act(() => result.current.retryAnalytics('a'.repeat(64)))
    expect(executeMock).toHaveBeenCalledOnce(); expect(analyticsMock).toHaveBeenCalledTimes(2); expect(result.current.history[0].analyticsStatus).toBe('confirmed')
  })
  it('uses confirmed amounts and direction instead of preview values', async () => {
    executeMock.mockResolvedValueOnce({ hash: 'e'.repeat(64), sentAmount: '1.0000000', receivedAmount: '2.1933814', confirmedAt: new Date('2026-01-01T00:00:00Z') })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm())
    expect(analyticsMock.mock.calls[0][0]).toMatchObject({ sentAmount: 10_000_000n, receivedAmount: 21_933_814n, pairId: 'XLM_USDC' })
  })
  it('never starts analytics when Classic settlement is not confirmed', async () => {
    executeMock.mockResolvedValueOnce(null)
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm())
    expect(analyticsMock).not.toHaveBeenCalled(); expect(result.current.history).toHaveLength(0)
  })
  it('does not carry an old parsing warning into a fresh review', async () => {
    executeMock.mockImplementationOnce(async (_input, progress) => { progress('failed', 'Horizon did not return an authoritative confirmed path-payment result. Analytics was not started.'); return null })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm())
    expect(result.current.reviewMessage).toContain('Analytics was not started')
    await act(() => result.current.requestReview(draft))
    expect(result.current.review).not.toBeNull(); expect(result.current.reviewMessage).toBe('')
  })
  it('clears review, Classic, and analytics transient state on draft changes', async () => {
    executeMock.mockImplementationOnce(async (_input, progress) => { progress('failed', 'old transaction warning'); return null })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm()); act(() => result.current.resetDraftState())
    expect(result.current.review).toBeNull(); expect(result.current.status).toBe('idle'); expect(result.current.message).toBe(''); expect(result.current.reviewMessage).toBe(''); expect(result.current.analyticsStatus).toBe('idle')
  })
  it('shows the parsing warning only after a submitted Classic swap is confirmed without amounts', async () => {
    executeMock.mockResolvedValueOnce({ hash: 'f'.repeat(64), sentAmount: '0.1000000', receivedAmount: null, confirmedAt: null })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); expect(result.current.message).not.toContain('Analytics was not started')
    await act(() => result.current.confirm())
    expect(result.current.status).toBe('confirmed'); expect(result.current.message).toContain('Analytics was not started'); expect(result.current.review).toBeNull(); expect(result.current.history[0].analyticsStatus).toBe('not-started'); expect(analyticsMock).not.toHaveBeenCalled()
  })
  it('retries Horizon confirmation and analytics without submitting another Classic swap', async () => {
    const hash = '9'.repeat(64); executeMock.mockResolvedValueOnce({ hash, sentAmount: '0.1000000', receivedAmount: null, confirmedAt: null })
    const { result } = renderHook(() => useSwapExecution(wallet, vi.fn(), vi.fn()))
    await act(() => result.current.requestReview(draft)); await act(() => result.current.confirm()); expect(executeMock).toHaveBeenCalledOnce()
    await act(() => result.current.retryConfirmation(hash))
    expect(executeMock).toHaveBeenCalledOnce(); expect(recoverMock).toHaveBeenCalledOnce(); expect(analyticsMock).toHaveBeenCalledOnce()
    expect(result.current.history[0]).toMatchObject({ sentAmount: '0.1000000', receivedAmount: '0.2193263', analyticsStatus: 'confirmed' })
  })
})
