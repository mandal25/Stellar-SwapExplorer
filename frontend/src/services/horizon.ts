import { Horizon } from '@stellar/stellar-sdk'
import { stellarConfig } from '../config/stellar'
import type { AccountBalanceResult } from '../types/stellar'
import { TESTNET_USDC_ISSUER } from '../config/assets'
import { formatDecimal, parseDecimal } from '../utils/decimal'

type Balance = { asset_type: string; balance: string; limit?: string; selling_liabilities?: string; buying_liabilities?: string; asset_code?: string; asset_issuer?: string; is_authorized?: boolean; is_authorized_to_maintain_liabilities?: boolean }
type AccountLike = { balances: Balance[]; subentry_count?: number; num_sponsoring?: number; num_sponsored?: number }
type AccountLoader = { loadAccount: (address: string) => Promise<AccountLike> }

export function extractXlmBalance(account: AccountLike): string | null {
  return account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? null
}

export function detectUsdcTrustline(account: AccountLike): { status: 'present' | 'missing' | 'unauthorized'; balance: string | null } {
  const line = account.balances.find((balance) => balance.asset_code === 'USDC' && balance.asset_issuer === TESTNET_USDC_ISSUER)
  if (!line) return { status: 'missing', balance: null }
  if (line.is_authorized === false || line.is_authorized_to_maintain_liabilities === false) return { status: 'unauthorized', balance: line.balance }
  return { status: 'present', balance: line.balance }
}

const BASE_RESERVE = 5_000_000n
const TRANSACTION_FEE_RESERVE = 100n
function units(value?: string): bigint { return value ? parseDecimal(value) ?? 0n : 0n }
function formatUnits(value: bigint): string { return formatDecimal(value > 0n ? value : 0n) }
export function calculateSpendableBalances(account: AccountLike): { xlm: string; usdc: string | null; usdcReceivable: string | null } {
  const native = account.balances.find((balance) => balance.asset_type === 'native')
  const usdc = account.balances.find((balance) => balance.asset_code === 'USDC' && balance.asset_issuer === TESTNET_USDC_ISSUER)
  const reserveEntries = Math.max(0, 2 + (account.subentry_count ?? 0) + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0))
  const xlm = units(native?.balance) - BigInt(reserveEntries) * BASE_RESERVE - units(native?.selling_liabilities) - TRANSACTION_FEE_RESERVE
  const credit = usdc ? units(usdc.balance) - units(usdc.selling_liabilities) : null
  const receivable = usdc ? units(usdc.limit) - units(usdc.balance) - units(usdc.buying_liabilities) : null
  return { xlm: formatUnits(xlm), usdc: credit === null ? null : formatUnits(credit), usdcReceivable: receivable === null ? null : formatUnits(receivable) }
}

export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { response?: { status?: number }; status?: number }
  return candidate.response?.status === 404 || candidate.status === 404
}

export async function loadXlmBalance(address: string, server: AccountLoader = new Horizon.Server(stellarConfig.horizonUrl)): Promise<AccountBalanceResult> {
  try {
    const account = await server.loadAccount(address)
    const trustline = detectUsdcTrustline(account)
    const spendable = calculateSpendableBalances(account)
    return { kind: 'funded', xlmBalance: extractXlmBalance(account) ?? '0.0000000', usdcBalance: trustline.balance, spendableXlm: spendable.xlm, spendableUsdc: spendable.usdc, receivableUsdc: spendable.usdcReceivable, trustlineStatus: trustline.status }
  } catch (error) {
    if (isNotFoundError(error)) return { kind: 'unfunded' }
    throw new Error('Horizon is temporarily unavailable. Please try again.')
  }
}
