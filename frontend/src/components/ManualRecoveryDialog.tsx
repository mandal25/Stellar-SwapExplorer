import { useEffect, useRef } from 'react'
import type { ReturnTypeOfRecovery } from './componentTypes'
import { shortenAddress } from '../utils/address'

export function ManualRecoveryDialog({ recovery }: { recovery: ReturnTypeOfRecovery }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { canCancel, close } = recovery
  useEffect(() => {
    inputRef.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && canCancel) close() }
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape)
  }, [canCancel, close])
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && canCancel) close() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="review-dialog recovery-dialog">
      <div className="testnet-warning"><strong>ANALYTICS ONLY · TESTNET</strong><span>This never creates or repeats a Classic swap</span></div>
      <h2 id="recovery-title">Recover confirmed swap</h2>
      {!recovery.recovered && <form onSubmit={(event) => { event.preventDefault(); void recovery.check() }}>
        <label className="recovery-label" htmlFor="recovery-hash">Classic transaction hash</label>
        <input ref={inputRef} id="recovery-hash" className="recovery-input" value={recovery.hash} onChange={(event) => recovery.changeHash(event.target.value)} maxLength={64} minLength={64} pattern="[0-9a-fA-F]{64}" autoComplete="off" autoCapitalize="none" spellCheck={false} required aria-describedby="recovery-help" />
        <small id="recovery-help">Enter one 64-character hexadecimal Testnet transaction hash. Amounts, assets, wallet, and time are read from Horizon.</small>
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={recovery.close} disabled={!canCancel}>Cancel</button><button type="submit" className="connect-button" disabled={recovery.busy}>{recovery.status === 'checking' ? 'Checking Horizon…' : 'Recover transaction'}</button></div>
      </form>}
      {recovery.recovered && <><dl>
        <div><dt>Hash</dt><dd><code>{recovery.recovered.hash}</code></dd></div>
        <div><dt>Wallet</dt><dd>{shortenAddress(recovery.recovered.wallet)}</dd></div>
        <div><dt>Sent</dt><dd>{recovery.recovered.sentAmount} {recovery.recovered.sentAsset}</dd></div>
        <div><dt>Received</dt><dd>{recovery.recovered.receivedAmount} {recovery.recovered.receivedAsset}</dd></div>
        <div><dt>Confirmed</dt><dd>{recovery.recovered.timestamp.toLocaleString()}</dd></div>
      </dl><p className="balance-help">Confirming prepares a separate user-authorized Soroban analytics transaction. It does not submit a Classic swap.</p>
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={recovery.close} disabled={!canCancel}>Cancel</button><button type="button" className="connect-button" onClick={() => void recovery.confirm()} disabled={recovery.busy}>{recovery.status === 'submitting' ? 'Recording analytics…' : 'Confirm analytics recording'}</button></div></>}
      {recovery.message && <p className={`dialog-status recovery-${recovery.status}`} aria-live="assertive">{recovery.message}</p>}
    </section>
  </div>
}
