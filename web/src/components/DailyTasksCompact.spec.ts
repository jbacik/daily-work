import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
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
  getCarriedDays: (originalDate: string, date: string) =>
    Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${originalDate}T00:00:00`).getTime()) / 86_400_000),
  getDayLabel: (date: string) =>
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(`${date}T00:00:00`).getDay()],
  isCarriedThrough: (originalDate: string, date: string, columnDate: string) =>
    originalDate <= columnDate && columnDate < date,
  getYesterday: () => YESTERDAY_DATE,
}))

// Work-session store mock — the yesterday spark reads hasReflection and opens
// the edit modal; reset return value per test.
const mockHasReflection = vi.fn(() => false)
const mockFetchSession = vi.fn()
const mockSaveReflectionsForDate = vi.fn()

vi.mock('@/stores/workSession', () => ({
  useWorkSessionStore: () => ({
    sessionsByDate: {},
    hasReflection: mockHasReflection,
    fetchSession: mockFetchSession,
    saveReflectionsForDate: mockSaveReflectionsForDate,
  }),
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
  originalDate: TODAY_DATE,
  timesMoved: 0,
  isSkipped: false,
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
    mockHasReflection.mockReturnValue(false)
    mockFetchSession.mockReset()
    mockSaveReflectionsForDate.mockReset()
    document.body.innerHTML = ''
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

  it('DailyTasksCompact_CompletedTasksAtPosition4And5_DisplayLineThrough', async () => {
    const wrapper = mountComponent()
    mockItems.value = Array.from({ length: 5 }, (_, i) =>
      createWorkItem({ id: i + 1, date: TODAY_DATE, title: `Task ${i + 1}`, isDone: true })
    )
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    // All 5 done tasks should have line-through regardless of their index
    for (let i = 0; i < 5; i++) {
      expect(titles[i]!.classes()).toContain('line-through')
    }
    // The bottom 2 should still have the muted/60 color
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

  it('DailyTasksCompact_RendersFirstTaskWithUppercaseClass_WhenDone', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, date: TODAY_DATE, title: 'Completed top', sortOrder: 0, isDone: true }),
      createWorkItem({ id: 2, date: TODAY_DATE, title: 'Second', sortOrder: 1 }),
    ]
    await nextTick()

    const titles = wrapper.findAll('[data-testid="task-title"]')
    expect(titles[0]!.classes()).toContain('uppercase')
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

  it('DailyTasksCompact_ShowsCarryBadge_WhenTaskIsCarried', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Carried task', originalDate: YESTERDAY_DATE, date: TODAY_DATE }),
    ]
    await nextTick()

    const badges = wrapper.findAll('[data-testid="carry-badge"]')
    expect(badges).toHaveLength(1)
    expect(badges[0]!.text()).toContain('1d')
    expect(badges[0]!.attributes('title')).toBe('carried 1 day')
  })

  it('DailyTasksCompact_HidesCarryBadge_WhenTaskNotCarried', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Fresh task', originalDate: TODAY_DATE, date: TODAY_DATE }),
    ]
    await nextTick()

    expect(wrapper.findAll('[data-testid="carry-badge"]')).toHaveLength(0)
  })

  it('DailyTasksCompact_CarryBadge_PluralizesDays', async () => {
    const wrapper = mountComponent()
    // orig Mon (2026-04-06), due Thu/tomorrow (2026-04-09) → 3 days
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Long carry', originalDate: WEEK_START, date: TOMORROW_DATE }),
    ]
    await nextTick()

    const badge = wrapper.get('[data-testid="carry-badge"]')
    expect(badge.text()).toContain('3d')
    expect(badge.attributes('title')).toBe('carried 3 days')
  })

  it('DailyTasksCompact_RendersGhostBreadcrumb_OnPassThroughDay', async () => {
    const wrapper = mountComponent()
    // Carried task due today; its trail passes through yesterday
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Passing task', originalDate: YESTERDAY_DATE, date: TODAY_DATE }),
    ]
    await nextTick()

    const ghostRows = wrapper.findAll('[data-testid="ghost-row"]')
    expect(ghostRows).toHaveLength(1)
    expect(ghostRows[0]!.text()).toContain('Passing task')
    // due date 2026-04-08 is a Wednesday
    expect(ghostRows[0]!.text()).toContain('WED')
  })

  it('DailyTasksCompact_GhostRow_HasNoInteractiveControls', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Passing task', originalDate: YESTERDAY_DATE, date: TODAY_DATE }),
    ]
    await nextTick()

    const ghostSection = wrapper.get('[data-testid="ghost-section"]')
    expect(ghostSection.find('[data-testid="task-toggle"]').exists()).toBe(false)
    expect(ghostSection.find('[data-testid="task-delete"]').exists()).toBe(false)
    expect(ghostSection.find('[data-testid="carry-badge"]').exists()).toBe(false)
  })

  it('DailyTasksCompact_CarriedTask_RendersLiveOnce_AndGhostElsewhere_NoDoubleRender', async () => {
    const wrapper = mountComponent()
    mockItems.value = [
      createWorkItem({ id: 1, title: 'Only once', originalDate: YESTERDAY_DATE, date: TODAY_DATE }),
    ]
    await nextTick()

    // One live row (with its badge), one ghost row on the pass-through column — never both on the same day
    expect(wrapper.findAll('[data-testid="carry-badge"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="ghost-row"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="task-title"]')).toHaveLength(1)
  })

  it('DailyTasksCompact_ShowsFilledSpark_WhenYesterdayHasReflection', () => {
    mockHasReflection.mockReturnValue(true)

    const wrapper = mountComponent()

    expect(wrapper.get('[data-testid="yesterday-spark"]').text()).toBe('✦')
  })

  it('DailyTasksCompact_ShowsOutlineSpark_WhenYesterdayHasNoReflection', () => {
    mockHasReflection.mockReturnValue(false)

    const wrapper = mountComponent()

    expect(wrapper.get('[data-testid="yesterday-spark"]').text()).toBe('✧')
  })

  it('DailyTasksCompact_FetchesYesterdaySession_WhenMounted', () => {
    mountComponent()

    expect(mockFetchSession).toHaveBeenCalledWith(YESTERDAY_DATE)
  })

  it('DailyTasksCompact_OpensEditModal_WhenSparkClicked', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="yesterday-spark"]').trigger('click')
    await nextTick()

    expect(document.body.querySelector('[data-testid="reflection-modal-overlay"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="cmd-save"]')).not.toBeNull()
  })
})
