import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletViewModel } from '../types/stellar'
import { SwapCard } from './SwapCard'

const { resetMock } = vi.hoisted(() => ({ resetMock: vi.fn() }))
vi.mock('../hooks/useOrderbook', () => ({ useOrderbook: () => ({ status: 'empty', book: null, message: 'No liquidity', retry: vi.fn() }) }))
vi.mock('../hooks/useDirectQuote', () => ({ useDirectQuote: () => ({ quote: null, quotedAt: null }) }))
vi.mock('../hooks/usePairRegistry', () => ({ usePairRegistry: () => ({ pair: { maxSlippageBps: 500, active: true }, status: 'success', message: 'Pair active', retry: vi.fn(), canSwap: true }) }))
vi.mock('../hooks/useAnalyticsStats', () => ({ useAnalyticsStats: () => ({ stats: null, status: 'idle', retry: vi.fn() }) }))
vi.mock('../hooks/useSwapExecution', () => ({ useSwapExecution: () => ({ status: 'idle', message: '', reviewMessage: '', review: null, history: [], analyticsStatus: 'idle', analyticsMessage: '', retryAnalytics: vi.fn(), retryConfirmation: vi.fn(), resetDraftState: resetMock, clearTransientMessages: vi.fn(), inProgress: false, requestReview: vi.fn(), confirm: vi.fn(), cancelReview: vi.fn() }) }))

const wallet: WalletViewModel = { status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success', xlmBalance: '10', usdcBalance: '4', spendableXlm: '8', spendableUsdc: '4', receivableUsdc: '100', trustlineStatus: 'present', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn() }

describe('SwapCard draft reset wiring', () => {
  beforeEach(() => vi.clearAllMocks())
  it('clears transaction-specific state after amount and direction changes', async () => {
    render(<SwapCard wallet={wallet} />)
    await userEvent.type(screen.getByLabelText('Swap amount'), '0.1'); const afterAmount = resetMock.mock.calls.length
    expect(afterAmount).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Switch swap direction' }))
    expect(resetMock.mock.calls.length).toBeGreaterThan(afterAmount)
  })
})
