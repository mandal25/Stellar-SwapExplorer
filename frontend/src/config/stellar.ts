import { Networks, StrKey } from '@stellar/stellar-sdk'

const env = import.meta.env

export const stellarConfig = Object.freeze({
  network: env.VITE_STELLAR_NETWORK || 'TESTNET',
  networkPassphrase: env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET,
  horizonUrl: env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  pairRegistryContractId: env.VITE_PAIR_REGISTRY_CONTRACT_ID || 'CDR5SAZRQDFXYRNWTT7PYG4ADYBCVHQGOD4ENUO5QFKGT77VKDW4Y6QB',
  swapAnalyticsContractId: env.VITE_SWAP_ANALYTICS_CONTRACT_ID || 'CAUH3EZEVDRMMZ7YX4G4FBYKRFXD5QAHIC67ZPDDZLX7QZSPH7CWPS3M',
})

export function validateStellarConfig(config = stellarConfig): string[] {
  const errors: string[] = []
  if (!isTestnetNetwork(config.network, config.networkPassphrase)) errors.push('The application must use Stellar Testnet.')
  if (config.horizonUrl !== 'https://horizon-testnet.stellar.org') errors.push('The Horizon endpoint must be the official Testnet endpoint.')
  if (config.sorobanRpcUrl !== 'https://soroban-testnet.stellar.org') errors.push('The Soroban RPC endpoint must be the official Testnet endpoint.')
  if (!StrKey.isValidContract(config.pairRegistryContractId)) errors.push('The Pair Registry contract ID is invalid.')
  if (!StrKey.isValidContract(config.swapAnalyticsContractId)) errors.push('The Swap Analytics contract ID is invalid.')
  return errors
}

export const stellarConfigErrors = validateStellarConfig()

export function isTestnetNetwork(network: string, passphrase?: string): boolean {
  return network.trim().toUpperCase() === 'TESTNET' && (!passphrase || passphrase === Networks.TESTNET)
}
