export type RegistryAsset = { code: string; issuer: string | null; isNative: boolean }
export type RegistryPair = {
  pairId: string
  base: RegistryAsset
  quote: RegistryAsset
  active: boolean
  maxSlippageBps: number
  createdAt: bigint
  updatedAt: bigint
}

export type UserStats = {
  swapCount: bigint
  totalSent: bigint
  totalReceived: bigint
  favoritePair: string | null
}

export type AnalyticsRecordInput = {
  user: string
  transactionHash: string
  pairId: 'XLM_USDC'
  sentAmount: bigint
  receivedAmount: bigint
  timestamp: bigint
}

export type AnalyticsStatus = 'idle' | 'preparing' | 'awaiting-signature' | 'submitting' | 'confirmed' | 'pending' | 'failed'
