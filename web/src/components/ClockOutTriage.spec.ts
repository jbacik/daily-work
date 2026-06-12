import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Mock } from 'vitest'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/utils/week', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/week')>()
  return { ...actual, getToday: vi.fn(), getCurrentDayIndex: vi.fn() }
})

import client from '@/api/client'
import { getToday, getCurrentDayIndex } from '@/utils/week'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import ClockOutTriage from './ClockOutTriage.vue'
import type { WorkItem } from '@/types'

const mockGet = (client as any).get as Mock
const mockPatch = (client as any).patch as Mock
const mockGetToday = getToday as Mock
const mockGetCurrentDayIndex = getCurrentDayIndex as Mock

// Week of Mon 2026-04-06: Tue 04-07, Wed 04-08, Thu 04-09, Fri 04-10
const WEEK_OF = '2026-04-06'

const createMockItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 1,
  title: 'Default task',
  category: 'SmallThing',
  isDone: false,
  sortOrder: 1,
  date: '2026-04-07',
  weekOf: WEEK_OF,
  originalDate: '2026-04-07',
  timesMoved: 0,
  isSkipped: false,
  ...overrides,
})

async function seedStore(items: WorkItem[]) {
  const store = useDailyTasksStore()
  mockGet.mockResolvedValue(items)
  await store.fetch(WEEK_OF)
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // Default: Tuesday → forward days Wed/Thu/Fri (multi-option day picker)
  mockGetToday.mockReturnValue('2026-04-07')
  mockGetCurrentDayIndex.mockReturnValue(1)
})

describe('ClockOutTriage', () => {
  it('ClockOutTriage_ShowsEmptyState_WhenNoItems', async () => {
    await seedStore([])

    const wrapper = mount(ClockOutTriage, { props: { items: [] } })

    expect(wrapper.find('[data-testid="out-triage-empty"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="out-triage-empty"]').text()).toContain('wrapped')
    expect(wrapper.find('[data-testid="out-triage-list"]').exists()).toBe(false)
  })

  it('ClockOutTriage_RendersItemsWithActions_WhenItemsPresent', async () => {
    const item = createMockItem({ id: 3, title: 'Leftover' })
    await seedStore([item])

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    expect(wrapper.find('[data-testid="out-triage-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tomorrow-btn-3"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="day-btn-3"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="skip-btn-3"]').exists()).toBe(true)
  })

  it('ClockOutTriage_CallsMoveToTomorrow_WhenTomorrowClicked', async () => {
    const item = createMockItem({ id: 4 })
    await seedStore([item])
    mockPatch.mockResolvedValue({ ...item, date: '2026-04-08', timesMoved: 1 })

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="tomorrow-btn-4"]').trigger('click')
    await nextTick()

    // Tuesday → tomorrow = Wednesday 2026-04-08
    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/4/move', { date: '2026-04-08' })
  })

  it('ClockOutTriage_ExpandsDayPicker_WhenDayButtonClicked', async () => {
    const item = createMockItem({ id: 5 })
    await seedStore([item])

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    expect(wrapper.find('[data-testid="day-picker-5"]').exists()).toBe(false)

    await wrapper.get('[data-testid="day-btn-5"]').trigger('click')
    await nextTick()

    // Wed / Thu / Fri = three chips
    expect(wrapper.find('[data-testid="day-picker-5"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="day-chip-5-"]')).toHaveLength(3)
  })

  it('ClockOutTriage_MovesToChosenDay_WhenChipClicked', async () => {
    const item = createMockItem({ id: 6 })
    await seedStore([item])
    mockPatch.mockResolvedValue({ ...item, date: '2026-04-09', timesMoved: 1 })

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="day-btn-6"]').trigger('click')
    await nextTick()
    // Second chip = Thursday 2026-04-09
    await wrapper.get('[data-testid="day-chip-6-1"]').trigger('click')
    await nextTick()

    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/6/move', { date: '2026-04-09' })
  })

  it('ClockOutTriage_DisablesFullDayChip_AndBoldsWeekCapacity', async () => {
    const leftover = createMockItem({ id: 7, date: '2026-04-07' })
    // Thursday (2026-04-09) is full with 5 SmallThings
    const thuItems = [1, 2, 3, 4, 5].map(n => createMockItem({ id: 100 + n, date: '2026-04-09' }))
    await seedStore([leftover, ...thuItems])

    const wrapper = mount(ClockOutTriage, { props: { items: [leftover] } })

    // Week capacity preview: Thu count (index 1 in Wed/Thu/Fri) should be present and == 5
    const cap = wrapper.get('[data-testid="week-cap-day-1"]')
    expect(cap.text()).toContain('5')

    await wrapper.get('[data-testid="day-btn-7"]').trigger('click')
    await nextTick()

    const thuChip = wrapper.get('[data-testid="day-chip-7-1"]')
    expect((thuChip.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('ClockOutTriage_CollapsesToSingleButton_WhenOneOptionRemains', async () => {
    mockGetToday.mockReturnValue('2026-04-09') // Thursday
    mockGetCurrentDayIndex.mockReturnValue(3)
    const item = createMockItem({ id: 8, date: '2026-04-09' })
    await seedStore([item])
    mockPatch.mockResolvedValue({ ...item, date: '2026-04-10', timesMoved: 1 })

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    // Only Friday remains → single direct button, no expandable picker
    const dayBtn = wrapper.get('[data-testid="day-btn-8"]')
    expect(dayBtn.text()).toContain('Fri')

    await dayBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="day-picker-8"]').exists()).toBe(false)
    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/8/move', { date: '2026-04-10' })
  })

  it('ClockOutTriage_CallsSkip_WhenSkipClicked', async () => {
    const item = createMockItem({ id: 9 })
    await seedStore([item])
    mockPatch.mockResolvedValue({ ...item, isSkipped: true })

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="skip-btn-9"]').trigger('click')
    await nextTick()

    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/9/skip')
  })

  it('ClockOutTriage_ShowsInlineError_WhenMoveReturns422', async () => {
    const item = createMockItem({ id: 10 })
    await seedStore([item])
    const error = Object.assign(new Error('422'), { response: { status: 422 } })
    mockPatch.mockRejectedValue(error)

    const wrapper = mount(ClockOutTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="tomorrow-btn-10"]').trigger('click')
    await Promise.resolve()
    await nextTick()
    await Promise.resolve()
    await nextTick()

    expect(wrapper.find('[data-testid="out-item-error-10"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="out-item-error-10"]').text()).toContain('Day is full')
  })
})
