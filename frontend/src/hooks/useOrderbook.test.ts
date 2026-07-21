import { describe, expect, it } from 'vitest'
import { createLatestRequestGate } from './useOrderbook'

describe('latest orderbook request gate', () => {
  it('ignores a stale pair response after selection changes', () => {
    const gate = createLatestRequestGate(); const oldPair = gate.next(); const newPair = gate.next()
    expect(gate.isLatest(oldPair)).toBe(false); expect(gate.isLatest(newPair)).toBe(true)
  })
})
