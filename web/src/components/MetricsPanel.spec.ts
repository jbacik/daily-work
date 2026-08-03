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
import MetricsPanel from './MetricsPanel.vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import { getWeekStart } from '@/utils/week'
import type { WorkMetricEntry } from '@/types'

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

async function mountWithEntries(entries: WorkMetricEntry[]) {
  mockGet
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(entries)
    .mockResolvedValueOnce([])
  const store = useWorkMetricsStore()
  await store.fetchAll()
  const wrapper = mount(MetricsPanel)
  await nextTick()
  return { wrapper, store }
}

describe('MetricsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('MetricsPanel_RendersEntries_WhenStoreHasData', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([
      createEntry({ id: 1, value: '5 bugs' }),
      createEntry({ id: 2, title: 'PRs involved in this week', value: '7 PRs' }),
    ])

    // Assert
    expect(wrapper.findAll('[data-testid="metric-entry"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="metric-entry-title"]').text()).toContain('Bugs completed this week')
  })

  it('MetricsPanel_ShowsPending_WhenValueIsNull', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([createEntry({ value: null })])

    // Assert
    expect(wrapper.get('[data-testid="metric-entry-pending"]').text()).toBe('<pending>')
    expect(wrapper.find('[data-testid="metric-entry-value"]').exists()).toBe(false)
  })

  it('MetricsPanel_ShowsEmptyState_WhenNoEntries', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([])

    // Assert
    expect(wrapper.get('[data-testid="metrics-empty"]').text()).toContain('<no metrics this week>')
  })

  it('MetricsPanel_ShowsAgentMarker_WhenSourceIsAgent', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([
      createEntry({ value: '5 bugs', source: 'Agent', updatedAt: new Date().toISOString() }),
    ])

    // Assert
    expect(wrapper.get('[data-testid="metric-entry-agent"]').text()).toContain('[agent]')
  })

  it('MetricsPanel_HidesAgentMarker_WhenSourceIsApp', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([createEntry({ value: '5 bugs', source: 'App' })])

    // Assert
    expect(wrapper.find('[data-testid="metric-entry-agent"]').exists()).toBe(false)
  })

  it('MetricsPanel_SavesValueOnBlur_WhenEditing', async () => {
    // Arrange
    const { wrapper } = await mountWithEntries([createEntry({ id: 3, value: null })])
    mockPut.mockResolvedValue(createEntry({ id: 3, value: 'seven' }))

    // Act
    await wrapper.get('[data-testid="metric-entry-pending"]').trigger('click')
    await nextTick()
    const editor = wrapper.get('[data-testid="metric-entry-editor"]')
    await editor.setValue('seven')
    await editor.trigger('blur')
    await nextTick()

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/entries/3', { value: 'seven' })
  })

  it('MetricsPanel_DiscardsDraft_WhenEscapePressed', async () => {
    // Arrange
    const { wrapper } = await mountWithEntries([createEntry({ id: 3, value: 'original' })])

    // Act
    await wrapper.get('[data-testid="metric-entry-value"]').trigger('click')
    await nextTick()
    const editor = wrapper.get('[data-testid="metric-entry-editor"]')
    await editor.setValue('scrapped')
    await editor.trigger('keydown', { key: 'Escape' })
    await editor.trigger('blur')
    await nextTick()

    // Assert
    expect(mockPut).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="metric-entry-value"]').text()).toContain('original')
  })

  it('MetricsPanel_SavesValue_WhenCtrlEnterPressed', async () => {
    // Arrange
    const { wrapper } = await mountWithEntries([createEntry({ id: 3, value: null })])
    mockPut.mockResolvedValue(createEntry({ id: 3, value: 'line one\nline two' }))

    // Act
    await wrapper.get('[data-testid="metric-entry-pending"]').trigger('click')
    await nextTick()
    const editor = wrapper.get('[data-testid="metric-entry-editor"]')
    await editor.setValue('line one\nline two')
    await editor.trigger('keydown', { key: 'Enter', ctrlKey: true })
    await nextTick()

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/entries/3', { value: 'line one\nline two' })
  })

  it('MetricsPanel_ShowsDelete_WhenEntryIsAdHoc', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([createEntry({ definitionId: null })])

    // Assert
    expect(wrapper.find('[data-testid="metric-entry-delete"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="metric-entry-adhoc"]').text()).toContain('·adhoc')
  })

  it('MetricsPanel_HidesDelete_WhenEntryIsDefinitionBacked', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithEntries([createEntry({ definitionId: 1 })])

    // Assert
    expect(wrapper.find('[data-testid="metric-entry-delete"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="metric-entry-adhoc"]').exists()).toBe(false)
  })

  it('MetricsPanel_DeletesEntry_WhenAdHocDeleteClicked', async () => {
    // Arrange
    const { wrapper } = await mountWithEntries([createEntry({ id: 8, definitionId: null })])
    mockDelete.mockResolvedValue(undefined)

    // Act
    await wrapper.get('[data-testid="metric-entry-delete"]').trigger('click')
    await nextTick()

    // Assert
    expect(mockDelete).toHaveBeenCalledWith('/api/work-metrics/entries/8')
  })

  it('MetricsPanel_AddsAdHocEntry_WhenTitleSubmitted', async () => {
    // Arrange
    const { wrapper } = await mountWithEntries([])
    mockPost.mockResolvedValue(createEntry({ id: 9, title: 'Pairing experiment', definitionId: null }))

    // Act
    await wrapper.get('[data-testid="metric-entry-add"]').trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="metric-entry-add-input"]')
    await input.setValue('Pairing experiment')
    await input.trigger('keydown.enter')
    await nextTick()

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/work-metrics/entries', {
      weekOf,
      title: 'Pairing experiment',
      value: null,
    })
  })

  it('MetricsPanel_SurfacesError_WhenStoreHasError', async () => {
    // Arrange
    const { wrapper, store } = await mountWithEntries([])

    // Act
    store.error = 'An entry with that title already exists for this week.'
    await nextTick()

    // Assert
    expect(wrapper.get('[data-testid="metrics-error"]').text()).toContain('already exists')
  })
})
