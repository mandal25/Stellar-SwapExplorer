import { useEffect, useRef } from 'react'
import { stellarConfig } from '../config/stellar'

interface Props {
  open: boolean
  onClose: () => void
}

export function ContractDialog({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const listener = (e: Event) => {
      if (e.target === dialog) onClose()
    }
    dialog.addEventListener('click', listener)
    dialog.addEventListener('cancel', onClose)
    return () => {
      dialog.removeEventListener('click', listener)
      dialog.removeEventListener('cancel', onClose)
    }
  }, [onClose])

  return (
    <dialog ref={dialogRef} className="review-dialog" aria-label="Contract IDs">
      <h2>Contract IDs</h2>
      <p style={{ color: '#8fa2b1', fontSize: '0.8rem', marginBottom: '20px' }}>
        These are the Soroban smart contracts powering the Testnet Swap Explorer.
      </p>
      
      <div style={{ marginBottom: '16px' }}>
        <strong style={{ display: 'block', color: '#657c8b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Pair Registry</strong>
        <code style={{ display: 'block', padding: '12px', background: '#0a1921', border: '1px solid #1c303a', borderRadius: '8px', color: '#5ee6be', wordBreak: 'break-all', fontSize: '0.8rem', userSelect: 'all' }}>
          {stellarConfig.pairRegistryContractId}
        </code>
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <strong style={{ display: 'block', color: '#657c8b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Swap Analytics</strong>
        <code style={{ display: 'block', padding: '12px', background: '#0a1921', border: '1px solid #1c303a', borderRadius: '8px', color: '#5ee6be', wordBreak: 'break-all', fontSize: '0.8rem', userSelect: 'all' }}>
          {stellarConfig.swapAnalyticsContractId}
        </code>
      </div>

      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose} style={{ gridColumn: '1 / -1' }}>
          Close
        </button>
      </div>
    </dialog>
  )
}
