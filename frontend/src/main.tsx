import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { FreighterWalletProvider } from './wallet/FreighterWalletContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FreighterWalletProvider><App /></FreighterWalletProvider>
  </StrictMode>,
)
