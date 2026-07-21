import { signTransaction, getNetwork } from '@stellar/freighter-api'
import { Asset, BASE_FEE, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { TESTNET_USDC_ISSUER, type AssetConfig } from '../config/assets'
import { stellarConfig, isTestnetNetwork } from '../config/stellar'
import type { SwapExecutionStatus } from '../types/swap'
import { parseDecimal } from '../utils/decimal'

export type PathPaymentInput = { address: string; from: AssetConfig; to: AssetConfig; amount: string; destMin: string; signal?: AbortSignal }
export type ExecutionProgress = (status: SwapExecutionStatus, message: string) => void
export type ExecutionResult = { hash: string; sentAmount: string; receivedAmount: string | null; confirmedAt: Date | null }
export type ConfirmedOperation = { sentAmount: string; receivedAmount: string; confirmedAt: Date }
type SourceAccount = Awaited<ReturnType<Horizon.Server['loadAccount']>>
export type PathPaymentDeps = {
  loadAccount: (address: string) => Promise<SourceAccount>
  sign: typeof signTransaction
  network: typeof getNetwork
  submit: (transaction: ReturnType<typeof TransactionBuilder.fromXDR>) => Promise<{ hash: string }>
  findReceived: (hash: string, input: PathPaymentInput, signal?: AbortSignal) => Promise<ConfirmedOperation | null>
}

function sdkAsset(asset: AssetConfig): Asset {
  if (asset.type === 'native') return Asset.native()
  if (asset.code !== 'USDC' || asset.issuer !== TESTNET_USDC_ISSUER) throw new Error('unsupported_asset')
  return new Asset('USDC', TESTNET_USDC_ISSUER)
}
export function pathPaymentOperationArgs(input: PathPaymentInput) {
  return { sendAsset: sdkAsset(input.from), sendAmount: input.amount, destination: input.address, destAsset: sdkAsset(input.to), destMin: input.destMin, path: [] as Asset[] }
}
export function isBadSequence(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } }
  return value.response?.data?.extras?.result_codes?.transaction === 'tx_bad_seq'
}
export function isTimedOut(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } }
  return value.response?.data?.extras?.result_codes?.transaction === 'tx_too_late'
}
export function horizonFailureMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Horizon could not submit the Testnet swap. No fake success was recorded.'
  const value = error as { response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } } }
  const codes = value.response?.data?.extras?.result_codes
  const operation = codes?.operations?.[0]
  if (operation === 'op_underfunded') return 'The selling balance is no longer sufficient. Refresh balances and retry.'
  if (operation === 'op_no_trust') return 'The official Testnet USDC trustline is missing.'
  if (operation === 'op_not_authorized') return 'The official Testnet USDC trustline is unauthorized or frozen.'
  if (operation === 'op_line_full') return 'The USDC trustline limit cannot receive this amount.'
  if (operation === 'op_too_few_offers' || operation === 'op_under_destmin') return 'Liquidity changed and can no longer satisfy the slippage-protected minimum.'
  if (codes?.transaction === 'tx_insufficient_fee') return 'The network fee is no longer sufficient. Review and rebuild the swap.'
  return 'Horizon could not submit the Testnet swap. No fake success was recorded.'
}
export type ConfirmedPathOperation = { type: string; amount?: string; source_amount?: string; asset_type?: string; asset_code?: string; asset_issuer?: string; source_asset_type?: string; source_asset_code?: string; source_asset_issuer?: string; from?: string; to?: string; created_at?: string; transaction_hash?: string; transaction_successful?: boolean }
export function extractConfirmedOperation(records: ConfirmedPathOperation[], input: PathPaymentInput, transactionHash: string): ConfirmedOperation | null {
  const expectedSource = parseDecimal(input.amount)
  const operation = records.find((record) => record.type === 'path_payment_strict_send' && record.transaction_successful === true && record.transaction_hash === transactionHash && record.from === input.address && record.to === input.address && expectedSource !== null && parseDecimal(record.source_amount ?? '') === expectedSource)
  if (!operation?.amount || !operation.created_at) return null
  const sourceMatches = input.from.type === 'native' ? operation.source_asset_type === 'native' : operation.source_asset_code === input.from.code && operation.source_asset_issuer === input.from.issuer
  const destinationMatches = input.to.type === 'native' ? operation.asset_type === 'native' : operation.asset_code === input.to.code && operation.asset_issuer === input.to.issuer
  const confirmedAt = new Date(operation.created_at)
  return sourceMatches && destinationMatches && !Number.isNaN(confirmedAt.valueOf()) ? { sentAmount: operation.source_amount!, receivedAmount: operation.amount, confirmedAt } : null
}
export function extractConfirmedDestinationAmount(records: ConfirmedPathOperation[], input: PathPaymentInput, transactionHash: string): string | null { return extractConfirmedOperation(records, input, transactionHash)?.receivedAmount ?? null }

type LoadOperations = () => Promise<ConfirmedPathOperation[]>
export async function pollConfirmedOperation(load: LoadOperations, hash: string, input: PathPaymentInput, signal?: AbortSignal, delays = [0, 250, 500, 1_000, 2_000]): Promise<ConfirmedOperation | null> {
  for (const delay of delays) {
    if (signal?.aborted) throw new DOMException('Confirmation lookup cancelled.', 'AbortError')
    if (delay > 0) await new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, delay); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Confirmation lookup cancelled.', 'AbortError')) }, { once: true }) })
    try { const confirmed = extractConfirmedOperation(await load(), input, hash); if (confirmed) return confirmed } catch (error) { if (signal?.aborted) throw error }
  }
  return null
}

function defaults(): PathPaymentDeps {
  const server = new Horizon.Server(stellarConfig.horizonUrl)
  return {
    loadAccount: (address) => server.loadAccount(address), sign: signTransaction, network: getNetwork,
    submit: (transaction) => server.submitTransaction(transaction),
    findReceived: (hash, input, signal) => pollConfirmedOperation(async () => {
      const page = await server.operations().forTransaction(hash).limit(200).order('asc').call()
      return page.records as unknown as ConfirmedPathOperation[]
    }, hash, input, signal),
  }
}

export async function recoverConfirmedPathPayment(hash: string, input: PathPaymentInput, signal?: AbortSignal, deps = defaults()): Promise<ConfirmedOperation | null> {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) return null
  return deps.findReceived(hash, input, signal)
}

export async function executePathPayment(input: PathPaymentInput, progress: ExecutionProgress, deps = defaults()): Promise<ExecutionResult | null> {
  if (!isTestnetNetwork(stellarConfig.network, stellarConfig.networkPassphrase)) { progress('failed', 'This build is not configured for Stellar Testnet.'); return null }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      progress('preparing', attempt ? 'Refreshing the account sequence and rebuilding once…' : 'Preparing a fresh Testnet path payment…')
      const network = await deps.network()
      if (network.error || !isTestnetNetwork(network.network, network.networkPassphrase)) throw new Error('wrong_network')
      const source = await deps.loadAccount(input.address)
      const transaction = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: stellarConfig.networkPassphrase })
        .addOperation(Operation.pathPaymentStrictSend(pathPaymentOperationArgs(input))).setTimeout(180).build()
      progress('awaiting-signature', 'Review and approve the TESTNET swap in Freighter.')
      const signed = await deps.sign(transaction.toXDR(), { address: input.address, networkPassphrase: stellarConfig.networkPassphrase })
      if (signed.error || !signed.signedTxXdr) { progress('rejected', 'The swap was rejected or cancelled in Freighter.'); return null }
      if (signed.signerAddress !== input.address) throw new Error('wrong_signer')
      progress('submitting', 'Submitting the signed swap to Stellar Testnet…')
      const result = await deps.submit(TransactionBuilder.fromXDR(signed.signedTxXdr, stellarConfig.networkPassphrase))
      if (!/^[0-9a-fA-F]{64}$/.test(result.hash)) throw new Error('unconfirmed_result')
      const confirmed = await deps.findReceived(result.hash, input, input.signal)
      return confirmed ? { hash: result.hash, ...confirmed } : { hash: result.hash, sentAmount: input.amount, receivedAmount: null, confirmedAt: null }
    } catch (error) {
      if (isBadSequence(error) && attempt === 0) continue
      if (isTimedOut(error)) progress('timed-out', 'The transaction timed out before submission. Review a fresh quote and try again.')
      else if (error instanceof Error && error.message === 'wrong_network') progress('failed', 'Freighter must remain on Stellar Testnet.')
      else if (error instanceof Error && error.message === 'wrong_signer') progress('failed', 'Freighter returned a different signer. Reconnect the intended Testnet account.')
      else progress('failed', isBadSequence(error) ? 'The account sequence changed again. Please retry.' : horizonFailureMessage(error))
      return null
    }
  }
  return null
}
