import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssetConfig } from '../config/assets'
import { fetchOrderbook } from '../services/orderbook'
import type { OrderbookSnapshot } from '../types/market'

export type OrderbookState = { status: 'loading' | 'success' | 'empty' | 'error'; book: OrderbookSnapshot | null; message: string }

export function createLatestRequestGate() {
  let latest = 0
  return { next: () => ++latest, isLatest: (request: number) => request === latest }
}

export function useOrderbook(selling: AssetConfig, buying: AssetConfig, intervalMs = 10_000) {
  const [state, setState] = useState<OrderbookState>({ status: 'loading', book: null, message: 'Loading live Testnet orderbook…' })
  const requestId = useRef(0)
  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current
    setState((previous) => ({ ...previous, status: 'loading', message: 'Refreshing live Testnet orderbook…' }))
    try {
      const book = await fetchOrderbook(selling, buying, signal)
      if (signal?.aborted || current !== requestId.current) return
      setState({ status: book.bids.length || book.asks.length ? 'success' : 'empty', book, message: book.bids.length || book.asks.length ? 'Live Testnet liquidity' : 'No offers are available for this pair.' })
    } catch (error) {
      if (signal?.aborted || current !== requestId.current) return
      setState({ status: 'error', book: null, message: error instanceof Error ? error.message : 'Horizon orderbook is temporarily unavailable.' })
    }
  }, [selling, buying])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    const timer = window.setInterval(() => void load(controller.signal), intervalMs)
    return () => { controller.abort(); window.clearInterval(timer); requestId.current += 1 }
  }, [load, intervalMs])
  return { ...state, retry: () => load() }
}
