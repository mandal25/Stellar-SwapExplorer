export function shortenAddress(address: string, visible = 5): string {
  if (address.length <= visible * 2 + 1) return address
  return `${address.slice(0, visible)}…${address.slice(-visible)}`
}
