import { describe, expect, it } from 'vitest'
import { shortenAddress } from './address'

describe('shortenAddress', () => {
  it('keeps the recognizable beginning and end', () => {
    expect(shortenAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')).toBe('GABCD…67890')
  })
  it('leaves short values unchanged', () => {
    expect(shortenAddress('GSHORT')).toBe('GSHORT')
  })
})
