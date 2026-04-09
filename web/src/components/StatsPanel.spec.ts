import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import StatsPanel from './StatsPanel.vue'
import type { WorkItem, ReadWatchItem } from '@/types'

const mockWorkItems = ref<WorkItem[]>([])
const mockReadWatchActive = ref<ReadWatchItem[]>([])
const mockReadWatchCompleted = ref<ReadWatchItem[]>([])

vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    get items() { return mockWorkItems.value },
  }),
}))

vi.mock('@/stores/readWatch', () => ({
  useReadWatchStore: () => ({
    get activeItems() { return mockReadWatchActive.value },
    get completedItems() { return mockReadWatchCompleted.value },
  }),
}))

let nextId = 1

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: nextId++,
  title: 'Task',
  category: 'SmallThing',
  isDone: false,
  sortOrder: 0,
  date: '2026-04-08',
  weekOf: '2026-04-06',
  ...overrides,
})

describe('StatsPanel', () => {
  beforeEach(() => {
    nextId = 1
    mockWorkItems.value = []
    mockReadWatchActive.value = []
    mockReadWatchCompleted.value = []
  })

  it('StatsPanel_ShowsSeparateBigAndSmallStats_WhenBothPresent', async () => {
    mockWorkItems.value = [
      createWorkItem({ category: 'BigThing', isDone: true }),
      createWorkItem({ category: 'SmallThing', isDone: true }),
      createWorkItem({ category: 'SmallThing', isDone: false }),
      createWorkItem({ category: 'SmallThing', isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="big-summary"]').text()).toBe('1/1')
    expect(wrapper.get('[data-testid="small-summary"]').text()).toBe('1/3')
  })

  it('StatsPanel_ShowsZeroBigStats_WhenNoBigThing', async () => {
    mockWorkItems.value = [
      createWorkItem({ category: 'SmallThing', isDone: true }),
      createWorkItem({ category: 'SmallThing', isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="big-summary"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="small-summary"]').text()).toBe('1/2')
  })

  it('StatsPanel_ExcludesBigThingFromSmallCompletionRate_WhenMixedItems', async () => {
    // 1 BigThing done + 1 SmallThing not done = small rate must be 0%, not 50%
    mockWorkItems.value = [
      createWorkItem({ category: 'BigThing', isDone: true }),
      createWorkItem({ category: 'SmallThing', isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="completion-rate"]').text()).toBe('0%')
  })

  it('StatsPanel_ShowsZeroSmallStats_WhenOnlyBigThingExists', async () => {
    mockWorkItems.value = [createWorkItem({ category: 'BigThing', isDone: false })]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="big-summary"]').text()).toBe('0/1')
    expect(wrapper.get('[data-testid="small-summary"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="completion-rate"]').text()).toBe('—')
  })

  it('StatsPanel_HighlightsBigSummary_WhenAllBigThingsComplete', async () => {
    mockWorkItems.value = [createWorkItem({ category: 'BigThing', isDone: true })]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="big-summary"]').classes()).toContain('text-primary')
  })

  it('StatsPanel_DoesNotHighlightBigSummary_WhenIncomplete', async () => {
    mockWorkItems.value = [
      createWorkItem({ category: 'BigThing', isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="big-summary"]').classes()).not.toContain('text-primary')
  })
})
