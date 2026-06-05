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
  return { ...actual, getToday: vi.fn() }
})

import client from '@/api/client'
import { getToday } from '@/utils/week'
import ClockInTriage from './ClockInTriage.vue'
import type { WorkItem } from '@/types'

const mockPatch = (client as any).patch as Mock
const mockGetToday = getToday as Mock

const createMockItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 1,
  title: 'Default task',
  category: 'SmallThing',
  isDone: false,
  sortOrder: 1,
  date: '2026-04-09',
  weekOf: '2026-04-06',
  originalDate: '2026-04-09',
  timesMoved: 0,
  isSkipped: false,
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  // Default to Wednesday so isMonday is false
  mockGetToday.mockReturnValue('2026-04-08')
})

describe('ClockInTriage', () => {
  it('ClockInTriage_ShowsEmptyState_WhenNoItemsAndNotMonday', () => {
    const wrapper = mount(ClockInTriage, { props: { items: [] } })

    expect(wrapper.find('[data-testid="triage-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="monday-line"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="triage-list"]').exists()).toBe(false)
  })

  it('ClockInTriage_ShowsMondayLine_WhenMondayAndNoItems', () => {
    mockGetToday.mockReturnValue('2026-04-06') // Monday

    const wrapper = mount(ClockInTriage, { props: { items: [] } })

    expect(wrapper.find('[data-testid="monday-line"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="triage-empty"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="monday-line"]').text()).toContain('Case of the Mondays')
  })

  it('ClockInTriage_RendersTodayButtonsForEachItem_WhenItemsPresent', () => {
    const items = [
      createMockItem({ id: 1, title: 'Task one' }),
      createMockItem({ id: 2, title: 'Task two' }),
    ]

    const wrapper = mount(ClockInTriage, { props: { items } })

    expect(wrapper.find('[data-testid="triage-list"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="triage-item-"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="today-btn-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="later-btn-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ignore-btn-1"]').exists()).toBe(true)
  })

  it('ClockInTriage_RendersCapacityMeter_WithCorrectCount', () => {
    // Store has items for today; use mock
    const wrapper = mount(ClockInTriage, { props: { items: [] } })

    expect(wrapper.find('[data-testid="capacity-meter"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="capacity-meter"]').text()).toContain('/5')
  })

  it('ClockInTriage_CallsMoveToToday_WhenTodayButtonClicked', async () => {
    const item = createMockItem({ id: 3, title: 'Move today test' })
    mockPatch.mockResolvedValue({ ...item, date: '2026-04-08', timesMoved: 1 })

    const wrapper = mount(ClockInTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="today-btn-3"]').trigger('click')
    await nextTick()

    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/3/move', { date: '2026-04-08' })
  })

  it('ClockInTriage_CallsMoveToLater_WhenLaterButtonClicked', async () => {
    const item = createMockItem({ id: 4, title: 'Move later test' })
    // Wednesday → tomorrow = Thursday 2026-04-09
    mockPatch.mockResolvedValue({ ...item, date: '2026-04-09', timesMoved: 1 })

    const wrapper = mount(ClockInTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="later-btn-4"]').trigger('click')
    await nextTick()

    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/4/move', { date: '2026-04-09' })
  })

  it('ClockInTriage_CallsSkip_WhenIgnoreButtonClicked', async () => {
    const item = createMockItem({ id: 5, title: 'Skip test' })
    mockPatch.mockResolvedValue({ ...item, isSkipped: true })

    const wrapper = mount(ClockInTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="ignore-btn-5"]').trigger('click')
    await nextTick()

    expect(mockPatch).toHaveBeenCalledWith('/api/work-items/5/skip')
  })

  it('ClockInTriage_ShowsInlineError_WhenMoveReturns422', async () => {
    const item = createMockItem({ id: 6, title: 'Full day test' })
    const error = Object.assign(new Error('422'), { response: { status: 422 } })
    mockPatch.mockRejectedValue(error)

    const wrapper = mount(ClockInTriage, { props: { items: [item] } })

    await wrapper.get('[data-testid="today-btn-6"]').trigger('click')
    await Promise.resolve()
    await nextTick()
    await Promise.resolve()
    await nextTick()

    expect(wrapper.find('[data-testid="item-error-6"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="item-error-6"]').text()).toContain('Today is full')
  })
})
