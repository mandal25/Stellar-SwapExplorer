import { WatchWalletChanges, getAddress, getNetwork, isConnected, requestAccess } from '@stellar/freighter-api'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isTestnetNetwork } from '../config/stellar'
import { loadXlmBalance } from '../services/horizon'
import type { HorizonStatus, TrustlineStatus, WalletStatus, WalletViewModel } from '../types/stellar'
import { shortenAddress } from '../utils/address'
import { FreighterWalletContext } from './context'

function friendlyError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Freighter could not complete the request. Please try again.'
}

export function FreighterWalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>('checking')
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<string | null>(null)
  const [message, setMessage] = useState('Checking for Freighter…')
  const [horizonStatus, setHorizonStatus] = useState<HorizonStatus>('idle')
  const [xlmBalance, setXlmBalance] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)
  const [spendableXlm, setSpendableXlm] = useState<string | null>(null)
  const [spendableUsdc, setSpendableUsdc] = useState<string | null>(null)
  const [receivableUsdc, setReceivableUsdc] = useState<string | null>(null)
  const [trustlineStatus, setTrustlineStatus] = useState<TrustlineStatus>('idle')
  const activeAddress = useRef<string | null>(null)

  const refreshBalance = useCallback(async (account = activeAddress.current) => {
    if (!account) return
    setHorizonStatus('loading')
    setTrustlineStatus('loading')
    try {
      const result = await loadXlmBalance(account)
      if (result.kind === 'unfunded') {
        setXlmBalance(null); setUsdcBalance(null); setSpendableXlm(null); setSpendableUsdc(null); setReceivableUsdc(null); setHorizonStatus('unfunded'); setTrustlineStatus('unfunded')
      } else {
        setXlmBalance(result.xlmBalance); setUsdcBalance(result.usdcBalance); setSpendableXlm(result.spendableXlm); setSpendableUsdc(result.spendableUsdc); setReceivableUsdc(result.receivableUsdc); setTrustlineStatus(result.trustlineStatus); setHorizonStatus('success')
      }
    } catch {
      setXlmBalance(null); setUsdcBalance(null); setSpendableXlm(null); setSpendableUsdc(null); setReceivableUsdc(null); setHorizonStatus('error'); setTrustlineStatus('error')
    }
  }, [])

  const applyWallet = useCallback((nextAddress: string, nextNetwork: string, passphrase?: string) => {
    setNetwork(nextNetwork)
    if (!isTestnetNetwork(nextNetwork, passphrase)) {
      activeAddress.current = null; setAddress(nextAddress || null); setXlmBalance(null); setUsdcBalance(null); setSpendableXlm(null); setSpendableUsdc(null); setReceivableUsdc(null); setTrustlineStatus('idle'); setHorizonStatus('idle')
      setStatus('wrong-network'); setMessage('Switch Freighter to Stellar Testnet to continue.')
      return
    }
    activeAddress.current = nextAddress; setAddress(nextAddress); setStatus('connected'); setMessage('Freighter is connected to Stellar Testnet.')
    void refreshBalance(nextAddress)
  }, [refreshBalance])

  const readWallet = useCallback(async () => {
    const [addressResult, networkResult] = await Promise.all([getAddress(), getNetwork()])
    if (addressResult.error) throw addressResult.error
    if (networkResult.error) throw networkResult.error
    if (!addressResult.address) { setStatus('disconnected'); setMessage('Connect Freighter to load your Testnet account.'); return }
    applyWallet(addressResult.address, networkResult.network, networkResult.networkPassphrase)
  }, [applyWallet])

  const connect = useCallback(async () => {
    setStatus('connecting'); setMessage('Waiting for Freighter approval…')
    try {
      const installed = await isConnected()
      if (installed.error || !installed.isConnected) {
        setStatus('not-installed'); setMessage('Freighter is not installed. Install the browser extension, then try again.'); return
      }
      const access = await requestAccess()
      if (access.error) throw access.error
      await readWallet()
    } catch (error) {
      setStatus('error'); setMessage(friendlyError(error))
    }
  }, [readWallet])

  useEffect(() => {
    let cancelled = false
    void isConnected().then((result) => {
      if (cancelled) return
      if (result.error || !result.isConnected) {
        setStatus('not-installed'); setMessage('Freighter is not installed. Install it to connect a Testnet account.')
      } else {
        setStatus('disconnected'); setMessage('Connect Freighter to load your Testnet account.')
        void readWallet().catch(() => undefined)
      }
    }).catch(() => { if (!cancelled) { setStatus('error'); setMessage('Unable to check Freighter. Please retry.') } })
    return () => { cancelled = true }
  }, [readWallet])

  useEffect(() => {
    if (status !== 'connected' && status !== 'wrong-network') return
    const watcher = new WatchWalletChanges(1_000)
    watcher.watch(({ address: nextAddress, network: nextNetwork, networkPassphrase, error }) => {
      if (!error && nextAddress) applyWallet(nextAddress, nextNetwork, networkPassphrase)
    })
    return () => watcher.stop()
  }, [applyWallet, status])

  const value = useMemo<WalletViewModel>(() => ({
    status, address, shortAddress: address ? shortenAddress(address) : '', network, message,
    horizonStatus, xlmBalance, usdcBalance, spendableXlm, spendableUsdc, receivableUsdc, trustlineStatus, connect,
    retryBalance: () => refreshBalance(), refreshAccount: () => refreshBalance(),
  }), [status, address, network, message, horizonStatus, xlmBalance, usdcBalance, spendableXlm, spendableUsdc, receivableUsdc, trustlineStatus, connect, refreshBalance])

  return <FreighterWalletContext.Provider value={value}>{children}</FreighterWalletContext.Provider>
}
