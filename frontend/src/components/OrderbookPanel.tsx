import type { ReturnTypeUseOrderbook } from './componentTypes'

export function OrderbookPanel({ market }: { market: ReturnTypeUseOrderbook }) {
  const book = market.book
  return <section className="card orderbook-card" aria-labelledby="orderbook-title">
    <div className="card-heading"><div><p className="card-kicker">Horizon Testnet · auto-refresh 10s</p><h2 id="orderbook-title">Live orderbook</h2></div>{book && <span className="phase-pill">{book.selling.code}/{book.buying.code}</span>}</div>
    <p className="orderbook-status" aria-live="polite">{market.message}</p>
    {market.status === 'error' && <button type="button" className="text-button" onClick={market.retry}>Retry orderbook</button>}
    {book && <>
      <dl className="market-summary"><div><dt>Best bid</dt><dd>{book.bestBid ?? '—'}</dd></div><div><dt>Best ask</dt><dd>{book.bestAsk ?? '—'}</dd></div><div><dt>Spread</dt><dd>{book.spread ?? '—'}</dd></div><div><dt>Bid depth</dt><dd>{book.depth} {book.selling.code}</dd></div></dl>
      <div className="book-tables"><BookSide title="Bids" levels={book.bids.slice(0, 5)} /><BookSide title="Asks" levels={book.asks.slice(0, 5)} /></div>
      <p className="refresh-time">Last refresh: {book.refreshedAt.toLocaleTimeString()}</p>
    </>}
  </section>
}
function BookSide({ title, levels }: { title: string; levels: { price: string; amount: string }[] }) {
  return <div><h3>{title}</h3><table><thead><tr><th>Price</th><th>Amount</th></tr></thead><tbody>{levels.length ? levels.map((level, index) => <tr key={`${level.price}-${index}`}><td>{level.price}</td><td>{level.amount}</td></tr>) : <tr><td colSpan={2}>No {title.toLowerCase()}</td></tr>}</tbody></table></div>
}
