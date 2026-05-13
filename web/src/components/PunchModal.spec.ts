import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
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
import PunchModal from './PunchModal.vue'
import { useWorkSessionStore } from '@/stores/workSession'

const mockGet = (client as any).get as Mock
const mockPut = (client as any).put as Mock

// Teleport renders outside the wrapper — query from document.body
function q(testId: string): HTMLInputElement | null {
  return document.body.querySelector(`[data-testid="${testId}"]`)
}

const sessionWithBoth = {
  id: 1,
  date: '2026-05-13',
  clockedInAt: '2026-05-13T13:00:00Z',
  clockedOutAt: '2026-05-13T21:30:00Z',
  createdAt: '2026-05-13T13:00:00Z',
}

const sessionClockedIn = {
  id: 1,
  date: '2026-05-13',
  clockedInAt: '2026-05-13T13:00:00Z',
  clockedOutAt: null,
  createdAt: '2026-05-13T13:00:00Z',
}

async function mountModal(isOpen: boolean) {
  const wrapper = mount(PunchModal, { props: { isOpen }, attachTo: document.body })
  await nextTick()
  return wrapper
}

describe('PunchModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('PunchModal_PrePopulatesFromSession_WhenOpenWithBothTimes', async () => {
    // Arrange
    mockGet.mockResolvedValue(sessionWithBoth)
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Assert — local time extracted from ISO
    const startIn = new Date(sessionWithBoth.clockedInAt!)
    const endIn = new Date(sessionWithBoth.clockedOutAt!)
    expect(q('start-hh')?.value).toBe(String(startIn.getHours()).padStart(2, '0'))
    expect(q('start-mm')?.value).toBe(String(startIn.getMinutes()).padStart(2, '0'))
    expect(q('end-hh')?.value).toBe(String(endIn.getHours()).padStart(2, '0'))
    expect(q('end-mm')?.value).toBe(String(endIn.getMinutes()).padStart(2, '0'))
  })

  it('PunchModal_ShowsEmptyInputs_WhenNoSession', async () => {
    // Arrange — 204 No Content unwraps to ''
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Assert
    expect(q('start-hh')?.value).toBe('')
    expect(q('start-mm')?.value).toBe('')
    expect(q('end-hh')?.value).toBe('')
    expect(q('end-mm')?.value).toBe('')
  })

  it('PunchModal_ShowsError_WhenEndSetWithoutStart', async () => {
    // Arrange
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Act — fill end only
    const endHH = q('end-hh')!
    const endMM = q('end-mm')!
    endHH.value = '17'
    endHH.dispatchEvent(new Event('input'))
    endMM.value = '00'
    endMM.dispatchEvent(new Event('input'))
    await nextTick()
    q('punch-save-btn')!.click()
    await nextTick()

    // Assert
    expect(q('punch-error')?.textContent).toContain('Cannot set end time without a start time')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('PunchModal_ShowsError_WhenEndBeforeStart', async () => {
    // Arrange
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Act — end before start
    const startHH = q('start-hh')!
    const startMM = q('start-mm')!
    const endHH = q('end-hh')!
    const endMM = q('end-mm')!
    startHH.value = '17'; startHH.dispatchEvent(new Event('input'))
    startMM.value = '00'; startMM.dispatchEvent(new Event('input'))
    endHH.value = '09'; endHH.dispatchEvent(new Event('input'))
    endMM.value = '00'; endMM.dispatchEvent(new Event('input'))
    await nextTick()
    q('punch-save-btn')!.click()
    await nextTick()

    // Assert
    expect(q('punch-error')?.textContent).toContain('End time must be after start time')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('PunchModal_CallsPunch_WhenUpdateClicked', async () => {
    // Arrange
    mockGet.mockResolvedValue(sessionClockedIn)
    mockPut.mockResolvedValue(sessionWithBoth)
    const store = useWorkSessionStore()
    await store.fetchToday()
    const wrapper = await mountModal(true)

    // Act — set start and end times
    const startHH = q('start-hh')!
    const startMM = q('start-mm')!
    const endHH = q('end-hh')!
    const endMM = q('end-mm')!
    startHH.value = '09'; startHH.dispatchEvent(new Event('input'))
    startMM.value = '00'; startMM.dispatchEvent(new Event('input'))
    endHH.value = '17'; endHH.dispatchEvent(new Event('input'))
    endMM.value = '30'; endMM.dispatchEvent(new Event('input'))
    await nextTick()
    q('punch-save-btn')!.click()
    await flushPromises()

    // Assert
    expect(mockPut).toHaveBeenCalledOnce()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('PunchModal_ClearsStartInputs_WhenClearStartClicked', async () => {
    // Arrange
    mockGet.mockResolvedValue(sessionClockedIn)
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Act
    q('clear-start')!.click()
    await nextTick()

    // Assert
    expect(q('start-hh')?.value).toBe('')
    expect(q('start-mm')?.value).toBe('')
  })

  it('PunchModal_ClearsEndInputs_WhenClearEndClicked', async () => {
    // Arrange
    mockGet.mockResolvedValue(sessionWithBoth)
    const store = useWorkSessionStore()
    await store.fetchToday()
    await mountModal(true)

    // Act
    q('clear-end')!.click()
    await nextTick()

    // Assert
    expect(q('end-hh')?.value).toBe('')
    expect(q('end-mm')?.value).toBe('')
  })

  it('PunchModal_EmitsClose_WhenCancelClicked', async () => {
    // Arrange
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()
    await store.fetchToday()
    const wrapper = await mountModal(true)

    // Act
    q('punch-exit-btn')!.click()
    await nextTick()

    // Assert
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
