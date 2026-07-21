import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WalletViewModel } from '../types/stellar'
import { WalletPanel } from './WalletPanel'

function wallet(overrides: Partial<WalletViewModel> = {}): WalletViewModel {
  return {
    status: 'disconnected', address: null, shortAddress: '', network: null,
    message: 'Connect Freighter to load your Testnet account.', horizonStatus: 'idle',
    xlmBalance: null, connect: vi.fn(), retryBalance: vi.fn(),
    usdcBalance: null, spendableXlm: null, spendableUsdc: null, receivableUsdc: null, trustlineStatus: 'idle', refreshAccount: vi.fn(), ...overrides,
  }
}

describe('WalletPanel', () => {
  it('renders the disconnected state and connect action', async () => {
    const value = wallet()
    render(<WalletPanel wallet={value} />)
    expect(screen.getByText('Wallet not connected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Connect wallet' }))
    expect(value.connect).toHaveBeenCalledOnce()
  })

  it('shows a friendly wrong-network message', () => {
    render(<WalletPanel wallet={wallet({ status: 'wrong-network', address: 'GABC', shortAddress: 'GABC', network: 'PUBLIC', message: 'Switch Freighter to Stellar Testnet to continue.' })} />)
    expect(screen.getByText('Wrong network')).toBeInTheDocument()
    expect(screen.getByText(/Switch Freighter to Stellar Testnet/)).toBeInTheDocument()
  })

  it('shows connected address, network, and XLM balance', () => {
    render(<WalletPanel wallet={wallet({ status: 'connected', address: 'GABCDEF', shortAddress: 'GAB…DEF', network: 'TESTNET', message: 'Freighter is connected to Stellar Testnet.', horizonStatus: 'success', xlmBalance: '12.3450000' })} />)
    expect(screen.getByText('Account connected')).toBeInTheDocument()
    expect(screen.getByText('GAB…DEF')).toBeInTheDocument()
    expect(screen.getByText('12.3450000')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect wallet' })).not.toBeInTheDocument()
  })
})
