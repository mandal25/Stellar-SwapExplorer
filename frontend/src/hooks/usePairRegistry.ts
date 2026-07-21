import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRegistryPair } from '../services/soroban'
import type { RegistryPair } from '../types/contracts'

export function usePairRegistry(address: string | null) {
  const [pair, setPair] = useState<RegistryPair | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('Connect a funded Testnet account to verify Pair Registry configuration.')
  const generation = useRef(0)
  const load = useCallback(async () => {
    const request = ++generation.current
    if (!address) { setPair(null); setStatus('idle'); return }
    setStatus('loading'); setMessage('Verifying XLM_USDC with Pair Registry…')
    try {
      const value = await fetchRegistryPair(address)
      if (request !== generation.current) return
      setPair(value); setStatus('success'); setMessage(value.active ? `Pair active · maximum slippage ${value.maxSlippageBps / 100}%` : 'XLM_USDC is currently inactive in Pair Registry.')
    } catch {
      if (request !== generation.current) return
      setPair(null); setStatus('error'); setMessage('Pair Registry configuration could not be verified. Swapping is disabled.')
    }
  }, [address])
  useEffect(() => { void load(); return () => { generation.current += 1 } }, [load])
  return { pair, status, message, retry: load, canSwap: status === 'success' && pair?.active === true }
}
