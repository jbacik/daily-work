// Compact relative time for provenance markers ("2h ago"), not for durations.
export function formatTimeAgo(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null
  const then = new Date(iso)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (Number.isNaN(seconds)) return null
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
