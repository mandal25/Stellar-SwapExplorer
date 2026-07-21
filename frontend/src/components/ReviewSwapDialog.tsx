import { useEffect, useRef } from 'react'
import type { ReviewDetails } from '../types/swap'
import { shortenAddress } from '../utils/address'

export function ReviewSwapDialog({ review, address, status, message, onCancel, onConfirm }: { review: ReviewDetails; address: string; status: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const busy = ['refreshing-quote', 'preparing', 'awaiting-signature', 'submitting'].includes(status)
  useEffect(() => {
    confirmRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape)
  }, [busy, onCancel])
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="review-title" className="review-dialog">
      <div className="testnet-warning"><strong>TESTNET · NO REAL VALUE</strong><span>Educational transaction using Testnet assets only</span></div>
      <h2 id="review-title">Review Testnet swap</h2>
      <dl>
        <div><dt>From</dt><dd>{review.amount} {review.from.code}</dd></div><div><dt>To</dt><dd>{review.to.code}</dd></div>
        <div><dt>Expected output</dt><dd>{review.quote.expectedOutput} {review.to.code}</dd></div><div><dt>Minimum received</dt><dd>{review.quote.minimumReceived} {review.to.code}</dd></div>
        <div><dt>Slippage</dt><dd>{review.slippage}%</dd></div><div><dt>Average price</dt><dd>{review.quote.averagePrice} {review.to.code} per {review.from.code}</dd></div>
        <div><dt>Price impact</dt><dd>{review.quote.priceImpactBps === null ? 'Unavailable' : `${Number(review.quote.priceImpactBps) / 100}%`}</dd></div><div><dt>Network fee</dt><dd>0.0000100 XLM estimated</dd></div>
        <div><dt>Wallet</dt><dd>{shortenAddress(address)}</dd></div><div><dt>Route</dt><dd>Direct {review.from.code} → {review.to.code}</dd></div>
      </dl>
      {message && <p aria-live="assertive" className="dialog-status">{message}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button><button ref={confirmRef} type="button" className="connect-button" onClick={onConfirm} disabled={busy}>{busy ? 'Processing Testnet swap…' : 'Confirm Testnet Swap'}</button></div>
    </section>
  </div>
}
