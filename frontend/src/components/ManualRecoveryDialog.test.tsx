import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManualRecoveryDialog } from './ManualRecoveryDialog'

function recovery(overrides: Record<string, unknown> = {}) {
  return { open: true, hash: '', status: 'idle' as const, message: '', recovered: null, busy: false, canCancel: true, begin: vi.fn(), close: vi.fn(), changeHash: vi.fn(), check: vi.fn(), confirm: vi.fn(), ...overrides }
}
describe('ManualRecoveryDialog', () => {
  it('accepts only a transaction hash and exposes no user-editable swap fields', async () => {
    const value = recovery(); render(<ManualRecoveryDialog recovery={value} />)
    const input = screen.getByLabelText('Classic transaction hash'); expect(input).toHaveAttribute('pattern', '[0-9a-fA-F]{64}'); expect(input).toHaveAttribute('maxlength', '64')
    expect(screen.queryByLabelText(/amount|wallet|asset|timestamp|pair/i)).not.toBeInTheDocument(); await userEvent.type(input, 'ab'); expect(value.changeHash).toHaveBeenCalled()
  })
  it('shows an immutable Horizon recovery review before analytics confirmation', async () => {
    const confirm = vi.fn(); const value = recovery({ status: 'review', confirm, recovered: { hash: '5'.repeat(64), wallet: 'GTESTADDRESS', sentAsset: 'XLM', receivedAsset: 'USDC', sentAmount: '0.1000000', receivedAmount: '0.2193263', timestamp: new Date('2026-07-19T07:38:07Z'), analytics: {} } })
    render(<ManualRecoveryDialog recovery={value} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); expect(screen.getByText('0.1000000 XLM')).toBeInTheDocument(); expect(screen.getByText('0.2193263 USDC')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm analytics recording' })); expect(confirm).toHaveBeenCalledOnce()
  })
})
