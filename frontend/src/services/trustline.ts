import { TESTNET_USDC } from '../config/assets'
import { stellarConfig } from '../config/stellar'
import type { TrustlineActionStatus } from '../types/stellar'
import { Asset, BASE_FEE, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

export type TrustlineProgress = (status: TrustlineActionStatus, message: string) => void
export function isWalletRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  return /reject|cancel|declin|denied/i.test(String(error.message))
}

export async function addUsdcTrustline(address: string, progress: TrustlineProgress): Promise<void> {
  try {
    progress('preparing', 'Preparing a fresh Testnet trustline transaction…')
    const server = new Horizon.Server(stellarConfig.horizonUrl)
    const source = await server.loadAccount(address)
    const transaction = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: stellarConfig.networkPassphrase })
      .addOperation(Operation.changeTrust({ asset: new Asset(TESTNET_USDC.code, TESTNET_USDC.issuer!) }))
      .setTimeout(180).build()
    progress('awaiting-signature', 'Review and approve the USDC trustline in Freighter.')
    const signed = await signTransaction(transaction.toXDR(), { networkPassphrase: stellarConfig.networkPassphrase, address })
    if (signed.error || !signed.signedTxXdr) {
      progress('rejected', 'The trustline request was rejected or cancelled in Freighter.')
      return
    }
    progress('submitting', 'Submitting the trustline transaction to Testnet…')
    await server.submitTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, stellarConfig.networkPassphrase))
    progress('confirmed', 'USDC trustline confirmed on Stellar Testnet.')
  } catch (error) {
    if (isWalletRejection(error)) progress('rejected', 'The trustline request was rejected or cancelled in Freighter.')
    else progress('failed', 'The trustline could not be added. Check your Testnet account and try again.')
  }
}
