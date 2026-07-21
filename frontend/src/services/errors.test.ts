import { describe, expect, it } from 'vitest'
import { friendlyMessage, type FriendlyCondition } from './errors'

describe('friendly errors', () => {
  it.each<[FriendlyCondition, string]>([
    ['freighter-missing', 'Freighter'], ['wallet-rejected', 'rejected'], ['wrong-network', 'Testnet'],
    ['account-unfunded', 'Fund'], ['trustline-missing', 'trustline'], ['trustline-unauthorized', 'unauthorized'],
    ['orderbook-empty', 'offers'], ['horizon-unavailable', 'Horizon'], ['insufficient-liquidity', 'orderbook'],
  ])('maps %s without exposing transport details', (condition, expected) => expect(friendlyMessage(condition)).toContain(expected))
})
