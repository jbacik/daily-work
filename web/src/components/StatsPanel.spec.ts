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

  it('StatsPanel_ShowsDash_WhenNoSmallItems', async () => {
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="one-thing-summary"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="smaller-things-summary"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="completion-rate"]').text()).toBe('—')
  })

  it('StatsPanel_ShowsOneThingSummary_WhenTopTasksExist', async () => {
    // 2 days, each with a top task; 1 done
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-07', sortOrder: 0, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="one-thing-summary"]').text()).toBe('1/2')
  })

  it('StatsPanel_ShowsSmallerThingsSummary_ExcludingTopTask', async () => {
    // 1 day: top done, 1 smaller done, 1 smaller not done
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 1, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 2, isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="one-thing-summary"]').text()).toBe('1/1')
    expect(wrapper.get('[data-testid="smaller-things-summary"]').text()).toBe('1/2')
  })

  it('StatsPanel_ExcludesSecondaryTasksFromOneThingCount', async () => {
    // Only the non-top task is done; One Thing count should not be inflated
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: false }),
      createWorkItem({ date: '2026-04-08', sortOrder: 1, isDone: true }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="one-thing-summary"]').text()).toBe('0/1')
  })

  it('StatsPanel_ExcludesTopTaskFromSmallerThingsCount', async () => {
    // Top task done; should not be counted in Smaller Things
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 1, isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="smaller-things-summary"]').text()).toBe('0/1')
  })

  it('StatsPanel_OneThingRate_ReflectsOnlyTopTasks', async () => {
    // 2 days: top done on day 1, not done on day 2 — rate is 50% regardless of smaller things
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-07', sortOrder: 0, isDone: true }),
      createWorkItem({ date: '2026-04-07', sortOrder: 1, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: false }),
      createWorkItem({ date: '2026-04-08', sortOrder: 1, isDone: true }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="completion-rate"]').text()).toBe('50%')
  })

  it('StatsPanel_ShowsDash_ForSmallerThings_WhenEachDayHasOnlyOneTask', async () => {
    mockWorkItems.value = [
      createWorkItem({ date: '2026-04-07', sortOrder: 0, isDone: true }),
      createWorkItem({ date: '2026-04-08', sortOrder: 0, isDone: false }),
    ]
    const wrapper = mount(StatsPanel)
    await nextTick()

    expect(wrapper.get('[data-testid="smaller-things-summary"]').text()).toBe('—')
  })
})
