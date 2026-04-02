export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const

export function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]!
}

export function getCurrentDayIndex(): number {
  const day = new Date().getDay()
  if (day === 0) return -1 // Sunday
  if (day === 6) return 5  // Saturday
  return day - 1           // Mon=0, Tue=1, etc.
}
