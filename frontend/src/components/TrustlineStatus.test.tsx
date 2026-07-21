import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WalletViewModel } from '../types/stellar'
import { TrustlineStatus } from './TrustlineStatus'

const addMock = vi.fn(async (_address: string, progress: (status: string, message: string) => void) => {
  progress('preparing', 'Preparing…'); progress('awaiting-signature', 'Awaiting signature…'); progress('submitting', 'Submitting…'); progress('confirmed', 'USDC trustline confirmed on Stellar Testnet.')
})
vi.mock('../services/trustline', () => ({ addUsdcTrustline: (...args: unknown[]) => addMock(...args as [string, (status: string, message: string) => void]) }))

function wallet(): WalletViewModel { return {
  status: 'connected', address: 'GTEST', shortAddress: 'GTEST', network: 'TESTNET', message: '', horizonStatus: 'success', xlmBalance: '10', usdcBalance: null,
  spendableXlm: '8', spendableUsdc: null, receivableUsdc: null, trustlineStatus: 'missing', connect: vi.fn(), retryBalance: vi.fn(), refreshAccount: vi.fn(async () => undefined),
} }

describe('TrustlineStatus', () => {
  it('shows the action only for a missing trustline', () => {
    render(<TrustlineStatus wallet={wallet()} />)
    expect(screen.getByRole('button', { name: 'Add USDC Trustline' })).toBeInTheDocument()
    expect(screen.getByText(/required before this account can receive/)).toBeInTheDocument()
  })
  it('handles trustline transaction progress and refreshes account state', async () => {
    const value = wallet(); render(<TrustlineStatus wallet={value} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add USDC Trustline' }))
    expect(await screen.findByText('USDC trustline confirmed on Stellar Testnet.')).toBeInTheDocument()
    expect(value.refreshAccount).toHaveBeenCalledOnce()
  })
})
