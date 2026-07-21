import './App.css'
import { SwapCard } from './components/SwapCard'
import { WalletPanel } from './components/WalletPanel'
import { TrustlineStatus } from './components/TrustlineStatus'
import { stellarConfig, stellarConfigErrors } from './config/stellar'
import { useFreighterWallet } from './wallet/useFreighterWallet'

function App() {
  const wallet = useFreighterWallet()

  if (stellarConfigErrors.length) return <main id="main"><section className="card configuration-error" role="alert"><p className="card-kicker">Configuration blocked</p><h1>Testnet configuration is invalid</h1><p>{stellarConfigErrors.join(' ')}</p><p>Swap execution and analytics are disabled.</p></section></main>

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#main" aria-label="StellarSwap Explorer home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span><strong>StellarSwap</strong><small>Explorer</small></span>
        </a>
        <div className="header-actions">
          <span className="network-badge"><span className="status-dot" />Testnet</span>
          {wallet.address && <span className="header-address">{wallet.shortAddress}</span>}
          <button className="connect-button" type="button" onClick={() => void wallet.connect()} disabled={wallet.status === 'connecting'}>
            {wallet.status === 'connecting' ? 'Connecting…' : wallet.address ? 'Wallet connected' : 'Connect Freighter'}
          </button>
        </div>
      </header>

      <main id="main">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Stellar Classic DEX · Testnet</p>
          <h1 id="page-title">Explore swaps with confidence.</h1>
          <p>Inspect official Testnet assets, live Classic DEX liquidity, and read-only swap estimates.</p>
        </section>

        <div className="dashboard-grid">
          <section className="wallet-column"><WalletPanel wallet={wallet} /><TrustlineStatus wallet={wallet} /></section>
          <section className="market-column"><SwapCard wallet={wallet} /></section>
        </div>

        <section className="connection-strip" aria-label="Service status">
          <div><span className="status-dot" /><span><small>Network</small><strong>Stellar Testnet</strong></span></div>
          <div><span className="status-dot" /><span><small>Horizon connection</small><strong>{wallet.horizonStatus === 'error' ? 'Unavailable' : 'Ready'}</strong></span></div>
          <div><span className="status-dot" /><span><small>Soroban RPC</small><strong>Configured</strong></span></div>
          <div className="endpoint"><small>Endpoint</small><strong>{stellarConfig.horizonUrl.replace('https://', '')}</strong></div>
        </section>
      </main>

      <footer>Built for Stellar Testnet · No secret keys are requested or stored.</footer>
    </div>
  )
}

export default App
