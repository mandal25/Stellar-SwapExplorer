import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletViewModel } from '../types/stellar'
import { SwapCard } from './SwapCard'

vi.mock('../hooks/useOrderbook', () => ({ useOrderbook: () => ({ status: 'empty', book: null, message: 'No offers are available for this pair.', retry: vi.fn() }) }))
vi.mock('../hooks/usePairRegistry', () => ({ usePairRegistry: () => ({ pair: { maxSlippageBps: 500, active: true }, status: 'success', message: 'Pair active', retry: vi.fn(), canSwap: true }) }))
vi.mock('../hooks/useAnalyticsStats', () => ({ useAnalyticsStats: () => ({ stats: null, status: 'idle', retry: vi.fn() }) }))
const wallet: WalletViewModel = {
  status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success',
  xlmBalance: '10', usdcBalance: '4', spendableXlm: '8', spendableUsdc: '4', receivableUsdc: '1000', trustlineStatus: 'present', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn(),
}

describe('SwapCard asset selection', () => {
  beforeEach(() => vi.clearAllMocks())
  it('prevents selecting the same asset on both sides', () => {
    render(<SwapCard wallet={wallet} />)
    const from = screen.getByLabelText('From asset') as HTMLSelectElement
    const usdc = Array.from(from.options).find((option) => option.textContent?.startsWith('USDC'))
    expect(usdc).toBeDisabled()
  })
  it('switches direction and preserves wallet balances', async () => {
    render(<SwapCard wallet={wallet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch swap direction' }))
    expect((screen.getByLabelText('From asset') as HTMLSelectElement).value).toContain('credit:USDC')
    expect(screen.getByLabelText('To asset')).toHaveValue('native:XLM')
    expect(screen.getByText(/Total: 4 · Spendable: 4 USDC/)).toBeInTheDocument()
  })
})
