export type FriendlyCondition = 'freighter-missing' | 'wallet-rejected' | 'wrong-network' | 'account-unfunded' | 'trustline-missing' | 'trustline-unauthorized' | 'orderbook-empty' | 'horizon-unavailable' | 'insufficient-liquidity'
const messages: Record<FriendlyCondition, string> = {
  'freighter-missing': 'Freighter is not installed. Install the browser extension, then try again.',
  'wallet-rejected': 'The request was rejected or cancelled in Freighter.',
  'wrong-network': 'Switch Freighter to Stellar Testnet to continue.',
  'account-unfunded': 'Fund this account on Stellar Testnet before continuing.',
  'trustline-missing': 'Add the official Testnet USDC trustline before receiving USDC.',
  'trustline-unauthorized': 'The official Testnet USDC trustline is unauthorized or frozen.',
  'orderbook-empty': 'No live offers are available for this pair.',
  'horizon-unavailable': 'Stellar Testnet Horizon is temporarily unavailable. Please retry.',
  'insufficient-liquidity': 'The visible orderbook cannot fill the requested amount.',
}
export function friendlyMessage(condition: FriendlyCondition): string { return messages[condition] }
