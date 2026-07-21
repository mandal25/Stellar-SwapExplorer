export const SCALE = 10_000_000n

export function parseDecimal(value: string, decimals = 7): bigint | null {
  if (!/^\d+(\.\d*)?$/.test(value.trim())) return null
  const [whole, fraction = ''] = value.trim().split('.')
  if (fraction.length > decimals) return null
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals))
}

export function formatDecimal(value: bigint, decimals = 7, displayDecimals = decimals): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const scale = 10n ** BigInt(decimals)
  const whole = absolute / scale
  const fraction = (absolute % scale).toString().padStart(decimals, '0').slice(0, displayDecimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

export function multiplyScaled(a: bigint, b: bigint): bigint { return a * b / SCALE }
export function divideScaled(a: bigint, b: bigint): bigint { return b === 0n ? 0n : a * SCALE / b }
