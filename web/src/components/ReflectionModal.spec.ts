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
    delete: vi.fn(),
  },
}))

import client from '@/api/client'
import ReflectionModal from './ReflectionModal.vue'
import DailyReflection from './DailyReflection.vue'
import type { WorkSession } from '@/types'

const mockGet = (client as any).get as Mock
const mockPut = (client as any).put as Mock

// Teleport renders outside the wrapper — query from document.body
function q(testId: string): HTMLElement | null {
  return document.body.querySelector(`[data-testid="${testId}"]`)
}

const createMockSession = (overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: 1,
  date: '2026-06-09',
  clockedInAt: '2026-06-09T13:00:00Z',
  clockedOutAt: '2026-06-09T21:00:00Z',
  createdAt: '2026-06-09T13:00:00Z',
  reflections: null,
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockGet.mockResolvedValue('')
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ReflectionModal', () => {
  it('ReflectionModal_RendersAnswers_WhenViewModeWithReflections', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession({
      reflections: { wins: 'Shipped it', whines: 'Flaky CI', valueAdds: 'Mentored' },
    }))

    // Act
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert
    expect(q('reflection-view-wins')?.textContent).toContain('Shipped it')
    expect(q('reflection-view-whines')?.textContent).toContain('Flaky CI')
    expect(q('reflection-view-value-adds')?.textContent).toContain('Mentored')
  })

  it('ReflectionModal_ShowsNoEntryPlaceholder_WhenFieldIsNull', async () => {
    // Arrange — only wins set
    mockGet.mockResolvedValue(createMockSession({
      reflections: { wins: 'Shipped it', whines: null, valueAdds: null },
    }))

    // Act
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert — two <no entry> placeholders (whines + value adds)
    expect(document.body.querySelectorAll('[data-testid="reflection-no-entry"]')).toHaveLength(2)
  })

  it('ReflectionModal_FetchesSessionForDate_WhenOpened', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession())

    // Act
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert
    expect(mockGet).toHaveBeenCalledWith('/api/work-sessions', { params: { date: '2026-06-09' } })
  })

  it('ReflectionModal_EmitsClose_WhenEscapePressed', async () => {
    // Arrange
    const wrapper = mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Act
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    // Assert
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('ReflectionModal_EmitsClose_WhenEKeyPressed', async () => {
    // Arrange
    const wrapper = mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Act
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
    await nextTick()

    // Assert
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('ReflectionModal_EmbedsDailyReflection_WhenEditMode', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession())

    // Act
    const wrapper = mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'edit' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert
    expect(wrapper.findComponent(DailyReflection).exists()).toBe(true)
  })

  it('ReflectionModal_PrefillsDailyReflection_WhenSessionHasReflections', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession({
      reflections: { wins: 'Prefilled win', whines: null, valueAdds: null },
    }))

    // Act
    const wrapper = mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'edit' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert
    expect(wrapper.findComponent(DailyReflection).props('initial')).toMatchObject({ wins: 'Prefilled win' })
  })

  it('ReflectionModal_PutsEchoedTimestamps_WhenSaveClicked', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession({
      reflections: { wins: 'Existing', whines: null, valueAdds: null },
    }))
    mockPut.mockResolvedValue(createMockSession({
      reflections: { wins: 'Existing', whines: null, valueAdds: null },
    }))
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'edit' },
      attachTo: document.body,
    })
    await flushPromises()

    // Act
    q('cmd-save')?.dispatchEvent(new MouseEvent('click'))
    await flushPromises()

    // Assert — echoes the fetched session's timestamps
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      expect.objectContaining({
        clockedInAt: '2026-06-09T13:00:00Z',
        clockedOutAt: '2026-06-09T21:00:00Z',
      }),
      { params: { date: '2026-06-09' } },
    )
  })

  it('ReflectionModal_IgnoresSKey_WhenTypingInTextarea', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession())
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'edit' },
      attachTo: document.body,
    })
    await flushPromises()
    const textarea = document.body.querySelector('textarea')
    textarea?.focus()

    // Act — 's' while focused in a textarea should not trigger save
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    await nextTick()

    // Assert
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('ReflectionModal_HidesSaveAction_WhenViewMode', async () => {
    // Arrange
    mockGet.mockResolvedValue(createMockSession({
      reflections: { wins: 'Win', whines: null, valueAdds: null },
    }))

    // Act
    mount(ReflectionModal, {
      props: { isOpen: true, date: '2026-06-09', mode: 'view' },
      attachTo: document.body,
    })
    await flushPromises()

    // Assert
    expect(q('cmd-save')).toBeNull()
    expect(q('cmd-exit')).not.toBeNull()
  })
})
