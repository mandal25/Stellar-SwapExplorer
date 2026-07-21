import type { AssetConfig } from '../config/assets'

export type OrderbookLevel = { price: string; amount: string; priceScaled: bigint; amountScaled: bigint }
export type OrderbookSnapshot = {
  selling: AssetConfig; buying: AssetConfig; bids: OrderbookLevel[]; asks: OrderbookLevel[]
  bestBid: string | null; bestAsk: string | null; spread: string | null; depth: string; refreshedAt: Date
}
export type QuoteResult = {
  expectedOutput: string; averagePrice: string; bestPrice: string | null; priceImpactBps: bigint | null
  minimumReceived: string; insufficientLiquidity: boolean; consumedInput: string
}
