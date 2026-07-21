import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnalyticsPanel } from './AnalyticsPanel'

describe('AnalyticsPanel manual recovery action', () => {
  it('opens the recovery dialog only for a connected wallet', async () => {
    const analytics = { stats: { swapCount: 0n, totalSent: 0n, totalReceived: 0n, favoritePair: null }, status: 'success' as const, retry: vi.fn(async () => undefined) }
    render(<AnalyticsPanel analytics={analytics} address="GTEST" onStatsRefresh={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Recover confirmed swap' })); expect(screen.getByRole('dialog', { name: 'Recover confirmed swap' })).toBeInTheDocument()
  })
})
