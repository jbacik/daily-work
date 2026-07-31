import { formatTimeAgo } from './time'

const now = new Date('2026-07-31T14:00:00Z')

describe('formatTimeAgo', () => {
  it('formatTimeAgo_ReturnsNull_WhenIsoIsNull', () => {
    expect(formatTimeAgo(null, now)).toBeNull()
  })

  it('formatTimeAgo_ReturnsJustNow_WhenUnderAMinute', () => {
    expect(formatTimeAgo('2026-07-31T13:59:30Z', now)).toBe('just now')
  })

  it('formatTimeAgo_ReturnsMinutes_WhenUnderAnHour', () => {
    expect(formatTimeAgo('2026-07-31T13:15:00Z', now)).toBe('45m ago')
  })

  it('formatTimeAgo_ReturnsHours_WhenUnderADay', () => {
    expect(formatTimeAgo('2026-07-31T12:00:00Z', now)).toBe('2h ago')
  })

  it('formatTimeAgo_ReturnsDays_WhenOverADay', () => {
    expect(formatTimeAgo('2026-07-28T14:00:00Z', now)).toBe('3d ago')
  })

  it('formatTimeAgo_ReturnsNull_WhenIsoIsUnparseable', () => {
    expect(formatTimeAgo('not-a-date', now)).toBeNull()
  })
})
