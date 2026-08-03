import { setActivePinia, createPinia } from 'pinia'
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
import { useWorkMetricsStore } from './workMetrics'
import { getWeekStart } from '@/utils/week'
import type { WorkMetricDefinition, WorkMetricEntry } from '@/types'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock
const mockPut = (client as any).put as Mock
const mockDelete = (client as any).delete as Mock

const weekOf = getWeekStart()

const createEntry = (overrides: Partial<WorkMetricEntry> = {}): WorkMetricEntry => ({
  id: 1,
  weekOf,
  title: 'Bugs completed this week',
  value: null,
  definitionId: 1,
  source: 'App',
  createdAt: '2026-07-27T00:00:00Z',
  updatedAt: null,
  ...overrides,
})

const createDefinition = (overrides: Partial<WorkMetricDefinition> = {}): WorkMetricDefinition => ({
  id: 1,
  title: 'Bugs completed this week',
  isActive: true,
  sortOrder: 1,
  createdAt: '2026-07-27T00:00:00Z',
  ...overrides,
})

function mockFetchAll(options: {
  definitions?: WorkMetricDefinition[]
  entries?: WorkMetricEntry[]
  weeks?: unknown[]
} = {}) {
  mockGet
    .mockResolvedValueOnce(options.definitions ?? [])
    .mockResolvedValueOnce(options.entries ?? [])
    .mockResolvedValueOnce(options.weeks ?? [])
}

describe('useWorkMetricsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchAll_PopulatesState_WhenApiReturnsData', async () => {
    // Arrange
    mockFetchAll({
      definitions: [createDefinition()],
      entries: [createEntry()],
      weeks: [{ weekOf, entryCount: 1, filledCount: 0 }],
    })
    const store = useWorkMetricsStore()

    // Act
    await store.fetchAll()

    // Assert
    expect(mockGet).toHaveBeenCalledWith('/api/work-metrics/definitions/all')
    expect(mockGet).toHaveBeenCalledWith('/api/work-metrics/entries', { params: { weekOf } })
    expect(mockGet).toHaveBeenCalledWith('/api/work-metrics/weeks')
    expect(store.definitions).toHaveLength(1)
    expect(store.entries).toHaveLength(1)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchAll_SetsError_WhenRequestFails', async () => {
    // Arrange
    mockGet.mockRejectedValue({ response: { data: 'weekOf must be a Monday' } })
    const store = useWorkMetricsStore()

    // Act
    await store.fetchAll()

    // Assert
    expect(store.error).toBe('weekOf must be a Monday')
    expect(store.isLoading).toBe(false)
  })

  it('pastWeeks_ExcludesCurrentWeek_WhenWeeksIncludeIt', async () => {
    // Arrange
    mockFetchAll({
      weeks: [
        { weekOf, entryCount: 3, filledCount: 1 },
        { weekOf: '2026-07-20', entryCount: 3, filledCount: 3 },
      ],
    })
    const store = useWorkMetricsStore()

    // Act
    await store.fetchAll()

    // Assert
    expect(store.pastWeeks).toHaveLength(1)
    expect(store.pastWeeks[0]!.weekOf).toBe('2026-07-20')
  })

  it('saveEntryValue_PutsValueAndReplacesEntry_WhenEntryExists', async () => {
    // Arrange
    mockFetchAll({ entries: [createEntry({ id: 7 })] })
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPut.mockResolvedValue(createEntry({ id: 7, value: '5 bugs', source: 'App' }))

    // Act
    await store.saveEntryValue(7, '5 bugs')

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/entries/7', { value: '5 bugs' })
    expect(store.entries[0]!.value).toBe('5 bugs')
  })

  it('saveEntryValue_SendsEmptyString_WhenClearingToPending', async () => {
    // Arrange
    mockFetchAll({ entries: [createEntry({ id: 7, value: 'stale' })] })
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPut.mockResolvedValue(createEntry({ id: 7, value: null }))

    // Act
    await store.saveEntryValue(7, null)

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/entries/7', { value: '' })
    expect(store.entries[0]!.value).toBeNull()
  })

  it('addEntry_PostsAdHocEntry_AndAppendsIt', async () => {
    // Arrange
    mockFetchAll()
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPost.mockResolvedValue(createEntry({ id: 9, title: 'Pairing experiment', definitionId: null }))

    // Act
    await store.addEntry('Pairing experiment')

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/work-metrics/entries', {
      weekOf,
      title: 'Pairing experiment',
      value: null,
    })
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0]!.definitionId).toBeNull()
  })

  it('addEntry_SetsError_WhenTitleDuplicated', async () => {
    // Arrange
    mockFetchAll()
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPost.mockRejectedValue({ response: { data: { detail: 'An entry with that title already exists for this week.' } } })

    // Act
    await store.addEntry('Pairing experiment')

    // Assert
    expect(store.error).toBe('An entry with that title already exists for this week.')
    expect(store.entries).toHaveLength(0)
  })

  it('removeEntry_DeletesAndSplices_WhenEntryExists', async () => {
    // Arrange
    mockFetchAll({ entries: [createEntry({ id: 4 })] })
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockDelete.mockResolvedValue(undefined)

    // Act
    await store.removeEntry(4)

    // Assert
    expect(mockDelete).toHaveBeenCalledWith('/api/work-metrics/entries/4')
    expect(store.entries).toHaveLength(0)
  })

  it('removeDefinition_OrphansLinkedEntries_WhenDefinitionDeleted', async () => {
    // Arrange
    mockFetchAll({
      definitions: [createDefinition({ id: 3 })],
      entries: [createEntry({ id: 4, definitionId: 3 })],
    })
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockDelete.mockResolvedValue(undefined)

    // Act
    await store.removeDefinition(3)

    // Assert
    expect(store.definitions).toHaveLength(0)
    expect(store.entries[0]!.definitionId).toBeNull()
  })

  it('updateDefinition_ReplacesDefinition_WhenRetired', async () => {
    // Arrange
    mockFetchAll({ definitions: [createDefinition({ id: 3 })] })
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPut.mockResolvedValue(createDefinition({ id: 3, isActive: false }))

    // Act
    await store.updateDefinition(3, { isActive: false })

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/definitions/3', { isActive: false })
    expect(store.definitions[0]!.isActive).toBe(false)
  })

  it('addDefinition_RefetchesEntries_WhenDefinitionCreated', async () => {
    // Arrange
    mockFetchAll()
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockPost.mockResolvedValue(createDefinition({ id: 5, title: 'Standup themes' }))
    mockGet.mockResolvedValueOnce([createEntry({ id: 6, title: 'Standup themes', definitionId: 5 })])

    // Act
    await store.addDefinition('Standup themes')

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/work-metrics/definitions', { title: 'Standup themes' })
    expect(store.definitions).toHaveLength(1)
    expect(store.entries).toHaveLength(1)
  })

  it('loadWeekHistory_CachesEntries_WhenCalledTwice', async () => {
    // Arrange
    mockFetchAll()
    const store = useWorkMetricsStore()
    await store.fetchAll()
    mockGet.mockResolvedValueOnce([createEntry({ id: 2, weekOf: '2026-07-20' })])

    // Act
    await store.loadWeekHistory('2026-07-20')
    await store.loadWeekHistory('2026-07-20')

    // Assert
    expect(store.historyEntries['2026-07-20']).toHaveLength(1)
    expect(mockGet).toHaveBeenCalledTimes(4)
  })
})
