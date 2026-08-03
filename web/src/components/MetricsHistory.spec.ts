import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Mock } from 'vitest'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from '@/api/client'
import MetricsHistory from './MetricsHistory.vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import { getWeekStart, formatWeekRange } from '@/utils/week'
import type { WorkMetricEntry, WorkMetricWeekSummary } from '@/types'

const mockGet = (client as any).get as Mock

const weekOf = getWeekStart()

const createEntry = (overrides: Partial<WorkMetricEntry> = {}): WorkMetricEntry => ({
  id: 1,
  weekOf: '2026-07-20',
  title: 'Bugs completed this week',
  value: '3 — VP-1170',
  definitionId: 1,
  source: 'Agent',
  createdAt: '2026-07-20T00:00:00Z',
  updatedAt: '2026-07-24T00:00:00Z',
  ...overrides,
})

async function mountWithWeeks(weeks: WorkMetricWeekSummary[]) {
  mockGet
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(weeks)
  const store = useWorkMetricsStore()
  await store.fetchAll()
  const wrapper = mount(MetricsHistory)
  await nextTick()
  return { wrapper, store }
}

describe('MetricsHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('MetricsHistory_ExcludesCurrentWeek_WhenWeeksIncludeIt', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithWeeks([
      { weekOf, entryCount: 3, filledCount: 1 },
      { weekOf: '2026-07-20', entryCount: 3, filledCount: 3 },
    ])

    // Assert
    const rows = wrapper.findAll('[data-testid="metrics-history-week"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain(formatWeekRange('2026-07-20'))
  })

  it('MetricsHistory_ShowsFilledCount_WhenWeekHasEntries', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithWeeks([{ weekOf: '2026-07-20', entryCount: 4, filledCount: 2 }])

    // Assert
    expect(wrapper.get('[data-testid="metrics-history-toggle"]').text()).toContain('2/4 filled')
  })

  it('MetricsHistory_ShowsEmptyState_WhenNoPriorWeeks', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithWeeks([{ weekOf, entryCount: 1, filledCount: 0 }])

    // Assert
    expect(wrapper.get('[data-testid="metrics-history-empty"]').text()).toContain('<no prior weeks>')
  })

  it('MetricsHistory_LoadsEntries_WhenWeekExpanded', async () => {
    // Arrange
    const { wrapper } = await mountWithWeeks([{ weekOf: '2026-07-20', entryCount: 2, filledCount: 1 }])
    mockGet.mockResolvedValueOnce([
      createEntry({ id: 1 }),
      createEntry({ id: 2, title: 'AI win / experiment', value: null }),
    ])

    // Act
    await wrapper.get('[data-testid="metrics-history-toggle"]').trigger('click')
    await nextTick()

    // Assert
    expect(mockGet).toHaveBeenCalledWith('/api/work-metrics/entries', { params: { weekOf: '2026-07-20' } })
    expect(wrapper.findAll('[data-testid="metrics-history-entry"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="metrics-history-body"]').text()).toContain('[readonly]')
    expect(wrapper.get('[data-testid="metrics-history-body"]').text()).toContain('<pending>')
  })

  it('MetricsHistory_RendersNoInputs_WhenWeekExpanded', async () => {
    // Arrange
    const { wrapper } = await mountWithWeeks([{ weekOf: '2026-07-20', entryCount: 1, filledCount: 1 }])
    mockGet.mockResolvedValueOnce([createEntry()])

    // Act
    await wrapper.get('[data-testid="metrics-history-toggle"]').trigger('click')
    await nextTick()

    // Assert
    const body = wrapper.get('[data-testid="metrics-history-body"]')
    expect(body.findAll('input')).toHaveLength(0)
    expect(body.findAll('textarea')).toHaveLength(0)
  })

  it('MetricsHistory_CollapsesWeek_WhenToggledTwice', async () => {
    // Arrange
    const { wrapper } = await mountWithWeeks([{ weekOf: '2026-07-20', entryCount: 1, filledCount: 1 }])
    mockGet.mockResolvedValueOnce([createEntry()])
    const toggle = wrapper.get('[data-testid="metrics-history-toggle"]')

    // Act
    await toggle.trigger('click')
    await nextTick()
    await toggle.trigger('click')
    await nextTick()

    // Assert
    expect(wrapper.find('[data-testid="metrics-history-body"]').exists()).toBe(false)
  })
})
