import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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
import PastWeekView from './PastWeekView.vue'
import type { WorkItem, ReadWatchItem } from '@/types'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock

const WEEK = '2026-04-06'

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 1,
    title: 'Task',
    category: 'SmallThing',
    isDone: false,
    sortOrder: 1,
    date: '2026-04-06',
    weekOf: WEEK,
    ...overrides,
  }
}

function makeLearning(overrides: Partial<ReadWatchItem> = {}): ReadWatchItem {
  return {
    id: 1,
    title: 'Learning',
    url: '',
    type: 'Read',
    isDone: true,
    isActive: false,
    worthSharing: true,
    notes: 'Great read',
    weekConsumed: WEEK,
    date: '2026-04-06',
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

async function mountView() {
  const wrapper = mount(PastWeekView, { props: { weekOf: WEEK } })
  // flush the 3 sequential awaits in store.load
  await nextTick()
  await nextTick()
  await nextTick()
  await nextTick()
  return wrapper
}

describe('PastWeekView', () => {
  it('PastWeekView_RendersBigThing_WhenBigThingExists', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') {
        return Promise.resolve([
          makeWorkItem({ id: 10, title: 'Ship feature X', category: 'BigThing' }),
          makeWorkItem({ id: 11, title: 'Write docs', category: 'SmallThing' }),
        ])
      }
      if (url === '/api/read-watch') return Promise.resolve([])
      if (url === '/api/standup') return Promise.reject(new Error('404'))
      return Promise.resolve([])
    })

    const wrapper = await mountView()

    expect(wrapper.get('[data-testid="past-big-thing"]').text()).toContain('Ship feature X')
  })

  it('PastWeekView_RendersCheckAndSquareMarkers_WhenTasksMixed', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') {
        return Promise.resolve([
          makeWorkItem({ id: 1, title: 'Done task', isDone: true, date: '2026-04-06', sortOrder: 1 }),
          makeWorkItem({ id: 2, title: 'Not done task', isDone: false, date: '2026-04-06', sortOrder: 2 }),
        ])
      }
      if (url === '/api/read-watch') return Promise.resolve([])
      if (url === '/api/standup') return Promise.reject(new Error('404'))
      return Promise.resolve([])
    })

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="past-task-done"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="past-task-pending"]')).toHaveLength(1)
    // no interactive buttons on tasks
    expect(wrapper.find('[data-testid="past-task"] button').exists()).toBe(false)
  })

  it('PastWeekView_RendersConsumedTable_WhenLearningsExist', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') return Promise.resolve([])
      if (url === '/api/read-watch') {
        return Promise.resolve([
          makeLearning({ id: 1, title: 'Book A', url: 'https://example.com', worthSharing: true, notes: 'Loved it' }),
          makeLearning({ id: 2, title: 'Book B', url: '', worthSharing: false, notes: 'Meh' }),
        ])
      }
      if (url === '/api/standup') return Promise.reject(new Error('404'))
      return Promise.resolve([])
    })

    const wrapper = await mountView()

    const rows = wrapper.findAll('[data-testid="consumed-row"]')
    expect(rows).toHaveLength(2)
    const first = rows[0]!.text()
    expect(first).toContain('Book A')
    expect(first).toContain('yes')
    expect(first).toContain('Loved it')
    // title with url should be an anchor
    expect(rows[0]!.find('a').attributes('href')).toBe('https://example.com')
  })

  it('PastWeekView_ShowsExistingSummary_WhenSummaryPresent', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') return Promise.resolve([])
      if (url === '/api/read-watch') return Promise.resolve([])
      if (url === '/api/standup') return Promise.resolve({ markdown: 'Stored weekly recap.' })
      return Promise.resolve([])
    })

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="summary-markdown"]').text()).toContain('Stored weekly recap.')
    expect(wrapper.find('[data-testid="summary-prompt"]').exists()).toBe(false)
  })

  it('PastWeekView_GeneratesSummary_WhenGKeyPressed', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') return Promise.resolve([])
      if (url === '/api/read-watch') return Promise.resolve([])
      if (url === '/api/standup') return Promise.reject(new Error('404'))
      return Promise.resolve([])
    })
    mockPost.mockResolvedValue({ markdown: 'Fresh weekly recap.' })

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="summary-prompt"]').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'G' }))
    await nextTick()
    await nextTick()
    await nextTick()

    expect(mockPost).toHaveBeenCalledWith('/api/standup/generate-weekly-summary', null, { params: { weekOf: WEEK } })
    expect(wrapper.find('[data-testid="summary-markdown"]').text()).toContain('Fresh weekly recap.')

    wrapper.unmount()
  })

  function mockWithWeekSessions(sessions: unknown[]) {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/work-items') return Promise.resolve([])
      if (url === '/api/read-watch') return Promise.resolve([])
      if (url === '/api/standup') return Promise.reject(new Error('404'))
      if (url === '/api/work-sessions/week') return Promise.resolve(sessions)
      if (url === '/api/work-sessions') return Promise.resolve(sessions[0] ?? '')
      return Promise.resolve([])
    })
  }

  it('PastWeekView_ShowsReflectionFooter_WhenSessionHasReflections', async () => {
    // Monday (index 0 → 2026-04-06) has a reflection
    mockWithWeekSessions([
      { id: 1, date: '2026-04-06', clockedInAt: null, clockedOutAt: null, createdAt: '', reflections: { wins: 'Win', whines: null, valueAdds: null } },
    ])

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="reflection-footer"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="reflection-footer-empty"]')).toHaveLength(4)
  })

  it('PastWeekView_ShowsNoEntry_WhenDateHasNoSession', async () => {
    mockWithWeekSessions([])

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="reflection-footer-empty"]')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="reflection-footer"]')).toHaveLength(0)
  })

  it('PastWeekView_FetchesWeekSessions_WhenWeekOfChanges', async () => {
    mockWithWeekSessions([])
    const wrapper = await mountView()

    await wrapper.setProps({ weekOf: '2026-03-30' })
    await nextTick()

    expect(mockGet).toHaveBeenCalledWith('/api/work-sessions/week', { params: { weekOf: '2026-03-30' } })
  })

  it('PastWeekView_OpensViewModal_WhenReflectionFooterClicked', async () => {
    mockWithWeekSessions([
      { id: 1, date: '2026-04-06', clockedInAt: null, clockedOutAt: null, createdAt: '', reflections: { wins: 'Win', whines: null, valueAdds: null } },
    ])
    const wrapper = await mountView()

    await wrapper.findAll('[data-testid="reflection-footer"]')[0]!.trigger('click')
    await nextTick()

    expect(document.body.querySelector('[data-testid="reflection-modal-overlay"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="cmd-save"]')).toBeNull()

    wrapper.unmount()
    document.body.innerHTML = ''
  })
})
