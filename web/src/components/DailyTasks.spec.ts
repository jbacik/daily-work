import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import DailyTasks from './DailyTasks.vue'
import type { WorkItem } from '@/types'

const WEEK_START = '2026-04-06' // Mon
const DATE_MAP: Record<number, string> = {
  0: '2026-04-06', // MON
  1: '2026-04-07', // TUE
  2: '2026-04-08', // WED (today)
  3: '2026-04-09', // THU
  4: '2026-04-10', // FRI
}

// --- module mocks ---

vi.mock('@/utils/week', () => ({
  DAYS: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  getWeekStart: () => WEEK_START,
  getCurrentDayIndex: () => 2,
  getDateForDayIndex: (dayIndex: number) => DATE_MAP[dayIndex] ?? '',
  getCarriedDays: (originalDate: string, date: string) =>
    Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${originalDate}T00:00:00`).getTime()) / 86_400_000),
  getDayLabel: (date: string) =>
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(`${date}T00:00:00`).getDay()],
  isCarriedThrough: (originalDate: string, date: string, columnDate: string) =>
    originalDate <= columnDate && columnDate < date,
}))

const mockItems = ref<WorkItem[]>([])
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()

vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    items: mockItems,
    weekOf: WEEK_START,
    currentDay: 2,
    getTasksForDay: (day: number) => {
      const date = DATE_MAP[day]
      return mockItems.value
        .filter(t => t.category === 'SmallThing' && t.date === date)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },
    getGhostTasksForDay: (day: number) => {
      const columnDate = DATE_MAP[day]
      return mockItems.value
        .filter(t => t.category === 'SmallThing'
          && t.date !== t.originalDate
          && t.originalDate <= columnDate && columnDate < t.date)
        .sort((a, b) => a.date.localeCompare(b.date))
    },
    fetch: vi.fn(),
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  }),
}))

// --- helpers ---

let nextId = 1

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: nextId++,
  title: 'Test task',
  category: 'SmallThing',
  isDone: false,
  sortOrder: 0,
  date: DATE_MAP[2]!,
  weekOf: WEEK_START,
  originalDate: DATE_MAP[2]!,
  timesMoved: 0,
  isSkipped: false,
  ...overrides,
})

describe('DailyTasks', () => {
  beforeEach(() => {
    nextId = 1
    mockItems.value = []
    mockCreate.mockReset()
    mockUpdate.mockReset()
    mockRemove.mockReset()
  })

  it('DailyTasks_RendersFiveDayColumns', () => {
    const wrapper = mount(DailyTasks)

    const text = wrapper.text()
    expect(text).toContain('MON')
    expect(text).toContain('TUE')
    expect(text).toContain('WED')
    expect(text).toContain('THU')
    expect(text).toContain('FRI')
  })

  it('DailyTasks_ShowsCarryBadge_WhenTaskIsCarried', async () => {
    const wrapper = mount(DailyTasks)
    // orig Mon, due Wed → 2 days
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Carried', originalDate: DATE_MAP[0], date: DATE_MAP[2] }),
    ]
    await nextTick()

    const badges = wrapper.findAll('[data-testid="carry-badge"]')
    expect(badges).toHaveLength(1)
    expect(badges[0]!.text()).toContain('2d')
    expect(badges[0]!.attributes('title')).toBe('carried 2 days')
  })

  it('DailyTasks_HidesCarryBadge_WhenTaskNotCarried', async () => {
    const wrapper = mount(DailyTasks)
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Fresh', originalDate: DATE_MAP[2], date: DATE_MAP[2] }),
    ]
    await nextTick()

    expect(wrapper.findAll('[data-testid="carry-badge"]')).toHaveLength(0)
  })

  it('DailyTasks_RendersGhostBreadcrumb_OnEachPassThroughDay', async () => {
    const wrapper = mount(DailyTasks)
    // orig Mon, due Wed → ghosts on Mon and Tue, live (badge) on Wed
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Passing', originalDate: DATE_MAP[0], date: DATE_MAP[2] }),
    ]
    await nextTick()

    const ghostRows = wrapper.findAll('[data-testid="ghost-row"]')
    expect(ghostRows).toHaveLength(2)
    ghostRows.forEach(row => {
      expect(row.text()).toContain('Passing')
      expect(row.text()).toContain('WED') // destination
    })
    // Live row + badge appears exactly once (on Wed)
    expect(wrapper.findAll('[data-testid="carry-badge"]')).toHaveLength(1)
  })

  it('DailyTasks_GhostSection_HasNoInteractiveControls', async () => {
    const wrapper = mount(DailyTasks)
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Passing', originalDate: DATE_MAP[1], date: DATE_MAP[2] }),
    ]
    await nextTick()

    const ghostSection = wrapper.get('[data-testid="ghost-section"]')
    expect(ghostSection.find('button').exists()).toBe(false)
    expect(ghostSection.find('input').exists()).toBe(false)
    expect(ghostSection.find('[data-testid="carry-badge"]').exists()).toBe(false)
  })

  it('DailyTasks_NoGhostSection_WhenNothingPassesThrough', async () => {
    const wrapper = mount(DailyTasks)
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Fresh', originalDate: DATE_MAP[2], date: DATE_MAP[2] }),
    ]
    await nextTick()

    expect(wrapper.findAll('[data-testid="ghost-section"]')).toHaveLength(0)
  })
})
