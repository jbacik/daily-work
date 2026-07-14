import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import StandupPlanningModal from './StandupPlanningModal.vue'
import type { Mock } from 'vitest'
import type { WorkItem } from '@/types'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// StandupTasksPanel reads the dailyTasks store — mock it with an empty day
const mockItems = ref<WorkItem[]>([])
vi.mock('@/stores/dailyTasks', () => ({
  useDailyTasksStore: () => ({
    items: mockItems,
    currentDay: 2,
    getTasksForDay: () => mockItems.value,
  }),
}))

import client from '@/api/client'
const clientGet = (client as any).get as Mock
const clientPost = (client as any).post as Mock
const clientDelete = (client as any).delete as Mock

const forecastJson = JSON.stringify({
  date: '2026-07-14',
  dayOfWeek: 'Tuesday',
  workdayWindow: '08:00-17:00 ET',
  meetings: { count: 4, totalHours: 3.5 },
  focusTime: {
    count: 1,
    totalHours: 1.5,
    blocks: [{ startTime: '08:30 ET', endTime: '10:00 ET', duration: '90 min' }],
  },
  syncMeetings: ['Ali / Jared'],
  recommendedLunch: '11:30-12:00 ET',
  upcomingPTO: [],
})

const forecastResponse = {
  json: forecastJson,
  fileName: 'daily-forecast-2026-07-14.json',
  source: 'file',
}

const savedMarkdown = '### Did you complete your One Thing yesterday?\nCrushed it.\n\n### What is your One Thing today?\nInsights work.'

function mockEndpoints({ forecast = true, saved = false }: { forecast?: boolean; saved?: boolean } = {}) {
  clientGet.mockImplementation((url: string) => {
    if (url === '/api/forecast') {
      return forecast
        ? Promise.resolve(forecastResponse)
        : Promise.reject({ response: { status: 404 } })
    }
    return saved
      ? Promise.resolve({ markdown: savedMarkdown, date: '2026-07-14' })
      : Promise.reject({ response: { status: 404 } })
  })
}

function mountComponent(props: { isOpen?: boolean; weekOf?: string } = {}) {
  return mount(StandupPlanningModal, {
    props: {
      isOpen: props.isOpen ?? true,
      weekOf: props.weekOf ?? '2026-07-13',
    },
    attachTo: document.body,
  })
}

function queryBody(selector: string) {
  return document.body.querySelector(selector)
}

describe('StandupPlanningModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockItems.value = []
    clientDelete.mockResolvedValue('')
  })

  it('StandupPlanningModal_DoesNotRender_WhenClosed', () => {
    mockEndpoints()
    const wrapper = mountComponent({ isOpen: false })

    expect(queryBody('[data-testid="planning-modal-overlay"]')).toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_FetchesForecast_WhenOpened', async () => {
    mockEndpoints()
    const wrapper = mountComponent()
    await flushPromises()

    expect(clientGet).toHaveBeenCalledWith('/api/forecast', expect.anything())

    wrapper.unmount()
  })

  it('StandupPlanningModal_HidesPanelsAndShowsOnlyExit_WhenForecastMissing', async () => {
    mockEndpoints({ forecast: false })
    const wrapper = mountComponent()
    await flushPromises()

    expect(queryBody('[data-testid="no-forecast-placeholder"]')).not.toBeNull()
    expect(queryBody('[data-testid="shape-panel"]')).toBeNull()
    expect(queryBody('[data-testid="cmd-save"]')).toBeNull()
    expect(queryBody('[data-testid="cmd-copy"]')).toBeNull()
    expect(queryBody('[data-testid="cmd-exit"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_RendersShapeAndTasksPanels_WhenForecastLoaded', async () => {
    mockEndpoints()
    const wrapper = mountComponent()
    await flushPromises()

    expect(queryBody('[data-testid="forecast-filename"]')?.textContent).toBe('daily-forecast-2026-07-14.json')
    expect(queryBody('[data-testid="shape-panel"]')).not.toBeNull()
    expect(queryBody('[data-testid="tasks-panel"]')).not.toBeNull()
    expect(queryBody('[data-testid="questions-panel"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_ShowsSavedSections_WhenSavedStandupExists', async () => {
    mockEndpoints({ saved: true })
    const wrapper = mountComponent()
    await flushPromises()

    const content = queryBody('[data-testid="planning-modal-content"]')?.textContent ?? ''
    expect(content).toContain('Crushed it')
    expect(queryBody('[data-testid="generate-standup-btn"]')).toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_ShowsGenerateButton_WhenNoSavedStandup', async () => {
    mockEndpoints()
    const wrapper = mountComponent()
    await flushPromises()

    expect(queryBody('[data-testid="generate-standup-btn"]')).not.toBeNull()
    expect(queryBody('[data-testid="planning-modal-content"]')).toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_GeneratesSections_WhenGenerateClicked', async () => {
    mockEndpoints()
    clientPost.mockResolvedValue({ markdown: savedMarkdown })
    const wrapper = mountComponent()
    await flushPromises()

    const generateBtn = queryBody('[data-testid="generate-standup-btn"]') as HTMLElement
    generateBtn.click()
    await flushPromises()

    const generateCall = clientPost.mock.calls.find((call: any[]) => call[0] === '/api/standup/generate')
    expect(generateCall).toBeTruthy()
    expect(generateCall![2].params).toEqual({ weekOf: '2026-07-13', today: expect.any(String) })
    const content = queryBody('[data-testid="planning-modal-content"]')?.textContent ?? ''
    expect(content).toContain('Crushed it')

    wrapper.unmount()
  })

  it('StandupPlanningModal_CopiesAnswer_WhenSectionCopyClicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    mockEndpoints({ saved: true })
    const wrapper = mountComponent()
    await flushPromises()

    const copyBtn = queryBody('[data-testid="copy-section-0"]') as HTMLElement
    copyBtn.click()
    await nextTick()

    expect(writeText).toHaveBeenCalledWith('Crushed it.')

    wrapper.unmount()
  })

  it('StandupPlanningModal_SavesMarkdown_WhenSavePressed', async () => {
    mockEndpoints({ saved: true })
    clientPost.mockResolvedValue({ markdown: '', date: '' })
    const wrapper = mountComponent()
    await flushPromises()

    const saveBtn = queryBody('[data-testid="cmd-save"]') as HTMLElement
    saveBtn.click()
    await nextTick()

    const saveCall = clientPost.mock.calls.find((call: any[]) => call[0] === '/api/standup')
    expect(saveCall).toBeTruthy()
    expect(saveCall![1].commandType).toBe('standup')
    expect(saveCall![1].markdown).toContain('### Did you complete your One Thing yesterday?')

    wrapper.unmount()
  })

  it('StandupPlanningModal_UnloadsForecast_WhenUnloadClicked', async () => {
    mockEndpoints()
    const wrapper = mountComponent()
    await flushPromises()

    const unloadBtn = queryBody('[data-testid="forecast-unload"]') as HTMLElement
    unloadBtn.click()
    await flushPromises()

    expect(clientDelete).toHaveBeenCalledWith('/api/forecast', expect.anything())
    expect(queryBody('[data-testid="shape-panel"]')).toBeNull()
    expect(queryBody('[data-testid="no-forecast-placeholder"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('StandupPlanningModal_EmitsClose_WhenEscapePressed', async () => {
    mockEndpoints()
    const wrapper = mountComponent()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('StandupPlanningModal_IgnoresSaveShortcut_WhenForecastNotLoaded', async () => {
    mockEndpoints({ forecast: false })
    const wrapper = mountComponent()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    await flushPromises()

    const saveCall = clientPost.mock.calls.find((call: any[]) => call[0] === '/api/standup')
    expect(saveCall).toBeFalsy()

    wrapper.unmount()
  })
})
