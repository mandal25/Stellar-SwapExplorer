import type { AssetConfig } from '../config/assets'
import type { QuoteResult } from './market'

export type SwapExecutionStatus = 'idle' | 'validating' | 'refreshing-quote' | 'preparing' | 'awaiting-signature' | 'submitting' | 'confirmed' | 'rejected' | 'failed' | 'timed-out'
export type ReviewDetails = { from: AssetConfig; to: AssetConfig; amount: string; slippage: '0.5' | '1' | '2'; quote: QuoteResult; quotedAt: Date }
export type ConfirmedSwap = {
  fromCode: string; toCode: string; sentAmount: string; receivedAmount: string | null; timestamp: Date
  hash: string; explorerUrl: string; status: 'success'
  analyticsStatus: 'not-started' | 'pending' | 'confirmed' | 'failed'
  analyticsHash?: string; analyticsExplorerUrl?: string; analyticsMessage?: string
}
