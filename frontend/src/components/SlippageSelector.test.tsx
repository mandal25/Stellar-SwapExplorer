import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SlippageSelector } from './SlippageSelector'

describe('SlippageSelector registry enforcement', () => {
  it('disables choices above the Registry maximum', () => {
    render(<SlippageSelector value="0.5" maxBps={50} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '0.5%' })).toBeEnabled(); expect(screen.getByRole('radio', { name: '1%' })).toBeDisabled(); expect(screen.getByRole('radio', { name: '2%' })).toBeDisabled()
  })
})
