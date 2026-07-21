import type { WalletViewModel } from '../types/stellar'

export function WalletPanel({ wallet }: { wallet: WalletViewModel }) {
  const connected = wallet.status === 'connected'
  const title = wallet.status === 'wrong-network' ? 'Wrong network' : connected ? 'Account connected' : 'Wallet not connected'

  return (
    <section className="wallet-panel" aria-labelledby="wallet-title">
      <article className={`card wallet-card status-${wallet.status}`}>
        <div className="card-heading">
          <div><p className="card-kicker">Wallet status</p><h2 id="wallet-title">{title}</h2></div>
          <span className="round-icon" aria-hidden="true">{connected ? '✓' : '◌'}</span>
        </div>
        {wallet.address && <p className="address-line"><span>{wallet.shortAddress}</span><span>{wallet.network ?? 'Unknown network'}</span></p>}
        <p className="status-message" aria-live="polite">{wallet.message}</p>
        {!connected && (
          <button className="secondary-button" type="button" onClick={() => void wallet.connect()} disabled={wallet.status === 'connecting'}>
            {wallet.status === 'connecting' ? 'Waiting for Freighter…' : 'Connect wallet'}
          </button>
        )}
      </article>

      <article className="card balance-card" aria-labelledby="balance-title">
        <div className="card-heading"><div><p className="card-kicker">Available balance</p><h2 id="balance-title">Native XLM</h2></div><span className="asset-icon" aria-hidden="true">✦</span></div>
        <div className="balance-value" aria-live="polite">
          {wallet.horizonStatus === 'loading' && <span className="skeleton">Loading balance…</span>}
          {wallet.horizonStatus === 'success' && <><strong>{wallet.xlmBalance}</strong><span>XLM</span></>}
          {(wallet.horizonStatus === 'idle' || !wallet.address) && <><strong>—</strong><span>XLM</span></>}
          {wallet.horizonStatus === 'unfunded' && <strong className="small-value">Unfunded Testnet account</strong>}
          {wallet.horizonStatus === 'error' && <strong className="small-value">Balance unavailable</strong>}
        </div>
        {wallet.horizonStatus === 'unfunded' && <p className="balance-help">This account does not exist on Testnet yet. Fund it with Friendbot, then retry.</p>}
        {wallet.horizonStatus === 'error' && <><p className="balance-help">Horizon could not load this account. Your wallet remains safe.</p><button type="button" className="text-button" onClick={() => void wallet.retryBalance()}>Retry balance</button></>}
        {wallet.horizonStatus === 'success' && <p className="balance-help success-copy"><span className="status-dot" />Spendable after reserve, liabilities and fee: {wallet.spendableXlm ?? '0'} XLM</p>}
      </article>
    </section>
  )
}
