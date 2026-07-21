import type { SwapExecutionStatus } from '../types/swap'
export function TransactionStatus({ status, message }: { status: SwapExecutionStatus; message: string }) {
  if (status === 'idle' && !message) return null
  return <section className={`transaction-status transaction-${status}`} aria-live="assertive"><strong>TESTNET · {status.replace('-', ' ')}</strong><span>{message}</span></section>
}
