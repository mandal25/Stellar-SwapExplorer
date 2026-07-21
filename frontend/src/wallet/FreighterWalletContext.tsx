import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadXlmBalance } from '../services/horizon'
import type { HorizonStatus, TrustlineStatus, WalletStatus, WalletViewModel } from '../types/stellar'
import { shortenAddress } from '../utils/address'
import { FreighterWalletContext } from './context'
import { kit } from './kit'
import { SupportedWallet } from '@creit.tech/stellar-wallets-kit'

function friendlyError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'The wallet request failed. Please try again.'
}

export function FreighterWalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>('disconnected')
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<string | null>('TESTNET')
  const [message, setMessage] = useState('Connect wallet to load your Testnet account.')
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

  const applyWallet = useCallback((nextAddress: string) => {
    activeAddress.current = nextAddress; setAddress(nextAddress); setStatus('connected'); setMessage('Wallet is connected to Stellar Testnet.')
    void refreshBalance(nextAddress)
  }, [refreshBalance])

  const connect = useCallback(async () => {
    setStatus('connecting'); setMessage('Waiting for wallet approval…')
    try {
      await kit.openModal({
        onWalletSelected: async (option: SupportedWallet) => {
          try {
            kit.setWallet(option.id)
            const { address } = await kit.getAddress()
            applyWallet(address)
          } catch (e) {
            setStatus('error'); setMessage(friendlyError(e))
          }
        }
      })
    } catch (error) {
      setStatus('error'); setMessage(friendlyError(error))
    }
  }, [applyWallet])

  const value = useMemo<WalletViewModel>(() => ({
    status, address, shortAddress: address ? shortenAddress(address) : '', network, message,
    horizonStatus, xlmBalance, usdcBalance, spendableXlm, spendableUsdc, receivableUsdc, trustlineStatus, connect,
    retryBalance: () => refreshBalance(), refreshAccount: () => refreshBalance(),
  }), [status, address, network, message, horizonStatus, xlmBalance, usdcBalance, spendableXlm, spendableUsdc, receivableUsdc, trustlineStatus, connect, refreshBalance])

  return <FreighterWalletContext.Provider value={value}>{children}</FreighterWalletContext.Provider>
}

