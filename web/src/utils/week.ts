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

export function getToday(): string {
  return toLocalDateString(new Date())
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

// Literal calendar yesterday (today minus one day, weekends included) — distinct
// from getPreviousWorkday, which skips back to the prior weekday.
export function getYesterday(today: string = getToday()): string {
  const d = parseLocalDate(today)
  d.setDate(d.getDate() - 1)
  return toLocalDateString(d)
}

export function getPreviousWorkday(today: string = getToday()): string | null {
  const d = parseLocalDate(today)
  const dow = d.getDay()
  if (dow === 0 || dow === 1 || dow === 6) return null // Sun, Mon, Sat — no lookback
  d.setDate(d.getDate() - 1)
  return toLocalDateString(d)
}

export function getRecentWeekStarts(count: number): string[] {
  const result: string[] = []
  const monday = parseLocalDate(getWeekStart())
  for (let i = 0; i < count; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    result.push(toLocalDateString(d))
  }
  return result
}

const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

// Weekday code (MON..FRI, plus SUN/SAT for weekend dates) for a yyyy-MM-dd string.
// Used for the ghost breadcrumb "→ DEST" destination label.
export function getDayLabel(date: string): string {
  return WEEKDAY_CODES[parseLocalDate(date).getDay()]!
}

export function getCarriedDays(originalDate: string, date: string): number {
  const orig = parseLocalDate(originalDate)
  const due = parseLocalDate(date)
  const ms = due.getTime() - orig.getTime()
  return Math.round(ms / 86_400_000)
}

// A carried task passes "through" a column when the column's date falls on or
// after its original day but strictly before its current due day. It renders as
// a live row only on its due day, so the due day is never also a ghost.
export function isCarriedThrough(originalDate: string, date: string, columnDate: string): boolean {
  return originalDate <= columnDate && columnDate < date
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatWeekRange(weekStart: string): string {
  const monday = parseLocalDate(weekStart)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const mondayLabel = `${SHORT_MONTHS[monday.getMonth()]} ${monday.getDate()}`
  const fridayLabel = monday.getMonth() === friday.getMonth()
    ? String(friday.getDate())
    : `${SHORT_MONTHS[friday.getMonth()]} ${friday.getDate()}`
  return `${mondayLabel} \u2013 ${fridayLabel}`
}
