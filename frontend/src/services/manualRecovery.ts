import { getAddress, getNetwork } from '@stellar/freighter-api'
import { Horizon } from '@stellar/stellar-sdk'
import { TESTNET_USDC_ISSUER } from '../config/assets'
import { isTestnetNetwork, stellarConfig } from '../config/stellar'
import { decimalToI128, PAIR_ID } from './contractValues'
import type { AnalyticsRecordInput } from '../types/contracts'
import type { ConfirmedPathOperation } from './pathPayment'
import { parseDecimal } from '../utils/decimal'

export type RecoveredClassicSwap = {
  analytics: AnalyticsRecordInput
  hash: string
  wallet: string
  sentAsset: 'XLM' | 'USDC'
  receivedAsset: 'XLM' | 'USDC'
  sentAmount: string
  receivedAmount: string
  timestamp: Date
}
type TransactionRecord = { hash: string; successful: boolean; source_account: string; created_at: string }
export type ManualRecoveryDeps = {
  network: typeof getNetwork
  address: typeof getAddress
  transaction: (hash: string) => Promise<TransactionRecord>
  operations: (hash: string) => Promise<ConfirmedPathOperation[]>
  wait: (milliseconds: number, signal?: AbortSignal) => Promise<void>
}

function abortableWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('Recovery cancelled.', 'AbortError'))
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Recovery cancelled.', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, milliseconds)
    signal?.addEventListener('abort', abort, { once: true })
  })
}
function defaults(): ManualRecoveryDeps {
  const server = new Horizon.Server(stellarConfig.horizonUrl)
  return {
    network: getNetwork, address: getAddress,
    transaction: (hash) => server.transactions().transaction(hash).call() as Promise<TransactionRecord>,
    operations: async (hash) => (await server.operations().forTransaction(hash).limit(200).order('asc').call()).records as unknown as ConfirmedPathOperation[],
    wait: abortableWait,
  }
}
function sourceAsset(operation: ConfirmedPathOperation): 'XLM' | 'USDC' | null {
  if (operation.source_asset_type === 'native') return 'XLM'
  return operation.source_asset_code === 'USDC' && operation.source_asset_issuer === TESTNET_USDC_ISSUER ? 'USDC' : null
}
function destinationAsset(operation: ConfirmedPathOperation): 'XLM' | 'USDC' | null {
  if (operation.asset_type === 'native') return 'XLM'
  return operation.asset_code === 'USDC' && operation.asset_issuer === TESTNET_USDC_ISSUER ? 'USDC' : null
}
function recoveryError(error: unknown): Error {
  if (error instanceof Error && ['wrong_network', 'transaction_not_found', 'transaction_failed', 'wrong_wallet', 'wrong_operation', 'wrong_asset', 'horizon_delay', 'malformed_horizon'].includes(error.message)) return error
  const status = error && typeof error === 'object' && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined
  return new Error(status === 404 ? 'transaction_not_found' : 'horizon_unavailable')
}

export async function recoverClassicSwap(hash: string, wallet: string, signal?: AbortSignal, deps = defaults()): Promise<RecoveredClassicSwap> {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) throw new Error('invalid_hash')
  const normalizedHash = hash.toLowerCase()
  const network = await deps.network()
  if (network.error || !isTestnetNetwork(network.network, network.networkPassphrase)) throw new Error('wrong_network')
  const connected = await deps.address()
  if (connected.error || connected.address !== wallet) throw new Error('wrong_wallet')
  let transaction: TransactionRecord | null = null
  let transactionError: unknown
  for (const delay of [0, 250, 750]) {
    if (signal?.aborted) throw new DOMException('Recovery cancelled.', 'AbortError')
    if (delay) await deps.wait(delay, signal)
    try { transaction = await deps.transaction(normalizedHash); break } catch (error) { transactionError = error }
  }
  if (!transaction) throw recoveryError(transactionError)
  if (transaction.hash !== normalizedHash) throw new Error('malformed_horizon')
  if (!transaction.successful) throw new Error('transaction_failed')
  if (transaction.source_account !== wallet) throw new Error('wrong_wallet')
  const timestamp = new Date(transaction.created_at)
  if (Number.isNaN(timestamp.valueOf())) throw new Error('malformed_horizon')
  let records: ConfirmedPathOperation[] = []
  for (const delay of [0, 250, 500, 1_000, 2_000]) {
    if (signal?.aborted) throw new DOMException('Recovery cancelled.', 'AbortError')
    if (delay) await deps.wait(delay, signal)
    try { records = await deps.operations(normalizedHash) } catch { records = [] }
    if (records.length) break
  }
  if (!records.length) throw new Error('horizon_delay')
  const pathPayments = records.filter((record) => record.type === 'path_payment_strict_send' && record.transaction_hash === normalizedHash && record.transaction_successful === true)
  if (!pathPayments.length) throw new Error('wrong_operation')
  const owned = pathPayments.filter((record) => record.from === wallet && record.to === wallet)
  if (!owned.length) throw new Error('wrong_wallet')
  const operation = owned.find((record) => { const source = sourceAsset(record); const destination = destinationAsset(record); return source !== null && destination !== null && source !== destination })
  if (!operation) throw new Error('wrong_asset')
  const sent = parseDecimal(operation.source_amount ?? ''); const received = parseDecimal(operation.amount ?? '')
  if (!sent || !received || sent <= 0n || received <= 0n || operation.created_at !== transaction.created_at) throw new Error('malformed_horizon')
  const sentAsset = sourceAsset(operation)!; const receivedAsset = destinationAsset(operation)!
  const sentAmount = operation.source_amount!; const receivedAmount = operation.amount!
  return {
    hash: normalizedHash, wallet, sentAsset, receivedAsset, sentAmount, receivedAmount, timestamp,
    analytics: { user: wallet, transactionHash: normalizedHash, pairId: PAIR_ID, sentAmount: decimalToI128(sentAmount), receivedAmount: decimalToI128(receivedAmount), timestamp: BigInt(Math.floor(timestamp.valueOf() / 1000)) },
  }
}

export function friendlyRecoveryError(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  if (code === 'invalid_hash') return 'Enter exactly one 64-character hexadecimal transaction hash.'
  if (code === 'transaction_not_found') return 'That transaction was not found on Stellar Testnet.'
  if (code === 'transaction_failed') return 'That Classic transaction did not succeed.'
  if (code === 'wrong_wallet') return 'This transaction does not belong to the connected Freighter wallet.'
  if (code === 'wrong_network') return 'Freighter must remain connected to Stellar Testnet.'
  if (code === 'wrong_operation') return 'The transaction is not a successful strict-send path payment.'
  if (code === 'wrong_asset') return 'The transaction is not an XLM and official Testnet USDC swap.'
  if (code === 'horizon_delay') return 'Horizon has not indexed the confirmed operation yet. Please retry shortly.'
  return 'Horizon could not safely recover this Testnet swap. Please retry.'
}
