import type { QuoteResult } from '../types/market'

export function SwapQuote({ quote, outputCode }: { quote: QuoteResult | null; outputCode: string }) {
  if (!quote) return <p className="quote-empty">Enter a positive amount to calculate a live estimate.</p>
  return <section className="swap-quote" aria-live="polite" aria-label="Read-only swap estimate">
    <div><span>Expected output</span><strong>{quote.expectedOutput} {outputCode}</strong></div>
    <div><span>Average execution price</span><strong>{quote.averagePrice}</strong></div>
    <div><span>Best displayed orderbook price</span><strong>{quote.bestPrice ?? 'Unavailable'}</strong></div>
    <div><span>Price impact</span><strong>{quote.priceImpactBps === null ? 'Unavailable' : `${Number(quote.priceImpactBps) / 100}%`}</strong></div>
    <div><span>Estimated minimum received</span><strong>{quote.minimumReceived} {outputCode}</strong></div>
    {quote.insufficientLiquidity && <p className="quote-warning">Insufficient liquidity: only {quote.consumedInput} of the input can be estimated from visible bids.</p>}
    <small>Horizon strict-send estimate. It may combine orderbook and liquidity-pool liquidity and is not a guaranteed execution price.</small>
  </section>
}
