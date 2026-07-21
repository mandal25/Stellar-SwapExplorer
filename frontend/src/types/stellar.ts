export type WalletStatus = 'checking' | 'disconnected' | 'connecting' | 'connected' | 'not-installed' | 'wrong-network' | 'error'
export type HorizonStatus = 'idle' | 'loading' | 'success' | 'unfunded' | 'error'
export type TrustlineStatus = 'idle' | 'loading' | 'present' | 'missing' | 'unauthorized' | 'unfunded' | 'error'
export type TrustlineActionStatus = 'idle' | 'preparing' | 'awaiting-signature' | 'submitting' | 'confirmed' | 'rejected' | 'failed'

export interface WalletViewModel {
  status: WalletStatus
  address: string | null
  shortAddress: string
  network: string | null
  message: string
  horizonStatus: HorizonStatus
  xlmBalance: string | null
  usdcBalance: string | null
  spendableXlm: string | null
  spendableUsdc: string | null
  receivableUsdc: string | null
  trustlineStatus: TrustlineStatus
  connect: () => Promise<void>
  retryBalance: () => Promise<void>
  refreshAccount: () => Promise<void>
}

export type AccountBalanceResult =
  | { kind: 'funded'; xlmBalance: string; usdcBalance: string | null; spendableXlm: string; spendableUsdc: string | null; receivableUsdc: string | null; trustlineStatus: 'present' | 'missing' | 'unauthorized' }
  | { kind: 'unfunded' }
