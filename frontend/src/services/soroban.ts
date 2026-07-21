import { getAddress, getNetwork, signTransaction } from '@stellar/freighter-api'
import { BASE_FEE, Contract, nativeToScVal, rpc, TransactionBuilder, type xdr } from '@stellar/stellar-sdk'
import { stellarConfig, stellarConfigErrors, isTestnetNetwork } from '../config/stellar'
import type { AnalyticsRecordInput, RegistryPair, UserStats } from '../types/contracts'
import { decodeRegistryPair, decodeUserStats, hashToBytes, nativeResult, PAIR_ID, recordSwapArgs } from './contractValues'

const explorer = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
export type SorobanProgress = (status: 'preparing' | 'awaiting-signature' | 'submitting', message: string) => void
export type SorobanDeps = {
  server: Pick<rpc.Server, 'getAccount' | 'simulateTransaction' | 'prepareTransaction' | 'sendTransaction' | 'getTransaction'>
  network: typeof getNetwork
  address: typeof getAddress
  sign: typeof signTransaction
  wait: (milliseconds: number) => Promise<void>
}

function defaults(): SorobanDeps {
  return { server: new rpc.Server(stellarConfig.sorobanRpcUrl), network: getNetwork, address: getAddress, sign: signTransaction, wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }
}
function ensureConfigured() { if (stellarConfigErrors.length) throw new Error('invalid_configuration') }
function invocation(source: Awaited<ReturnType<rpc.Server['getAccount']>>, contractId: string, method: string, args: xdr.ScVal[]) {
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: stellarConfig.networkPassphrase })
    .addOperation(new Contract(contractId).call(method, ...args)).setTimeout(180).build()
}
async function simulateRead(address: string, contractId: string, method: string, args: xdr.ScVal[], deps = defaults()): Promise<unknown> {
  ensureConfigured()
  const transaction = invocation(await deps.server.getAccount(address), contractId, method, args)
  const result = await deps.server.simulateTransaction(transaction)
  if (!rpc.Api.isSimulationSuccess(result) || !result.result) throw new Error('contract_read_failed')
  return nativeResult(result.result.retval)
}

export async function fetchRegistryPair(address: string, deps = defaults()): Promise<RegistryPair> {
  return decodeRegistryPair(await simulateRead(address, stellarConfig.pairRegistryContractId, 'get_pair', [nativeToScVal(PAIR_ID, { type: 'symbol' })], deps))
}
export async function fetchUserStats(address: string, deps = defaults()): Promise<UserStats> {
  return decodeUserStats(await simulateRead(address, stellarConfig.swapAnalyticsContractId, 'get_user_stats', [new (await import('@stellar/stellar-sdk')).Address(address).toScVal()], deps))
}
export async function analyticsRecordExists(input: Pick<AnalyticsRecordInput, 'user' | 'transactionHash'>, deps = defaults()): Promise<boolean> {
  ensureConfigured()
  const { Address } = await import('@stellar/stellar-sdk')
  const transaction = invocation(await deps.server.getAccount(input.user), stellarConfig.swapAnalyticsContractId, 'get_swap', [new Address(input.user).toScVal(), nativeToScVal(hashToBytes(input.transactionHash), { type: 'bytes' })])
  const result = await deps.server.simulateTransaction(transaction)
  if (rpc.Api.isSimulationSuccess(result) && result.result) return true
  if (rpc.Api.isSimulationError(result) && /Error\(Contract,\s*#?3\)/.test(result.error)) return false
  throw new Error('analytics_lookup_failed')
}

export async function submitAnalytics(input: AnalyticsRecordInput, progress: SorobanProgress, deps = defaults()): Promise<{ hash: string; explorerUrl: string; duplicate: boolean }> {
  ensureConfigured()
  if (await analyticsRecordExists(input, deps)) return { hash: '', explorerUrl: '', duplicate: true }
  progress('preparing', 'Simulating the separate Soroban analytics transaction…')
  const network = await deps.network()
  if (network.error || !isTestnetNetwork(network.network, network.networkPassphrase)) throw new Error('wrong_network')
  const raw = invocation(await deps.server.getAccount(input.user), stellarConfig.swapAnalyticsContractId, 'record_swap', recordSwapArgs(input))
  const prepared = await deps.server.prepareTransaction(raw)
  const [signer, networkBeforeSigning] = await Promise.all([deps.address(), deps.network()])
  if (signer.error || signer.address !== input.user) throw new Error('wrong_signer')
  if (networkBeforeSigning.error || !isTestnetNetwork(networkBeforeSigning.network, networkBeforeSigning.networkPassphrase)) throw new Error('wrong_network')
  progress('awaiting-signature', 'Approve the separate TESTNET analytics transaction in Freighter.')
  const signed = await deps.sign(prepared.toXDR(), { address: input.user, networkPassphrase: stellarConfig.networkPassphrase })
  if (signed.error || !signed.signedTxXdr) throw new Error('signature_rejected')
  if (signed.signerAddress !== input.user) throw new Error('wrong_signer')
  const networkAgain = await deps.network()
  if (networkAgain.error || !isTestnetNetwork(networkAgain.network, networkAgain.networkPassphrase)) throw new Error('wrong_network')
  progress('submitting', 'Submitting analytics to Soroban Testnet…')
  const sent = await deps.server.sendTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, stellarConfig.networkPassphrase))
  if (sent.status === 'ERROR' || sent.status === 'TRY_AGAIN_LATER') throw new Error('analytics_submission_failed')
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await deps.server.getTransaction(sent.hash)
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash: sent.hash, explorerUrl: explorer(sent.hash), duplicate: false }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      if (await analyticsRecordExists(input, deps)) return { hash: sent.hash, explorerUrl: explorer(sent.hash), duplicate: true }
      throw new Error('analytics_transaction_failed')
    }
    await deps.wait(1_000)
  }
  throw new Error('analytics_timeout')
}

export function friendlySorobanError(error: unknown): string {
  if (error instanceof Error && error.message === 'wrong_network') return 'Freighter must remain on Stellar Testnet.'
  if (error instanceof Error && error.message === 'wrong_signer') return 'Freighter returned a different signer. Reconnect the intended Testnet account.'
  if (error instanceof Error && error.message === 'signature_rejected') return 'Analytics signing was cancelled. Your Classic swap remains confirmed.'
  return 'The swap is confirmed, but analytics could not be recorded. You can retry without repeating the swap.'
}
