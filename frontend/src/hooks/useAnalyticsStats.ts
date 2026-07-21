import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUserStats } from '../services/soroban'
import type { UserStats } from '../types/contracts'

export function useAnalyticsStats(address: string | null, refreshKey = 0) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const generation = useRef(0)
  const load = useCallback(async () => {
    const request = ++generation.current
    if (!address) { setStats(null); setStatus('idle'); return }
    setStatus('loading')
    try { const value = await fetchUserStats(address); if (request === generation.current) { setStats(value); setStatus('success') } }
    catch { if (request === generation.current) { setStats(null); setStatus('error') } }
  }, [address])
  useEffect(() => { void load(); return () => { generation.current += 1 } }, [load, refreshKey])
  return { stats, status, retry: load }
}
