import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Mock } from 'vitest'

// The modal registers a global window keydown listener on mount —
// unmount wrappers after each test so listeners don't leak across tests
enableAutoUnmount(afterEach)

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/utils/week', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/week')>()
  return { ...actual, getToday: vi.fn(), getPreviousWorkday: vi.fn() }
})

import client from '@/api/client'
import { getToday, getPreviousWorkday } from '@/utils/week'
import ClockCeremonyModal from './ClockCeremonyModal.vue'
import type { WorkSession } from '@/types'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock
const mockPut = (client as any).put as Mock
const mockGetToday = getToday as Mock
const mockGetPreviousWorkday = getPreviousWorkday as Mock

// Teleport renders outside the wrapper — query from document.body
function q(testId: string): HTMLElement | null {
  return document.body.querySelector(`[data-testid="${testId}"]`)
}

const createMockSession = (overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: 1,
  date: '2026-04-08',
  clockedInAt: null,
  clockedOutAt: null,
  createdAt: '2026-04-08T00:00:00Z',
  reflections: null,
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockGetToday.mockReturnValue('2026-04-08')
  mockGetPreviousWorkday.mockReturnValue('2026-04-07')
  mockGet.mockResolvedValue([])
})

afterEach(() => {
  // Clean up any leftover teleport content
  document.body.innerHTML = ''
})

describe('ClockCeremonyModal', () => {
  it('ClockCeremonyModal_IsNotRendered_WhenIsOpenFalse', () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: false, mode: 'in' },
      attachTo: document.body,
    })

    expect(q('ceremony-modal')).toBeNull()
  })

  it('ClockCeremonyModal_IsRendered_WhenIsOpenTrue', async () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    expect(q('ceremony-modal')).not.toBeNull()
  })

  it('ClockCeremonyModal_ShowsClockInHeader_WhenModeIsIn', async () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    expect(q('ceremony-header')?.textContent).toContain('clock-in.ceremony')
  })

  it('ClockCeremonyModal_ShowsClockOutHeader_WhenModeIsOut', async () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'out' },
      attachTo: document.body,
    })
    await nextTick()

    expect(q('ceremony-header')?.textContent).toContain('clock-out.ceremony')
  })

  it('ClockCeremonyModal_RendersPunchCardIdle_WhenOpened', async () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    expect(q('punch-card')).not.toBeNull()
    expect(q('scan-beam')).toBeNull()
    expect(q('slot-label')?.textContent).toContain('insert card')
  })

  it('ClockCeremonyModal_EmitsClose_WhenExitButtonClicked', async () => {
    const wrapper = mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    q('exit-btn')?.click()
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('ClockCeremonyModal_EmitsClose_WhenEscapePressed', async () => {
    const wrapper = mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('ClockCeremonyModal_ClocksIn_WhenSubmitButtonClicked', async () => {
    mockPost.mockResolvedValue(createMockSession({ clockedInAt: '2026-04-08T09:00:00Z' }))
    vi.useFakeTimers()

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith(
      '/api/work-sessions/clock-in',
      null,
      { params: { date: '2026-04-08' } }
    )
    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })

  it('ClockCeremonyModal_EmitsClose_AfterSuccessfulClockIn', async () => {
    mockPost.mockResolvedValue(createMockSession({ clockedInAt: '2026-04-08T09:00:00Z' }))
    vi.useFakeTimers()

    const wrapper = mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()
    await vi.runAllTimersAsync()

    expect(wrapper.emitted('close')).toBeTruthy()
    vi.useRealTimers()
  })

  it('ClockCeremonyModal_ShowsTerminalError_WhenClockInFails', async () => {
    const error = Object.assign(new Error('500'), { response: { status: 500 } })
    mockPost.mockRejectedValue(error)

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    expect(q('terminal-error')).not.toBeNull()
    expect(q('terminal-error')?.textContent).toContain('clock-in failed: HTTP 500')
  })

  it('ClockCeremonyModal_ReEnablesSubmit_AfterFailure', async () => {
    const error = Object.assign(new Error('503'), { response: { status: 503 } })
    mockPost.mockRejectedValue(error)

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    const btn = q('submit-btn') as HTMLButtonElement | null
    expect(btn?.disabled).toBe(false)
  })

  it('ClockCeremonyModal_DoesNotEmitClose_WhenExitClickedWhileBusy', async () => {
    mockPost.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'in' },
      attachTo: document.body,
    })
    await nextTick()

    q('submit-btn')?.click()
    await nextTick()
    q('exit-btn')?.click()
    await nextTick()

    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('ClockCeremonyModal_RendersOutTriageAndReflection_WhenModeIsOut', async () => {
    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'out' },
      attachTo: document.body,
    })
    await nextTick()

    expect(q('clock-out-triage')).not.toBeNull()
    expect(q('daily-reflection')).not.toBeNull()
    // Clock-in triage should not appear in out mode
    expect(q('capacity-meter')).toBeNull()
  })

  it('ClockCeremonyModal_ClocksOut_WhenSubmitInOutMode', async () => {
    mockPost.mockResolvedValue(createMockSession({
      clockedInAt: '2026-04-08T09:00:00Z',
      clockedOutAt: '2026-04-08T17:00:00Z',
    }))
    vi.useFakeTimers()

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'out' },
      attachTo: document.body,
    })
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith(
      '/api/work-sessions/clock-out',
      null,
      { params: { date: '2026-04-08' } }
    )
    // No reflections entered → no PUT
    expect(mockPut).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })

  it('ClockCeremonyModal_SavesReflections_WhenSubmitInOutModeWithWins', async () => {
    mockPost.mockResolvedValue(createMockSession({
      clockedInAt: '2026-04-08T09:00:00Z',
      clockedOutAt: '2026-04-08T17:00:00Z',
    }))
    mockPut.mockResolvedValue(createMockSession({
      clockedInAt: '2026-04-08T09:00:00Z',
      clockedOutAt: '2026-04-08T17:00:00Z',
      reflections: { wins: 'Shipped it', whines: null, valueAdds: null },
    }))
    vi.useFakeTimers()

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'out' },
      attachTo: document.body,
    })
    await flushPromises()

    const wins = q('reflect-wins') as HTMLTextAreaElement
    wins.value = 'Shipped it'
    wins.dispatchEvent(new Event('input'))
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith(
      '/api/work-sessions/clock-out',
      null,
      { params: { date: '2026-04-08' } }
    )
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      expect.objectContaining({ reflections: expect.objectContaining({ wins: 'Shipped it' }) }),
      { params: { date: '2026-04-08' } }
    )
    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })

  it('ClockCeremonyModal_PreservesReflections_WhenClockOutFails', async () => {
    const error = Object.assign(new Error('500'), { response: { status: 500 } })
    mockPost.mockRejectedValue(error)

    mount(ClockCeremonyModal, {
      props: { isOpen: true, mode: 'out' },
      attachTo: document.body,
    })
    await flushPromises()

    const wins = q('reflect-wins') as HTMLTextAreaElement
    wins.value = 'Keep me'
    wins.dispatchEvent(new Event('input'))
    await flushPromises()

    q('submit-btn')?.click()
    await flushPromises()

    expect(q('terminal-error')?.textContent).toContain('clock-out failed: HTTP 500')
    expect((q('reflect-wins') as HTMLTextAreaElement).value).toBe('Keep me')
  })
})
