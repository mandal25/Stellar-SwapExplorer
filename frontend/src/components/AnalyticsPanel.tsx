import type { ReturnTypeOfStats } from './componentTypes'
import { formatDecimal } from '../utils/decimal'
import { useManualRecovery } from '../hooks/useManualRecovery'
import { ManualRecoveryDialog } from './ManualRecoveryDialog'

export function AnalyticsPanel({ analytics, address, onStatsRefresh }: { analytics: ReturnTypeOfStats; address: string | null; onStatsRefresh: () => void }) {
  const recovery = useManualRecovery(address, onStatsRefresh)
  return <section className="card analytics-card" aria-labelledby="analytics-title">
    <div className="card-heading"><div><p className="card-kicker">Soroban analytics</p><h2 id="analytics-title">Persistent wallet stats</h2></div><span className="phase-pill">Phase 4</span></div>
    {analytics.status === 'idle' && <p className="status-message">Connect a Testnet wallet to load on-chain aggregate stats.</p>}
    {analytics.status === 'loading' && <p className="status-message" aria-live="polite">Loading analytics from Soroban…</p>}
    {analytics.status === 'error' && <><p className="status-message">Analytics stats are temporarily unavailable.</p><button type="button" className="secondary-button" onClick={() => void analytics.retry()}>Retry analytics</button></>}
    {analytics.status === 'success' && analytics.stats && <dl className="analytics-stats"><div><dt>Recorded swaps</dt><dd>{analytics.stats.swapCount.toString()}</dd></div><div><dt>Total sent</dt><dd>{formatDecimal(analytics.stats.totalSent)} units</dd></div><div><dt>Total received</dt><dd>{formatDecimal(analytics.stats.totalReceived)} units</dd></div></dl>}
    <p className="balance-help">The contract stores aggregates but cannot enumerate full per-user history. Entries below remain current-session only.</p>
    <button type="button" className="secondary-button" disabled={!address} onClick={recovery.begin}>Recover confirmed swap</button>
    {recovery.open && <ManualRecoveryDialog recovery={recovery} />}
  </section>
}
