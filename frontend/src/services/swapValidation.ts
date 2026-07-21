import { TESTNET_USDC_ISSUER, type AssetConfig } from '../config/assets'
import { isTestnetNetwork } from '../config/stellar'
import type { QuoteResult } from '../types/market'
import type { WalletViewModel } from '../types/stellar'
import { formatDecimal, parseDecimal } from '../utils/decimal'

export type SwapValidationInput = { wallet: WalletViewModel; from: AssetConfig; to: AssetConfig; amount: string; quote: QuoteResult | null; quotedAt: Date | null; inProgress: boolean }
export type SwapValidationResult = { valid: true } | { valid: false; message: string }

export function isSupportedDirectPair(from: AssetConfig, to: AssetConfig): boolean {
  const validIssuer = (asset: AssetConfig) => asset.type === 'native' || asset.issuer === TESTNET_USDC_ISSUER
  return from.id !== to.id && validIssuer(from) && validIssuer(to) && new Set([from.code, to.code]).size === 2 && [from.code, to.code].every((code) => code === 'XLM' || code === 'USDC')
}
export function isQuoteFresh(quotedAt: Date | null, now = Date.now(), maxAgeMs = 15_000): boolean { return !!quotedAt && now - quotedAt.getTime() <= maxAgeMs }
export function maxSpendable(wallet: WalletViewModel, asset: AssetConfig): string { return asset.type === 'native' ? wallet.spendableXlm ?? '0' : wallet.spendableUsdc ?? '0' }
export function validateSwap(input: SwapValidationInput): SwapValidationResult {
  const { wallet, from, to, amount, quote } = input
  if (input.inProgress) return { valid: false, message: 'A Testnet transaction is already in progress.' }
  if (wallet.status !== 'connected' || !wallet.address) return { valid: false, message: 'Connect Freighter before reviewing a swap.' }
  if (!isTestnetNetwork(wallet.network ?? '')) return { valid: false, message: 'Switch Freighter to Stellar Testnet to continue.' }
  if (wallet.horizonStatus === 'unfunded') return { valid: false, message: 'Fund this Testnet account before swapping.' }
  if (wallet.horizonStatus !== 'success') return { valid: false, message: 'Wait for the Testnet account to finish loading.' }
  if (!isSupportedDirectPair(from, to)) return { valid: false, message: 'Only direct XLM and official Testnet USDC swaps are supported.' }
  const parsed = parseDecimal(amount)
  if (!parsed || parsed <= 0n) return { valid: false, message: 'Enter a positive amount with no more than 7 decimals.' }
  if (to.code === 'USDC' || from.code === 'USDC') {
    if (wallet.trustlineStatus === 'missing') return { valid: false, message: 'Add the official Testnet USDC trustline first.' }
    if (wallet.trustlineStatus === 'unauthorized') return { valid: false, message: 'The USDC trustline is unauthorized or frozen.' }
    if (wallet.trustlineStatus !== 'present') return { valid: false, message: 'Wait for the USDC trustline status to finish loading.' }
  }
  const available = parseDecimal(maxSpendable(wallet, from)) ?? 0n
  if (parsed > available) return { valid: false, message: `Amount exceeds the spendable ${from.code} balance of ${formatDecimal(available)}.` }
  if (!quote || quote.insufficientLiquidity) return { valid: false, message: 'The live direct orderbook cannot fill this amount.' }
  if (to.code === 'USDC' && (parseDecimal(quote.expectedOutput) ?? 0n) > (parseDecimal(wallet.receivableUsdc ?? '0') ?? 0n)) return { valid: false, message: 'The expected USDC output exceeds the trustline receiving limit.' }
  if (!input.quotedAt || !isQuoteFresh(input.quotedAt)) return { valid: false, message: 'The quote is stale. Refresh it before reviewing.' }
  if (!parseDecimal(quote.minimumReceived)) return { valid: false, message: 'The estimated minimum received is invalid.' }
  return { valid: true }
}
