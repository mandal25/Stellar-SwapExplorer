import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SessionSwapHistory } from './SessionSwapHistory'

describe('SessionSwapHistory', () => {
  it('separates Classic and Soroban confirmations', () => {
    render(<SessionSwapHistory retryAnalytics={() => undefined} retryConfirmation={() => undefined} retryDisabled={false} swaps={[{ fromCode: 'XLM', toCode: 'USDC', sentAmount: '1', receivedAmount: '2', timestamp: new Date('2026-01-01T00:00:00Z'), hash: 'abcdef1234567890', explorerUrl: 'https://stellar.expert/explorer/testnet/tx/abcdef1234567890', status: 'success', analyticsStatus: 'confirmed' }]} />)
    expect(screen.getByText(/1 XLM → 2 USDC/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Classic transaction' })).toHaveAttribute('href', expect.stringContaining('/testnet/tx/'))
    expect(screen.getByText(/Soroban analytics: confirmed/)).toBeInTheDocument()
  })
})
