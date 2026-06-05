import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { Mock } from 'vitest'

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
    vi.runAllTimers()
    await flushPromises()

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
})
