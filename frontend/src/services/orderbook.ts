import type { AssetConfig } from '../config/assets'
import { stellarConfig } from '../config/stellar'
import type { OrderbookLevel, OrderbookSnapshot } from '../types/market'
import { divideScaled, formatDecimal, parseDecimal, SCALE } from '../utils/decimal'

type RawLevel = { price: string; amount: string }
type RawBook = { bids?: RawLevel[]; asks?: RawLevel[] }

function assetParams(prefix: 'selling' | 'buying', asset: AssetConfig): Record<string, string> {
  return asset.type === 'native' ? { [`${prefix}_asset_type`]: 'native' } : {
    [`${prefix}_asset_type`]: asset.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12',
    [`${prefix}_asset_code`]: asset.code, [`${prefix}_asset_issuer`]: asset.issuer!,
  }
}

export function normalizeLevels(levels: RawLevel[] | undefined): OrderbookLevel[] {
  return (levels ?? []).flatMap((level) => {
    const priceScaled = parseDecimal(level.price); const amountScaled = parseDecimal(level.amount)
    return priceScaled && amountScaled ? [{ ...level, priceScaled, amountScaled }] : []
  })
}
export function normalizeBidLevels(levels: RawLevel[] | undefined): OrderbookLevel[] {
  return normalizeLevels(levels).map((level) => ({ ...level, amountScaled: divideScaled(level.amountScaled, level.priceScaled), amount: formatDecimal(divideScaled(level.amountScaled, level.priceScaled)) }))
}

export function normalizeOrderbook(raw: RawBook, selling: AssetConfig, buying: AssetConfig): OrderbookSnapshot {
  const bids = normalizeBidLevels(raw.bids).sort((a, b) => a.priceScaled === b.priceScaled ? 0 : a.priceScaled > b.priceScaled ? -1 : 1)
  const asks = normalizeLevels(raw.asks).sort((a, b) => a.priceScaled === b.priceScaled ? 0 : a.priceScaled < b.priceScaled ? -1 : 1)
  const bid = bids[0]?.priceScaled ?? null; const ask = asks[0]?.priceScaled ?? null
  const spread = bid && ask && ask >= bid ? formatDecimal(ask - bid, 7, 7) : null
  const depthScaled = bids.reduce((sum, level) => sum + level.amountScaled, 0n)
  return { selling, buying, bids, asks, bestBid: bids[0]?.price ?? null, bestAsk: asks[0]?.price ?? null, spread, depth: formatDecimal(depthScaled), refreshedAt: new Date() }
}

export async function fetchOrderbook(selling: AssetConfig, buying: AssetConfig, signal?: AbortSignal): Promise<OrderbookSnapshot> {
  const params = new URLSearchParams({ ...assetParams('selling', selling), ...assetParams('buying', buying), limit: '20' })
  const response = await fetch(`${stellarConfig.horizonUrl}/order_book?${params}`, { signal })
  if (!response.ok) throw new Error('Horizon orderbook is temporarily unavailable.')
  return normalizeOrderbook(await response.json() as RawBook, selling, buying)
}

export const EMPTY_PRICE = SCALE
