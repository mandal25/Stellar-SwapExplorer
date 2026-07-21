import { useContext } from 'react'
import { FreighterWalletContext } from './context'

export function useFreighterWallet() {
  const context = useContext(FreighterWalletContext)
  if (!context) throw new Error('useFreighterWallet must be used inside FreighterWalletProvider')
  return context
}
