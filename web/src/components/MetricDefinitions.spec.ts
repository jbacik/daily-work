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
import MetricDefinitions from './MetricDefinitions.vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import type { WorkMetricDefinition } from '@/types'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock
const mockPut = (client as any).put as Mock
const mockDelete = (client as any).delete as Mock

const createDefinition = (overrides: Partial<WorkMetricDefinition> = {}): WorkMetricDefinition => ({
  id: 1,
  title: 'Bugs completed this week',
  isActive: true,
  sortOrder: 1,
  createdAt: '2026-07-27T00:00:00Z',
  ...overrides,
})

async function mountWithDefinitions(definitions: WorkMetricDefinition[]) {
  mockGet
    .mockResolvedValueOnce(definitions)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
  const store = useWorkMetricsStore()
  await store.fetchAll()
  const wrapper = mount(MetricDefinitions)
  await nextTick()
  return { wrapper, store }
}

describe('MetricDefinitions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('MetricDefinitions_RendersRows_WhenStoreHasDefinitions', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithDefinitions([
      createDefinition({ id: 1 }),
      createDefinition({ id: 2, title: 'PRs involved in this week' }),
    ])

    // Assert
    expect(wrapper.findAll('[data-testid="metric-definition"]')).toHaveLength(2)
  })

  it('MetricDefinitions_ShowsEmptyState_WhenNoDefinitions', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithDefinitions([])

    // Assert
    expect(wrapper.get('[data-testid="metric-definitions-empty"]').text()).toContain('<no definitions>')
  })

  it('MetricDefinitions_ShowsRetireLabel_WhenDefinitionIsActive', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithDefinitions([createDefinition({ isActive: true })])

    // Assert
    expect(wrapper.get('[data-testid="metric-definition-toggle"]').text()).toBe('[retire]')
  })

  it('MetricDefinitions_ShowsActivateLabel_WhenDefinitionIsRetired', async () => {
    // Arrange / Act
    const { wrapper } = await mountWithDefinitions([createDefinition({ isActive: false })])

    // Assert
    expect(wrapper.get('[data-testid="metric-definition-toggle"]').text()).toBe('[activate]')
    expect(wrapper.get('[data-testid="metric-definition-title"]').classes()).toContain('line-through')
  })

  it('MetricDefinitions_RetiresDefinition_WhenToggleClicked', async () => {
    // Arrange
    const { wrapper } = await mountWithDefinitions([createDefinition({ id: 3, isActive: true })])
    mockPut.mockResolvedValue(createDefinition({ id: 3, isActive: false }))

    // Act
    await wrapper.get('[data-testid="metric-definition-toggle"]').trigger('click')
    await nextTick()

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/definitions/3', { isActive: false })
  })

  it('MetricDefinitions_RenamesDefinition_WhenTitleSubmitted', async () => {
    // Arrange
    const { wrapper } = await mountWithDefinitions([createDefinition({ id: 3 })])
    mockPut.mockResolvedValue(createDefinition({ id: 3, title: 'Bugs closed this week' }))

    // Act
    await wrapper.get('[data-testid="metric-definition-title"]').trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="metric-definition-rename-input"]')
    await input.setValue('Bugs closed this week')
    await input.trigger('keydown.enter')
    await nextTick()

    // Assert
    expect(mockPut).toHaveBeenCalledWith('/api/work-metrics/definitions/3', { title: 'Bugs closed this week' })
  })

  it('MetricDefinitions_DiscardsRename_WhenEscapePressed', async () => {
    // Arrange
    const { wrapper } = await mountWithDefinitions([createDefinition({ id: 3 })])

    // Act
    await wrapper.get('[data-testid="metric-definition-title"]').trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="metric-definition-rename-input"]')
    await input.setValue('scrapped')
    await input.trigger('keydown.escape')
    await input.trigger('blur')
    await nextTick()

    // Assert
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('MetricDefinitions_DeletesDefinition_WhenDeleteClicked', async () => {
    // Arrange
    const { wrapper } = await mountWithDefinitions([createDefinition({ id: 4 })])
    mockDelete.mockResolvedValue(undefined)

    // Act
    await wrapper.get('[data-testid="metric-definition-delete"]').trigger('click')
    await nextTick()

    // Assert
    expect(mockDelete).toHaveBeenCalledWith('/api/work-metrics/definitions/4')
  })

  it('MetricDefinitions_SurfacesError_WhenDuplicateTitleAdded', async () => {
    // Arrange
    const { wrapper, store } = await mountWithDefinitions([createDefinition()])
    mockPost.mockRejectedValue({
      response: { data: { detail: 'A definition with that title already exists.' } },
    })

    // Act
    await wrapper.get('[data-testid="metric-definition-add"]').trigger('click')
    await nextTick()
    const input = wrapper.get('[data-testid="metric-definition-add-input"]')
    await input.setValue('Bugs completed this week')
    await input.trigger('keydown.enter')
    await nextTick()

    // Assert
    expect(store.error).toBe('A definition with that title already exists.')
  })
})
