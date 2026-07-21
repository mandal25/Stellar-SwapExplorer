import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.mock('@stellar/freighter-api', () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signAuthEntry: vi.fn(),
  signMessage: vi.fn(),
  signTransaction: vi.fn(),
}))

afterEach(cleanup)

