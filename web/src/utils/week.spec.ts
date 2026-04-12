import { DAYS, getToday, getWeekStart, getCurrentDayIndex, getDateForDayIndex, getRecentWeekStarts, formatWeekRange } from './week'

describe('week utils', () => {
  describe('DAYS', () => {
    it('DAYS_ContainsFiveWorkdayAbbreviations_InOrder', () => {
      expect(DAYS).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI'])
    })
  })

  describe('getToday', () => {
    it('getToday_ReturnsLocalDate_WhenCalledAtNoonUTC', () => {
      vi.setSystemTime(new Date('2026-04-06T12:00:00Z'))

      expect(getToday()).toBe('2026-04-06')
    })

    it('getToday_ReturnsLocalDate_WhenLateEvening', () => {
      vi.setSystemTime(new Date('2026-04-07T03:00:00Z')) // Monday 11 PM EDT

      expect(getToday()).toBe('2026-04-06')
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

  describe('getRecentWeekStarts', () => {
    it('getRecentWeekStarts_ReturnsFiveMondaysInDescendingOrder_WhenCountIsFive', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z')) // Wednesday

      expect(getRecentWeekStarts(5)).toEqual([
        '2026-04-06',
        '2026-03-30',
        '2026-03-23',
        '2026-03-16',
        '2026-03-09',
      ])
    })

    it('getRecentWeekStarts_ReturnsOnlyCurrentWeek_WhenCountIsOne', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))

      expect(getRecentWeekStarts(1)).toEqual(['2026-04-06'])
    })

    it('getRecentWeekStarts_ReturnsEmptyArray_WhenCountIsZero', () => {
      vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))

      expect(getRecentWeekStarts(0)).toEqual([])
    })

    it('getRecentWeekStarts_CrossesMonthBoundary_WhenWeekSpansMonths', () => {
      vi.setSystemTime(new Date('2026-05-06T12:00:00Z')) // Wed in week of May 4

      expect(getRecentWeekStarts(3)).toEqual([
        '2026-05-04',
        '2026-04-27',
        '2026-04-20',
      ])
    })
  })

  describe('formatWeekRange', () => {
    it('formatWeekRange_ReturnsAbbreviatedMonthWithDayOnly_WhenMondayAndFridayShareMonth', () => {
      expect(formatWeekRange('2026-04-06')).toBe('Apr 6 \u2013 10')
    })

    it('formatWeekRange_ReturnsBothMonths_WhenFridayFallsInNextMonth', () => {
      expect(formatWeekRange('2026-04-27')).toBe('Apr 27 \u2013 May 1')
    })

    it('formatWeekRange_HandlesYearEndWeek_WhenFridayIsInJanuary', () => {
      expect(formatWeekRange('2026-12-28')).toBe('Dec 28 \u2013 Jan 1')
    })

    it('formatWeekRange_HandlesSingleDigitDays_WhenEarlyInMonth', () => {
      expect(formatWeekRange('2026-03-02')).toBe('Mar 2 \u2013 6')
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })
})
