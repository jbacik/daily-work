export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

export function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  now.setDate(diff)
  return toLocalDateString(now)
}

export function getCurrentDayIndex(): number {
  const day = new Date().getDay()
  if (day === 0) return -1 // Sunday
  if (day === 6) return 5  // Saturday
  return day - 1           // Mon=0, Tue=1, etc.
}

export function getDateForDayIndex(dayIndex: number, weekStart?: string): string {
  const monday = parseLocalDate(weekStart ?? getWeekStart())
  monday.setDate(monday.getDate() + dayIndex)
  return toLocalDateString(monday)
}
