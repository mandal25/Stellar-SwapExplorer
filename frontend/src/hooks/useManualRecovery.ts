import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RecoveredClassicSwap } from '../services/manualRecovery'
import { friendlyRecoveryError, recoverClassicSwap } from '../services/manualRecovery'
import { analyticsRecordExists, friendlySorobanError, submitAnalytics } from '../services/soroban'

type RecoveryStatus = 'idle' | 'checking' | 'review' | 'submitting' | 'success' | 'already-recorded' | 'error'
export type ManualRecoveryDeps = {
  exists: typeof analyticsRecordExists
  recover: typeof recoverClassicSwap
  submit: typeof submitAnalytics
}
const defaultDeps: ManualRecoveryDeps = { exists: analyticsRecordExists, recover: recoverClassicSwap, submit: submitAnalytics }

export function useManualRecovery(address: string | null, onRecorded: () => void, deps = defaultDeps) {
  const [open, setOpen] = useState(false); const [hash, setHash] = useState('')
  const [status, setStatus] = useState<RecoveryStatus>('idle'); const [message, setMessage] = useState('')
  const [recovered, setRecovered] = useState<RecoveredClassicSwap | null>(null)
  const generation = useRef(0); const controller = useRef<AbortController | null>(null); const inFlight = useRef(false)
  const cancelRequest = useCallback(() => { generation.current += 1; controller.current?.abort(); controller.current = null; inFlight.current = false }, [])
  useEffect(() => cancelRequest, [cancelRequest])
  const close = useCallback(() => { if (status === 'submitting') return; cancelRequest(); setOpen(false); setHash(''); setRecovered(null); setStatus('idle'); setMessage('') }, [status, cancelRequest])
  const begin = useCallback(() => { cancelRequest(); setHash(''); setRecovered(null); setStatus('idle'); setMessage(''); setOpen(true) }, [cancelRequest])
  const changeHash = useCallback((value: string) => { cancelRequest(); setHash(value); setRecovered(null); setStatus('idle'); setMessage('') }, [cancelRequest])

  const check = useCallback(async () => {
    if (!address || inFlight.current) return
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) { setStatus('error'); setMessage('Enter exactly one 64-character hexadecimal transaction hash.'); return }
    const request = ++generation.current; const abort = new AbortController(); controller.current = abort; inFlight.current = true
    setStatus('checking'); setMessage('Checking Swap Analytics before reading the confirmed Horizon transaction…'); setRecovered(null)
    try {
      if (await deps.exists({ user: address, transactionHash: hash.toLowerCase() })) {
        if (request !== generation.current) return
        setStatus('already-recorded'); setMessage('Already recorded. Persistent analytics stats were refreshed.'); onRecorded(); return
      }
      const result = await deps.recover(hash, address, abort.signal)
      if (request !== generation.current || abort.signal.aborted) return
      setRecovered(result); setStatus('review'); setMessage('Confirmed Classic swap recovered from Testnet Horizon. Review before recording analytics.')
    } catch (error) {
      if (request !== generation.current || abort.signal.aborted) return
      setStatus('error'); setMessage(error instanceof Error && error.message === 'analytics_lookup_failed' ? 'Swap Analytics could not check this hash. Please retry.' : friendlyRecoveryError(error))
    } finally { if (request === generation.current) { inFlight.current = false; controller.current = null } }
  }, [address, hash, deps, onRecorded])

  const confirm = useCallback(async () => {
    if (!recovered || inFlight.current) return
    const immutable = recovered; const request = ++generation.current; inFlight.current = true; setStatus('submitting'); setMessage('Rechecking the analytics record…')
    try {
      if (await deps.exists({ user: immutable.wallet, transactionHash: immutable.hash })) {
        if (request !== generation.current) return
        setStatus('already-recorded'); setMessage('Already recorded. Persistent analytics stats were refreshed.'); setRecovered(null); onRecorded(); return
      }
      const result = await deps.submit(immutable.analytics, (_next, nextMessage) => { if (request === generation.current) setMessage(nextMessage) })
      if (request !== generation.current) return
      setRecovered(null); setStatus(result.duplicate ? 'already-recorded' : 'success'); setMessage(result.duplicate ? 'Already recorded. Persistent analytics stats were refreshed.' : 'Recovered swap analytics confirmed on Soroban Testnet.'); onRecorded()
    } catch (error) {
      if (request !== generation.current) return
      setStatus('error'); setMessage(friendlySorobanError(error))
    } finally { if (request === generation.current) inFlight.current = false }
  }, [recovered, deps, onRecorded])

  return useMemo(() => ({ open, hash, status, message, recovered, busy: status === 'checking' || status === 'submitting', canCancel: status !== 'submitting', begin, close, changeHash, check, confirm }), [open, hash, status, message, recovered, begin, close, changeHash, check, confirm])
}
