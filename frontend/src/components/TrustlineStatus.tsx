import { useRef, useState } from 'react'
import { addUsdcTrustline } from '../services/trustline'
import type { TrustlineActionStatus, WalletViewModel } from '../types/stellar'

export function TrustlineStatus({ wallet }: { wallet: WalletViewModel }) {
  const [action, setAction] = useState<TrustlineActionStatus>('idle')
  const [message, setMessage] = useState('')
  const inFlight = useRef(false)
  const busy = ['preparing', 'awaiting-signature', 'submitting'].includes(action)
  const add = async () => {
    if (!wallet.address || busy || inFlight.current) return
    inFlight.current = true
    try {
      await addUsdcTrustline(wallet.address, (status, nextMessage) => { setAction(status); setMessage(nextMessage) })
      await wallet.refreshAccount()
    } finally { inFlight.current = false }
  }
  const descriptions = {
    idle: 'Connect a funded Testnet account to inspect its USDC trustline.', loading: 'Checking official Testnet USDC trustline…',
    present: `Official Testnet USDC trustline active. Balance: ${wallet.usdcBalance ?? '0.0000000'} USDC.`,
    missing: 'A USDC trustline is required before this account can receive official Testnet USDC.',
    unauthorized: 'The USDC trustline is unauthorized or frozen. Contact the Testnet asset issuer.',
    unfunded: 'Fund this Testnet account before adding a trustline.', error: 'Trustline status is unavailable because Horizon could not load the account.',
  } as const
  return <article className={`card trustline-card trustline-${wallet.trustlineStatus}`} aria-labelledby="trustline-title">
    <div className="card-heading"><div><p className="card-kicker">Classic account prerequisite</p><h2 id="trustline-title">USDC trustline</h2></div><span className="round-icon" aria-hidden="true">{wallet.trustlineStatus === 'present' ? '✓' : '!'}</span></div>
    <p className="status-message" aria-live="polite">{descriptions[wallet.trustlineStatus]}</p>
    {wallet.trustlineStatus === 'missing' && <button type="button" className="secondary-button" disabled={busy} onClick={() => void add()}>{action === 'awaiting-signature' ? 'Awaiting signature…' : action === 'submitting' ? 'Submitting…' : action === 'preparing' ? 'Preparing…' : 'Add USDC Trustline'}</button>}
    {message && <p className={`action-message action-${action}`} aria-live="assertive">{message}</p>}
    <small>Freighter signs the transaction. StellarSwap never requests your secret key.</small>
  </article>
}
