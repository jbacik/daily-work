import { DAYS, getWeekStart, getCurrentDayIndex, getDateForDayIndex } from './week'

describe('week utils', () => {
  describe('DAYS', () => {
    it('DAYS_ContainsFiveWorkdayAbbreviations_InOrder', () => {
      expect(DAYS).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI'])
    })
  })

  describe('getWeekStart', () => {
    it('getWeekStart_ReturnsMonday_WhenCalledOnAWednesday', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z')) // Wednesday

      expect(getWeekStart()).toBe('2026-04-06')
    })

    it('getWeekStart_ReturnsMonday_WhenCalledOnAMonday', () => {
      vi.setSystemTime(new Date('2026-04-06T12:00:00Z')) // Monday

      expect(getWeekStart()).toBe('2026-04-06')
    })

    it('getWeekStart_ReturnsMonday_WhenCalledOnAFriday', () => {
      vi.setSystemTime(new Date('2026-04-10T12:00:00Z')) // Friday

      expect(getWeekStart()).toBe('2026-04-06')
    })

    it('getWeekStart_ReturnsPreviousMonday_WhenCalledOnASunday', () => {
      vi.setSystemTime(new Date('2026-04-12T12:00:00Z')) // Sunday

      expect(getWeekStart()).toBe('2026-04-06')
    })

    it('getWeekStart_ReturnsCurrentMonday_WhenCalledOnASaturday', () => {
      vi.setSystemTime(new Date('2026-04-11T12:00:00Z')) // Saturday

      expect(getWeekStart()).toBe('2026-04-06')
    })

    it('getWeekStart_ReturnsISODateString_InYYYYMMDDFormat', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))

      const result = getWeekStart()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('getWeekStart_ReturnsCorrectDate_WhenLateEvening', () => {
      vi.setSystemTime(new Date('2026-04-07T03:00:00Z')) // Monday 11 PM EDT (UTC-4)

      expect(getWeekStart()).toBe('2026-04-06')
    })
  })

  describe('getCurrentDayIndex', () => {
    it('getCurrentDayIndex_Returns0_OnMonday', () => {
      vi.setSystemTime(new Date('2026-04-06T12:00:00Z')) // Monday

      expect(getCurrentDayIndex()).toBe(0)
    })

    it('getCurrentDayIndex_Returns1_OnTuesday', () => {
      vi.setSystemTime(new Date('2026-04-07T12:00:00Z'))

      expect(getCurrentDayIndex()).toBe(1)
    })

    it('getCurrentDayIndex_Returns2_OnWednesday', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))

      expect(getCurrentDayIndex()).toBe(2)
    })

    it('getCurrentDayIndex_Returns3_OnThursday', () => {
      vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

      expect(getCurrentDayIndex()).toBe(3)
    })

    it('getCurrentDayIndex_Returns4_OnFriday', () => {
      vi.setSystemTime(new Date('2026-04-10T12:00:00Z'))

      expect(getCurrentDayIndex()).toBe(4)
    })

    it('getCurrentDayIndex_ReturnsMinus1_OnSunday', () => {
      vi.setSystemTime(new Date('2026-04-12T12:00:00Z')) // Sunday

      expect(getCurrentDayIndex()).toBe(-1)
    })

    it('getCurrentDayIndex_Returns5_OnSaturday', () => {
      vi.setSystemTime(new Date('2026-04-11T12:00:00Z')) // Saturday

      expect(getCurrentDayIndex()).toBe(5)
    })
  })

  describe('getDateForDayIndex', () => {
    it('getDateForDayIndex_ReturnsMonday_ForIndex0', () => {
      expect(getDateForDayIndex(0, '2026-04-06')).toBe('2026-04-06')
    })

    it('getDateForDayIndex_ReturnsTuesday_ForIndex1', () => {
      expect(getDateForDayIndex(1, '2026-04-06')).toBe('2026-04-07')
    })

    it('getDateForDayIndex_ReturnsFriday_ForIndex4', () => {
      expect(getDateForDayIndex(4, '2026-04-06')).toBe('2026-04-10')
    })

    it('getDateForDayIndex_UsesCurrentWeek_WhenNoWeekStartProvided', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z')) // Wednesday, week starts 2026-04-06

      expect(getDateForDayIndex(2)).toBe('2026-04-08')
    })

    it('getDateForDayIndex_WorksAcrossMonthBoundary', () => {
      expect(getDateForDayIndex(4, '2026-03-30')).toBe('2026-04-03')
    })

    it('getDateForDayIndex_ReturnsCorrectDate_WhenLateEvening', () => {
      vi.setSystemTime(new Date('2026-04-07T03:00:00Z')) // Monday 11 PM EDT

      expect(getDateForDayIndex(0)).toBe('2026-04-06')
      expect(getDateForDayIndex(4)).toBe('2026-04-10')
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })
})
