// Pure helpers for daily calendar forecast data. Times are wall-clock — any
// timezone suffix (" ET") is ignored, matching the forecast file contract.

// 4.5 -> "4h 30m", 4 -> "4h"
export function fmtHrs(h: number): string {
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  return mins ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${hours}h`
}

// "08:30 ET" -> minutes since midnight
export function parseClock(s: string): number | null {
  const m = String(s).match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10)
}

// "08:00-17:00 ET" -> { startMin, endMin }, defaulting to 8am-5pm
export function parseWindow(w: string): { startMin: number; endMin: number } {
  const parts = String(w).split('-')
  return {
    startMin: parseClock(parts[0] ?? '') ?? 480,
    endMin: parseClock(parts[1] ?? '') ?? 1020,
  }
}
