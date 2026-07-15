import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StandupTasksPanel from './StandupTasksPanel.vue'
import type { WorkItem } from '@/types'

const TODAY_DATE = '2026-04-08'

// Reactive store mock — shared across tests, reset in beforeEach
const mockItems = ref<WorkItem[]>([])

vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    items: mockItems,
    currentDay: 2,
    getTasksForDay: () =>
      mockItems.value
        .filter(t => t.category === 'SmallThing' && t.date === TODAY_DATE)
        .sort((a, b) => a.sortOrder - b.sortOrder),
  }),
}))

let nextId = 1

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: nextId++,
  title: 'Test task',
  category: 'SmallThing',
  isDone: false,
  sortOrder: 0,
  date: TODAY_DATE,
  weekOf: '2026-04-06',
  originalDate: TODAY_DATE,
  timesMoved: 0,
  isSkipped: false,
  ...overrides,
})

describe('StandupTasksPanel', () => {
  beforeEach(() => {
    mockItems.value = []
    nextId = 1
  })

  it('StandupTasksPanel_RendersOneThingEmphasis_WhenTasksExist', () => {
    // Arrange
    mockItems.value = [
      createWorkItem({ title: 'The one thing', sortOrder: 0 }),
      createWorkItem({ title: 'Second task', sortOrder: 1 }),
    ]

    // Act
    const wrapper = mount(StandupTasksPanel)

    // Assert
    const titles = wrapper.findAll('[data-testid="planning-task-title"]')
    expect(titles).toHaveLength(2)
    expect(titles[0]!.classes()).toContain('uppercase')
    expect(titles[0]!.classes()).toContain('text-accent')
    expect(titles[1]!.classes()).not.toContain('uppercase')
    expect(wrapper.findAll('[data-testid="one-thing-badge"]')).toHaveLength(1)
  })

  it('StandupTasksPanel_ShowsCarryBadge_WhenTaskCarried', () => {
    // Arrange — carried 2 days
    mockItems.value = [
      createWorkItem({ title: 'Carried task', originalDate: '2026-04-06', date: TODAY_DATE }),
    ]

    // Act
    const wrapper = mount(StandupTasksPanel)

    // Assert
    const badge = wrapper.get('[data-testid="carry-badge"]')
    expect(badge.text()).toContain('2d')
  })

  it('StandupTasksPanel_ShowsStrikethrough_WhenTaskDone', () => {
    // Arrange
    mockItems.value = [
      createWorkItem({ title: 'First', sortOrder: 0 }),
      createWorkItem({ title: 'Done task', sortOrder: 1, isDone: true }),
    ]

    // Act
    const wrapper = mount(StandupTasksPanel)

    // Assert
    const titles = wrapper.findAll('[data-testid="planning-task-title"]')
    expect(titles[1]!.classes()).toContain('line-through')
  })

  it('StandupTasksPanel_ShowsPlaceholder_WhenNoTasks', () => {
    // Act
    const wrapper = mount(StandupTasksPanel)

    // Assert
    expect(wrapper.text()).toContain('<no tasks for today>')
    expect(wrapper.findAll('[data-testid="planning-task-row"]')).toHaveLength(0)
  })
})
