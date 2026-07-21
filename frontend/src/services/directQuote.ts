import type { AssetConfig } from '../config/assets'
import { stellarConfig } from '../config/stellar'
import type { QuoteResult } from '../types/market'
import { divideScaled, formatDecimal, parseDecimal } from '../utils/decimal'

type PathRecord = { source_amount: string; source_asset_type?: string; source_asset_code?: string; source_asset_issuer?: string; destination_amount: string; destination_asset_type: string; destination_asset_code?: string; destination_asset_issuer?: string; path: unknown[] }
function assetParams(asset: AssetConfig): Record<string, string> {
  return asset.type === 'native' ? { source_asset_type: 'native' } : { source_asset_type: 'credit_alphanum4', source_asset_code: asset.code, source_asset_issuer: asset.issuer! }
}
function destination(asset: AssetConfig): string { return asset.type === 'native' ? 'native' : `${asset.code}:${asset.issuer}` }
export function normalizeDirectQuote(record: PathRecord, from: AssetConfig, to: AssetConfig, slippageBps: bigint, bestDisplayedPrice?: string | null): QuoteResult | null {
  const input = parseDecimal(record.source_amount); const output = parseDecimal(record.destination_amount)
  const sourceMatches = from.type === 'native' ? record.source_asset_type === 'native' : record.source_asset_code === from.code && record.source_asset_issuer === from.issuer
  const destinationMatches = to.type === 'native' ? record.destination_asset_type === 'native' : record.destination_asset_code === to.code && record.destination_asset_issuer === to.issuer
  if (!input || !output || input <= 0n || output <= 0n || record.path.length !== 0 || !sourceMatches || !destinationMatches || from.id === to.id) return null
  const average = divideScaled(output, input)
  // Horizon strict-send paths may combine orderbook offers and liquidity pools. The
  // response does not expose a compatible pre-trade reference price, so comparing
  // its blended result with an orderbook-only best bid would invent price impact.
  const displayed = parseDecimal(bestDisplayedPrice ?? '')
  return { expectedOutput: formatDecimal(output), averagePrice: formatDecimal(average), bestPrice: displayed ? formatDecimal(displayed) : null, priceImpactBps: null, minimumReceived: formatDecimal(output * (10_000n - slippageBps) / 10_000n), insufficientLiquidity: false, consumedInput: formatDecimal(input) }
}
export async function fetchDirectQuote(from: AssetConfig, to: AssetConfig, amount: string, slippageBps: bigint, bestDisplayedPrice?: string | null, signal?: AbortSignal): Promise<QuoteResult | null> {
  const params = new URLSearchParams({ ...assetParams(from), source_amount: amount, destination_assets: destination(to) })
  const response = await fetch(`${stellarConfig.horizonUrl}/paths/strict-send?${params}`, { signal })
  if (!response.ok) throw new Error('Horizon direct quote is temporarily unavailable.')
  const body = await response.json() as { _embedded?: { records?: PathRecord[] } }
  const direct = body._embedded?.records?.find((record) => record.path.length === 0)
  return direct ? normalizeDirectQuote(direct, from, to, slippageBps, bestDisplayedPrice) : null
}
