import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExportFeedbackModal from './ExportFeedbackModal.vue'
import type { Mock } from 'vitest'
import type { FeedbackPair } from '@/types'
import { getToday, shiftDate } from '@/utils/week'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from '@/api/client'
const clientGet = (client as any).get as Mock

const createMockPair = (overrides: Partial<FeedbackPair> = {}): FeedbackPair => ({
  date: '2026-10-07',
  commType: 'DailyStandup',
  promptVariant: 'midweek-v1',
  systemPrompt: 'system',
  userMessage: 'user',
  generatedMarkdown: '### Q\nDraft',
  submittedMarkdown: '### Q\nDraft',
  ...overrides,
})

function mountComponent(isOpen = true) {
  return mount(ExportFeedbackModal, { props: { isOpen }, attachTo: document.body })
}

function queryBody(selector: string) {
  return document.body.querySelector(selector)
}

describe('ExportFeedbackModal', () => {
  let anchorClick: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    anchorClick.mockRestore()
  })

  it('ExportFeedbackModal_DoesNotRender_WhenClosed', () => {
    const wrapper = mountComponent(false)

    expect(queryBody('[data-testid="export-feedback-overlay"]')).toBeNull()

    wrapper.unmount()
  })

  it('ExportFeedbackModal_RequestsLastTwoWeeks_WhenDefaultPresetDownloaded', async () => {
    // Arrange
    clientGet.mockResolvedValue([createMockPair()])
    const wrapper = mountComponent()
    const today = getToday()

    // Act
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(clientGet).toHaveBeenCalledWith('/api/standup/feedback-pairs', {
      params: { from: shiftDate(today, -14), to: today },
    })

    wrapper.unmount()
  })

  it('ExportFeedbackModal_ShowsSummaryAndDownloads_WhenPairsReturned', async () => {
    // Arrange
    clientGet.mockResolvedValue([
      createMockPair(),
      createMockPair({ date: '2026-10-08', submittedMarkdown: '### Q\nEdited', promptVariant: 'friday-v1' }),
    ])
    const wrapper = mountComponent()

    // Act
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(queryBody('[data-testid="export-total"]')?.textContent).toBe('2')
    expect(queryBody('[data-testid="export-edited"]')?.textContent).toBe('1')
    expect(queryBody('[data-testid="export-summary"]')?.textContent).toContain('friday-v1: 1')
    expect(anchorClick).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('ExportFeedbackModal_ShowsEmptyStateWithoutDownload_WhenNoPairs', async () => {
    // Arrange
    clientGet.mockResolvedValue([])
    const wrapper = mountComponent()

    // Act
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(queryBody('[data-testid="export-empty"]')).not.toBeNull()
    expect(anchorClick).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('ExportFeedbackModal_ShowsCaptureOffError_WhenApiReturns404', async () => {
    // Arrange
    clientGet.mockRejectedValue({ response: { status: 404 } })
    const wrapper = mountComponent()

    // Act
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(queryBody('[data-testid="export-error"]')?.textContent).toContain('Feedback capture is off')

    wrapper.unmount()
  })

  it('ExportFeedbackModal_UsesCustomRange_WhenCustomDatesEntered', async () => {
    // Arrange
    clientGet.mockResolvedValue([])
    const wrapper = mountComponent()
    ;(queryBody('[data-testid="preset-custom"]') as HTMLElement).click()
    await nextTick()

    // Act
    const from = queryBody('[data-testid="custom-from"]') as HTMLInputElement
    const to = queryBody('[data-testid="custom-to"]') as HTMLInputElement
    from.value = '2026-09-01'
    from.dispatchEvent(new Event('input'))
    to.value = '2026-09-30'
    to.dispatchEvent(new Event('input'))
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(clientGet).toHaveBeenCalledWith('/api/standup/feedback-pairs', {
      params: { from: '2026-09-01', to: '2026-09-30' },
    })

    wrapper.unmount()
  })

  it('ExportFeedbackModal_ShowsErrorWithoutRequest_WhenCustomRangeIncomplete', async () => {
    // Arrange
    const wrapper = mountComponent()
    ;(queryBody('[data-testid="preset-custom"]') as HTMLElement).click()
    await nextTick()

    // Act
    ;(queryBody('[data-testid="export-download-btn"]') as HTMLElement).click()
    await flushPromises()

    // Assert
    expect(clientGet).not.toHaveBeenCalled()
    expect(queryBody('[data-testid="export-error"]')?.textContent).toContain('Enter both from and to dates')

    wrapper.unmount()
  })

  it('ExportFeedbackModal_EmitsClose_WhenEscapePressed', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })
})
