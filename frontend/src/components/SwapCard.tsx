import { useCallback, useEffect, useState } from 'react'
import { TESTNET_USDC, XLM, otherAsset, type AssetConfig } from '../config/assets'
import { useOrderbook } from '../hooks/useOrderbook'
import { slippagePercentToBps } from '../services/quote'
import type { WalletViewModel } from '../types/stellar'
import { AssetSelector } from './AssetSelector'
import { OrderbookPanel } from './OrderbookPanel'
import { SlippageSelector, type Slippage } from './SlippageSelector'
import { SwapQuote } from './SwapQuote'
import { useSwapExecution } from '../hooks/useSwapExecution'
import { validateSwap, maxSpendable } from '../services/swapValidation'
import { ReviewSwapDialog } from './ReviewSwapDialog'
import { TransactionStatus } from './TransactionStatus'
import { SessionSwapHistory } from './SessionSwapHistory'
import { useDirectQuote } from '../hooks/useDirectQuote'
import { usePairRegistry } from '../hooks/usePairRegistry'
import { useAnalyticsStats } from '../hooks/useAnalyticsStats'
import { AnalyticsPanel } from './AnalyticsPanel'

export function SwapCard({ wallet }: { wallet: WalletViewModel }) {
  const [from, setFrom] = useState<AssetConfig>(XLM)
  const [to, setTo] = useState<AssetConfig>(TESTNET_USDC)
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState<Slippage>('0.5')
  const [statsRefresh, setStatsRefresh] = useState(0)
  const refreshStats = useCallback(() => setStatsRefresh((value) => value + 1), [])
  const registry = usePairRegistry(wallet.status === 'connected' ? wallet.address : null)
  const analytics = useAnalyticsStats(wallet.status === 'connected' ? wallet.address : null, statsRefresh)
  const market = useOrderbook(from, to)
  const directQuote = useDirectQuote(from, to, amount, slippagePercentToBps(slippage), market.book?.bestBid)
  const quote = directQuote.quote
  const balance = (asset: AssetConfig) => asset.type === 'native' ? wallet.xlmBalance : wallet.usdcBalance
  const execution = useSwapExecution(wallet, market.retry, () => setAmount(''), registry.canSwap, refreshStats)
  const { resetDraftState, clearTransientMessages } = execution
  const changeAmount = (value: string) => { resetDraftState(); setAmount(value) }
  const selectFrom = (asset: AssetConfig) => { resetDraftState(); setFrom(asset); if (asset.id === to.id) setTo(otherAsset(asset)) }
  const selectTo = (asset: AssetConfig) => { resetDraftState(); setTo(asset); if (asset.id === from.id) setFrom(otherAsset(asset)) }
  const switchDirection = () => { resetDraftState(); setFrom(to); setTo(from) }
  useEffect(() => { if (directQuote.quotedAt) clearTransientMessages() }, [directQuote.quotedAt, clearTransientMessages])
  const draft = { from, to, amount, slippage, quote, quotedAt: directQuote.quotedAt }
  const validation = registry.canSwap ? validateSwap({ wallet, ...draft, inProgress: execution.inProgress }) : { valid: false, message: registry.message }
  const spendable = maxSpendable(wallet, from)

  return <>
    <section className="card swap-card" aria-labelledby="swap-title">
      <div className="card-heading"><div><p className="card-kicker">Classic DEX execution</p><h2 id="swap-title">Swap assets</h2></div><span className="phase-pill">Phase 4</span></div>
      <div className={`registry-status registry-${registry.status}`} aria-live="polite"><span>{registry.message}</span>{registry.status === 'error' && <button type="button" className="text-button" onClick={() => void registry.retry()}>Retry registry</button>}</div>
      <div className="asset-field"><AssetSelector id="from-asset" label="From asset" value={from} excluded={to} onChange={selectFrom} /><div><input aria-label="Swap amount" value={amount} onChange={(event) => changeAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /><span className="asset-code">{from.code}</span><button type="button" className="max-button" onClick={() => changeAmount(spendable)}>Max</button></div><small>Total: {balance(from) ?? '—'} · Spendable: {spendable} {from.code}</small></div>
      <button className="switch-button" type="button" onClick={switchDirection} aria-label="Switch swap direction">⇅</button>
      <div className="asset-field"><AssetSelector id="to-asset" label="To asset" value={to} excluded={from} onChange={selectTo} /><div><input aria-label="Estimated output" value={quote?.expectedOutput ?? ''} placeholder="0.00" readOnly /><span className="asset-code">{to.code}</span></div><small>Balance: {balance(to) ?? '—'} {to.code}</small></div>
      <SlippageSelector value={slippage} onChange={setSlippage} maxBps={registry.pair?.maxSlippageBps} />
      <SwapQuote quote={quote} outputCode={to.code} />
      <button className="review-button" type="button" disabled={!validation.valid} onClick={() => void execution.requestReview(draft)}>Review Swap</button>
      {!validation.valid && <p className="validation-message" aria-live="polite">{validation.message}</p>}
      <TransactionStatus status={execution.status} message={execution.message} />
      {execution.analyticsStatus !== 'idle' && <section className={`transaction-status analytics-${execution.analyticsStatus}`} aria-live="assertive"><strong>Soroban analytics · {execution.analyticsStatus}</strong><span>{execution.analyticsMessage}</span></section>}
      <p className="phase-notice"><span aria-hidden="true">i</span> TESTNET educational swap. These assets have no real monetary value.</p>
    </section>
    <OrderbookPanel market={market} />
    <AnalyticsPanel analytics={analytics} address={wallet.status === 'connected' ? wallet.address : null} onStatsRefresh={refreshStats} />
    <SessionSwapHistory swaps={execution.history} retryAnalytics={(hash) => void execution.retryAnalytics(hash)} retryConfirmation={(hash) => void execution.retryConfirmation(hash)} retryDisabled={execution.inProgress} />
    {execution.review && wallet.address && <ReviewSwapDialog review={execution.review} address={wallet.address} status={execution.status} message={execution.reviewMessage} onCancel={execution.cancelReview} onConfirm={() => void execution.confirm()} />}
  </>
}
