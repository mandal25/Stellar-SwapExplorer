import { describe, expect, it } from 'vitest'
import { isWalletRejection } from './trustline'

describe('trustline transaction errors', () => {
  it('distinguishes wallet rejection from network failure', () => {
    expect(isWalletRejection(new Error('User rejected request'))).toBe(true)
    expect(isWalletRejection(new Error('Horizon unavailable'))).toBe(false)
  })
})
