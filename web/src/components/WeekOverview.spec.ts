import { mount, enableAutoUnmount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { WorkItem } from '@/types'

enableAutoUnmount(afterEach)

const WEEK_START = '2026-04-06'

// Map day index → date for the current week (Mon..Fri).
const DATE_MAP: Record<number, string> = {
  0: '2026-04-06',
  1: '2026-04-07',
  2: '2026-04-08',
  3: '2026-04-09',
  4: '2026-04-10',
}

vi.mock('@/utils/week', () => ({
  DAYS: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  getDateForDayIndex: (dayIndex: number) => DATE_MAP[dayIndex] ?? '',
}))

// dailyTasks store mock — WeekOverview reads currentDay, weekOf, getTasksForDay
const mockItems = ref<WorkItem[]>([])
vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    weekOf: WEEK_START,
    currentDay: 2,
    getTasksForDay: () => [],
  }),
}))

// workSession store mock — drives the reflection footers
const mockHasReflection = vi.fn(() => false)
const mockFetchWeekSessions = vi.fn()
const mockFetchSession = vi.fn()
vi.mock('@/stores/workSession', () => ({
  useWorkSessionStore: () => ({
    sessionsByDate: {},
    hasReflection: mockHasReflection,
    fetchWeekSessions: mockFetchWeekSessions,
    fetchSession: mockFetchSession,
    saveReflectionsForDate: vi.fn(),
  }),
}))

import WeekOverview from './WeekOverview.vue'

beforeEach(() => {
  mockItems.value = []
  mockHasReflection.mockReturnValue(false)
  mockFetchWeekSessions.mockReset()
  mockFetchSession.mockReset()
  document.body.innerHTML = ''
})

describe('WeekOverview', () => {
  it('WeekOverview_FetchesWeekSessions_WhenMounted', () => {
    mount(WeekOverview)

    expect(mockFetchWeekSessions).toHaveBeenCalledWith(WEEK_START)
  })

  it('WeekOverview_ShowsReflectionFooter_WhenSessionHasReflections', () => {
    mockHasReflection.mockReturnValue(true)

    const wrapper = mount(WeekOverview)

    expect(wrapper.findAll('[data-testid="reflection-footer"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="reflection-footer-empty"]')).toHaveLength(0)
  })

  it('WeekOverview_ShowsNoEntry_WhenDateHasNoSession', () => {
    mockHasReflection.mockReturnValue(false)

    const wrapper = mount(WeekOverview)

    expect(wrapper.findAll('[data-testid="reflection-footer-empty"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="reflection-footer"]')).toHaveLength(0)
  })

  it('WeekOverview_RendersFooterOnAllFiveDays_WhenMixedData', () => {
    // Only Wednesday (index 2 → 2026-04-08) has a reflection
    mockHasReflection.mockImplementation((date: string) => date === '2026-04-08')

    const wrapper = mount(WeekOverview)

    // Every card still renders exactly one footer row (equal height)
    const footers = wrapper.findAll('[data-testid="reflection-footer"]')
    const empties = wrapper.findAll('[data-testid="reflection-footer-empty"]')
    expect(footers).toHaveLength(1)
    expect(empties).toHaveLength(4)
  })

  it('WeekOverview_ShowsReflectionLegendItem_WhenRendered', () => {
    const wrapper = mount(WeekOverview)

    expect(wrapper.text()).toContain('reflection saved')
  })

  it('WeekOverview_OpensViewModal_WhenReflectionFooterClicked', async () => {
    mockHasReflection.mockReturnValue(true)
    const wrapper = mount(WeekOverview)

    await wrapper.findAll('[data-testid="reflection-footer"]')[0]!.trigger('click')
    await nextTick()

    expect(document.body.querySelector('[data-testid="reflection-modal-overlay"]')).not.toBeNull()
    // View mode — no save action
    expect(document.body.querySelector('[data-testid="cmd-save"]')).toBeNull()
  })
})
