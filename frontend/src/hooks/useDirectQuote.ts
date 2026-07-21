import { useEffect, useRef, useState } from 'react'
import type { AssetConfig } from '../config/assets'
import { fetchDirectQuote } from '../services/directQuote'
import type { QuoteResult } from '../types/market'
import { parseDecimal } from '../utils/decimal'

export function useDirectQuote(from: AssetConfig, to: AssetConfig, amount: string, slippageBps: bigint, bestPrice?: string | null) {
  const [quote, setQuote] = useState<QuoteResult | null>(null); const [quotedAt, setQuotedAt] = useState<Date | null>(null); const request = useRef(0)
  useEffect(() => {
    const current = ++request.current; const controller = new AbortController()
    if ((parseDecimal(amount) ?? 0n) <= 0n) { setQuote(null); setQuotedAt(null); return () => controller.abort() }
    const timer = window.setTimeout(() => { void fetchDirectQuote(from, to, amount, slippageBps, bestPrice, controller.signal).then((result) => {
      if (!controller.signal.aborted && current === request.current) { setQuote(result); setQuotedAt(result ? new Date() : null) }
    }).catch(() => { if (!controller.signal.aborted && current === request.current) { setQuote(null); setQuotedAt(null) } }) }, 250)
    return () => { controller.abort(); window.clearTimeout(timer); request.current += 1 }
  }, [from, to, amount, slippageBps, bestPrice])
  return { quote, quotedAt }
}
