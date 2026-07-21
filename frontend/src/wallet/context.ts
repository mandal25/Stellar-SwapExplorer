import { createContext } from 'react'
import type { WalletViewModel } from '../types/stellar'

export const FreighterWalletContext = createContext<WalletViewModel | null>(null)
