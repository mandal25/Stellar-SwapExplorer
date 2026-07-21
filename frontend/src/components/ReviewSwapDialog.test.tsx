import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TESTNET_USDC, XLM } from '../config/assets'
import { ReviewSwapDialog } from './ReviewSwapDialog'

describe('ReviewSwapDialog quote presentation', () => {
  it('shows decimal-safe orientation and unavailable impact without stale warnings', () => {
    render(<ReviewSwapDialog address="GTEST" status="idle" message="" onCancel={vi.fn()} onConfirm={vi.fn()} review={{ from: XLM, to: TESTNET_USDC, amount: '0.1', slippage: '0.5', quotedAt: new Date(), quote: { expectedOutput: '0.2193263', minimumReceived: '0.2182296', averagePrice: '2.193263', bestPrice: '0.3148969', priceImpactBps: null, insufficientLiquidity: false, consumedInput: '0.1' } }} />)
    expect(screen.getByText('2.193263 USDC per XLM')).toBeInTheDocument(); expect(screen.getByText('Unavailable')).toBeInTheDocument(); expect(screen.queryByText(/Analytics was not started/)).not.toBeInTheDocument()
  })
})
