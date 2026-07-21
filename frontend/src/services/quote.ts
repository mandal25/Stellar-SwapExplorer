import type { OrderbookLevel, QuoteResult } from '../types/market'
import { divideScaled, formatDecimal, multiplyScaled, parseDecimal } from '../utils/decimal'

export function calculateQuote(amount: string, levels: OrderbookLevel[], slippageBps: bigint): QuoteResult | null {
  const requested = parseDecimal(amount)
  if (!requested || requested <= 0n || levels.length === 0) return null
  let remaining = requested; let output = 0n
  for (const level of levels) {
    if (remaining === 0n) break
    const consumed = remaining < level.amountScaled ? remaining : level.amountScaled
    output += multiplyScaled(consumed, level.priceScaled); remaining -= consumed
  }
  const consumed = requested - remaining
  const average = divideScaled(output, consumed)
  const best = levels[0].priceScaled
  const impact = best > average ? (best - average) * 10_000n / best : (average - best) * 10_000n / best
  const minimum = output * (10_000n - slippageBps) / 10_000n
  return {
    expectedOutput: formatDecimal(output), averagePrice: formatDecimal(average), bestPrice: formatDecimal(best),
    priceImpactBps: impact, minimumReceived: formatDecimal(minimum), insufficientLiquidity: remaining > 0n,
    consumedInput: formatDecimal(consumed),
  }
}

export function slippagePercentToBps(value: '0.5' | '1' | '2'): bigint {
  return BigInt(value.replace('.', '')) * (value.includes('.') ? 10n : 100n)
}
