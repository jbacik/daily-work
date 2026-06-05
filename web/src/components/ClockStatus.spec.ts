import { mount } from '@vue/test-utils'
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

import client from '@/api/client'
import ClockStatus from './ClockStatus.vue'
import type { WorkSession } from '@/types'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock

const createMockSession = (overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: 1,
  date: '2026-05-13',
  clockedInAt: null,
  clockedOutAt: null,
  createdAt: '2026-05-13T08:00:00.000Z',
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ClockStatus', () => {
  it('ClockStatus_RendersNotInState_WhenNoSession', async () => {
    mockGet.mockResolvedValue('')

    const wrapper = mount(ClockStatus)
    await flushAsync()

    expect(wrapper.find('[data-testid="clock-status-not-in"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="clock-status-in"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="clock-status-out"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="clock-status-not-in"]').text()).toContain('clock-in')
  })

  it('ClockStatus_RendersInState_WhenClockedIn', async () => {
    mockGet.mockResolvedValue(createMockSession({
      clockedInAt: '2026-05-13T13:03:42.000Z',
    }))

    const wrapper = mount(ClockStatus)
    await flushAsync()

    expect(wrapper.find('[data-testid="clock-status-in"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="clock-status-in"]').text()).toContain('Grind started @')
    expect(wrapper.get('[data-testid="clock-status-in-time"]').text()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(wrapper.find('[data-testid="clock-out-btn"]').exists()).toBe(true)
  })

  it('ClockStatus_RendersOutState_WhenClockedOut', async () => {
    mockGet.mockResolvedValue(createMockSession({
      clockedInAt: '2026-05-13T13:03:42.000Z',
      clockedOutAt: '2026-05-13T21:42:11.000Z',
    }))

    const wrapper = mount(ClockStatus)
    await flushAsync()

    expect(wrapper.find('[data-testid="clock-status-out"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="clock-status-out"]').text()).toContain('Nice work')
    expect(wrapper.get('[data-testid="clock-status-out-in-time"]').text()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(wrapper.get('[data-testid="clock-status-out-time"]').text()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('ClockStatus_OpensCeremonyModal_WhenNotInClicked', async () => {
    // First GET = workSession (null session), second GET = dailyTasks fetch (empty array)
    mockGet.mockResolvedValueOnce('').mockResolvedValue([])

    const wrapper = mount(ClockStatus, { attachTo: document.body })
    await flushAsync()

    await wrapper.get('[data-testid="clock-status-not-in"]').trigger('click')
    await flushAsync()

    // Modal Teleports to body — query from document
    const modal = document.body.querySelector('[data-testid="ceremony-modal"]')
    expect(modal).not.toBeNull()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('ClockStatus_CallsClockOut_WhenClockOutClicked', async () => {
    mockGet.mockResolvedValue(createMockSession({ clockedInAt: '2026-05-13T13:03:42.000Z' }))
    mockPost.mockResolvedValue(createMockSession({
      clockedInAt: '2026-05-13T13:03:42.000Z',
      clockedOutAt: '2026-05-13T21:42:11.000Z',
    }))

    const wrapper = mount(ClockStatus)
    await flushAsync()

    await wrapper.get('[data-testid="clock-out-btn"]').trigger('click')
    await flushAsync()

    expect(mockPost).toHaveBeenCalledWith('/api/work-sessions/clock-out', null, { params: { date: expect.any(String) } })
    expect(wrapper.find('[data-testid="clock-status-out"]').exists()).toBe(true)
  })

  it('ClockStatus_DoesNotShowInTime_WhenClockedOutWithoutClockIn', async () => {
    mockGet.mockResolvedValue(createMockSession({
      clockedInAt: null,
      clockedOutAt: '2026-05-13T21:42:11.000Z',
    }))

    const wrapper = mount(ClockStatus)
    await flushAsync()

    expect(wrapper.find('[data-testid="clock-status-out"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="clock-status-out-in-time"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="clock-status-out-time"]').exists()).toBe(true)
  })
})

async function flushAsync() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
