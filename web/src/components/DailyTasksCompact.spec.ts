import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue'
import DailyTasksCompact from './DailyTasksCompact.vue'
import type { WorkItem } from '@/types'

const WEEK_START = '2026-04-06'
const YESTERDAY_DATE = '2026-04-07' // day 1 (Tue) — currentDay=2 → yesterday=1
const TODAY_DATE = '2026-04-08'     // day 2 (Wed)
const TOMORROW_DATE = '2026-04-09'  // day 3 (Thu)

const DATE_MAP: Record<number, string> = {
  1: YESTERDAY_DATE,
  2: TODAY_DATE,
  3: TOMORROW_DATE,
}

// --- module mocks ---

vi.mock('@/utils/week', () => ({
  DAYS: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  getWeekStart: () => WEEK_START,
  getCurrentDayIndex: () => 2,
  getDateForDayIndex: (dayIndex: number) => DATE_MAP[dayIndex] ?? '',
}))

// Make debounce immediate so auto-save fires synchronously in tests
vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: (...args: any[]) => any) => fn,
}))

// Reactive store mock — shared across tests, reset in beforeEach
const mockItems = ref<WorkItem[]>([])
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()
const mockMoveUp = vi.fn()
const mockMoveDown = vi.fn()

vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    items: mockItems,
    weekOf: WEEK_START,
    currentDay: 2, // plain number — Pinia auto-unwraps computed refs; return raw value in mock
    getTasksForDay: (day: number) => {
      const date = DATE_MAP[day]
      return mockItems.value
        .filter(t => t.category === 'SmallThing' && t.date === date)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },
    fetch: vi.fn(),
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    moveUp: mockMoveUp,
    moveDown: mockMoveDown,
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
  date: TODAY_DATE,
  weekOf: WEEK_START,
  ...overrides,
})

function mountComponent() {
  return mount(DailyTasksCompact)
}

// --- tests ---

describe('DailyTasksCompact', () => {
  beforeEach(() => {
    nextId = 1
    mockItems.value = []
    mockCreate.mockReset()
    mockUpdate.mockReset()
    mockRemove.mockReset()
    mockMoveUp.mockReset()
    mockMoveDown.mockReset()
  })

  it('DailyTasksCompact_RendersAsymmetricGrid_WithTodayWider', () => {
    const wrapper = mountComponent()

    const grid = wrapper.find('[style]')
    expect(grid.attributes('style')).toContain('grid-template-columns: 1fr 2fr 1fr')
  })

  it('DailyTasksCompact_TodayColumn_HasPrimaryBorderStyling', () => {
    const wrapper = mountComponent()

    const columns = wrapper.findAll('.border')
    const todayCol = columns.find(c => c.classes().includes('border-primary'))
    expect(todayCol).toBeDefined()
  })

  it('DailyTasksCompact_RendersColumnLabels_InOrder', () => {
    const wrapper = mountComponent()

    const text = wrapper.text()
    expect(text).toContain('YESTERDAY')
    expect(text).toContain('TODAY')
    expect(text).toContain('TOMORROW')
  })

  it('DailyTasksCompact_RendersTasksWithToggleButtons', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ date: TODAY_DATE, title: 'My task' })]
    await nextTick()

    expect(wrapper.find('[data-testid="task-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="task-title"]').text()).toContain('My task')
  })

  it('DailyTasksCompact_ToggleButton_ShowsDoneState', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ date: TODAY_DATE, isDone: false }),
      createWorkItem({ date: TODAY_DATE, isDone: true }),
    ]
    await nextTick()

    const toggles = wrapper.findAll('[data-testid="task-toggle"]')
    expect(toggles[0]!.text()).toContain('[ ]')
    expect(toggles[1]!.text()).toContain('[x]')
  })

  it('DailyTasksCompact_4thAnd5thTasks_HaveMutedStyling', async () => {
    const wrapper = mountComponent()
    mockItems.value = Array.from({ length: 5 }, (_, i) =>
      createWorkItem({ id: i + 1, date: TODAY_DATE, title: `Task ${i + 1}` })
    )
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    expect(titles[0]!.classes().join(' ')).not.toContain('muted-foreground/60')
    expect(titles[1]!.classes().join(' ')).not.toContain('muted-foreground/60')
    expect(titles[2]!.classes().join(' ')).not.toContain('muted-foreground/60')
    expect(titles[3]!.classes().join(' ')).toContain('muted-foreground/60')
    expect(titles[4]!.classes().join(' ')).toContain('muted-foreground/60')
  })

  it('DailyTasksCompact_AddButton_HiddenWhenTodayHas5Tasks', async () => {
    const wrapper = mountComponent()
    mockItems.value = Array.from({ length: 5 }, (_, i) =>
      createWorkItem({ id: i + 1, date: TODAY_DATE })
    )
    await nextTick()

    // Yesterday and tomorrow still show + add; today column should not
    const addBtns = wrapper.findAll('[data-testid="add-task-btn"]')
    expect(addBtns).toHaveLength(2) // only yesterday and tomorrow
  })

  it('DailyTasksCompact_AddButton_ShowsAccentColor_WhenDayHas3to4Tasks', async () => {
    const wrapper = mountComponent()
    mockItems.value = Array.from({ length: 3 }, (_, i) =>
      createWorkItem({ id: i + 1, date: TODAY_DATE })
    )
    await nextTick()

    const addBtns = wrapper.findAll('[data-testid="add-task-btn"]')
    const todayAddBtn = addBtns.find(btn => btn.classes().includes('text-accent'))
    expect(todayAddBtn).toBeDefined()
  })

  it('DailyTasksCompact_ClickingTitle_EntersEditMode_ForTodayTask', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE, title: 'Edit me' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="task-title-input"]').exists()).toBe(true)
    expect((wrapper.find('[data-testid="task-title-input"]').element as HTMLInputElement).value).toBe('Edit me')
  })

  it('DailyTasksCompact_ClickingTitle_EntersEditMode_ForTomorrowTask', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TOMORROW_DATE, title: 'Tomorrow task' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="task-title-input"]').exists()).toBe(true)
  })

  it('DailyTasksCompact_ClickingTitle_DoesNotEditYesterdayTask', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: YESTERDAY_DATE, title: 'Past task' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="task-title-input"]').exists()).toBe(false)
  })

  it('DailyTasksCompact_EscapeKey_RevertsEdit', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE, title: 'Original' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    const input = wrapper.find('[data-testid="task-title-input"]')
    await input.setValue('Changed')
    await input.trigger('keydown', { key: 'Escape', code: 'Escape' })
    await nextTick()

    expect(wrapper.find('[data-testid="task-title-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-title"]').text()).toContain('Original')
  })

  it('DailyTasksCompact_EnterKey_CommitsEdit_AndCallsUpdate', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE, title: 'Original' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    const input = wrapper.find('[data-testid="task-title-input"]')
    await input.setValue('Updated title')
    await input.trigger('keydown', { key: 'Enter', code: 'Enter' })
    await nextTick()

    expect(mockUpdate).toHaveBeenCalledWith(1, { title: 'Updated title' })
    expect(wrapper.find('[data-testid="task-title-input"]').exists()).toBe(false)
  })

  it('DailyTasksCompact_Typing_AutoSavesViaDebounce', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE, title: 'Original' })]
    await nextTick()

    await wrapper.find('[data-testid="task-title"]').trigger('click')
    await nextTick()

    const input = wrapper.find('[data-testid="task-title-input"]')
    await input.setValue('Typed value')
    await input.trigger('input')
    await nextTick()

    // useDebounceFn is mocked as immediate, so update fires synchronously
    expect(mockUpdate).toHaveBeenCalledWith(1, { title: 'Typed value' })
  })

  it('DailyTasksCompact_ToggleTask_CallsUpdate', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE, isDone: false })]
    await nextTick()

    await wrapper.find('[data-testid="task-toggle"]').trigger('click')

    expect(mockUpdate).toHaveBeenCalledWith(1, { isDone: true })
  })

  it('DailyTasksCompact_DeleteTask_CallsRemove', async () => {
    const wrapper = mountComponent()
    mockItems.value = [createWorkItem({ id: 1, date: TODAY_DATE })]
    await nextTick()

    await wrapper.find('[data-testid="task-delete"]').trigger('click')

    expect(mockRemove).toHaveBeenCalledWith(1)
  })

  it('DailyTasksCompact_AddTask_CallsCreateWithDayIndex', async () => {
    const wrapper = mountComponent()
    await nextTick()

    // Columns are YESTERDAY(0), TODAY(1), TOMORROW(2) in the DOM
    // today's + add btn is the 2nd add button (index 1)
    const addBtns = wrapper.findAll('[data-testid="add-task-btn"]')
    await addBtns[1]!.trigger('click') // today
    await nextTick()

    const input = wrapper.find('[data-testid="add-task-input"]')
    await input.setValue('New task')
    await input.trigger('keydown', { key: 'Enter', code: 'Enter' })

    expect(mockCreate).toHaveBeenCalledWith('New task', 2)
  })

  it('DailyTasksCompact_RendersFirstTaskWithUppercaseClass_WhenMultipleTasks', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, title: 'mixed Case Top', sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, title: 'lower second', sortOrder: 1 }),
    ]
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    expect(titles[0]!.classes()).toContain('uppercase')
    expect(titles[0]!.classes()).toContain('text-accent')
    // Raw text preserved (CSS handles uppercase rendering)
    expect(titles[0]!.text()).toBe('mixed Case Top')
    expect(titles[1]!.classes()).not.toContain('uppercase')
  })

  it('DailyTasksCompact_DoesNotRenderUppercaseClass_WhenTaskDemoted', async () => {
    const wrapper = mountComponent()
    // The previously-top task is now sortOrder=1, so a different task is at index 0
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, title: 'New Top', sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, title: 'Demoted Mixed Case', sortOrder: 1 }),
    ]
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    const demoted = titles.find(t => t.text() === 'Demoted Mixed Case')
    expect(demoted).toBeDefined()
    expect(demoted!.classes()).not.toContain('uppercase')
    expect(demoted!.text()).toBe('Demoted Mixed Case')
  })

  it('DailyTasksCompact_DoesNotRenderUppercaseClass_WhenFirstTaskDone', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, title: 'Completed top', sortOrder: 0, isDone: true }),
      createWorkItem({ id: 2, date: TODAY_DATE, title: 'Second', sortOrder: 1 }),
    ]
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    expect(titles[0]!.classes()).not.toContain('uppercase')
  })

  it('DailyTasksCompact_CallsMoveUp_WhenUpArrowClicked', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, sortOrder: 1 }),
    ]
    await nextTick()

    const upButtons = wrapper.findAll('[data-testid="task-move-up"]')
    // Second task's up button (first is disabled)
    await upButtons[1]!.trigger('click')

    expect(mockMoveUp).toHaveBeenCalledWith(2)
  })

  it('DailyTasksCompact_CallsMoveDown_WhenDownArrowClicked', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, sortOrder: 1 }),
    ]
    await nextTick()

    const downButtons = wrapper.findAll('[data-testid="task-move-down"]')
    await downButtons[0]!.trigger('click')

    expect(mockMoveDown).toHaveBeenCalledWith(1)
  })

  it('DailyTasksCompact_DisablesUpArrow_WhenFirstTask', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, sortOrder: 1 }),
    ]
    await nextTick()

    const upButtons = wrapper.findAll('[data-testid="task-move-up"]')
    expect((upButtons[0]!.element as HTMLButtonElement).disabled).toBe(true)
    expect((upButtons[1]!.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('DailyTasksCompact_DisablesDownArrow_WhenLastTask', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, sortOrder: 0 }),
      createWorkItem({ id: 2, date: TODAY_DATE, sortOrder: 1 }),
    ]
    await nextTick()

    const downButtons = wrapper.findAll('[data-testid="task-move-down"]')
    expect((downButtons[0]!.element as HTMLButtonElement).disabled).toBe(false)
    expect((downButtons[1]!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('DailyTasksCompact_DoesNotRenderMoveButtons_ForYesterdayColumn', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: YESTERDAY_DATE, sortOrder: 0 }),
      createWorkItem({ id: 2, date: YESTERDAY_DATE, sortOrder: 1 }),
    ]
    await nextTick()

    expect(wrapper.findAll('[data-testid="task-move-up"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="task-move-down"]')).toHaveLength(0)
  })
})
