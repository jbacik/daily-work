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
import { useWorkSessionStore } from './workSession'
import { getToday } from '@/utils/week'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock
const mockPut = (client as any).put as Mock

const sessionFixture = {
  id: 1,
  date: '2026-05-13',
  clockedInAt: '2026-05-13T13:03:42Z',
  clockedOutAt: null,
  createdAt: '2026-05-13T13:03:42Z',
}

describe('useWorkSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchToday_SetsTodayToNull_WhenResponseIsEmpty', async () => {
    // Arrange — 204 No Content unwraps to '' through the response interceptor
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()

    // Act
    await store.fetchToday()

    // Assert
    expect(store.today).toBeNull()
    expect(mockGet).toHaveBeenCalledWith('/api/work-sessions', { params: { date: getToday() } })
  })

  it('fetchToday_SetsToday_WhenSessionExists', async () => {
    // Arrange
    mockGet.mockResolvedValue(sessionFixture)
    const store = useWorkSessionStore()

    // Act
    await store.fetchToday()

    // Assert
    expect(store.today).toEqual(sessionFixture)
  })

  it('fetchToday_SetsTodayToNull_WhenRequestFails', async () => {
    // Arrange
    mockGet.mockRejectedValue(new Error('network'))
    const store = useWorkSessionStore()
    store.today = sessionFixture

    // Act
    await store.fetchToday()

    // Assert
    expect(store.today).toBeNull()
  })

  it('clockIn_UpdatesToday_WhenSuccessful', async () => {
    // Arrange
    mockPost.mockResolvedValue(sessionFixture)
    const store = useWorkSessionStore()

    // Act
    await store.clockIn()

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/work-sessions/clock-in', null, { params: { date: getToday() } })
    expect(store.today).toEqual(sessionFixture)
  })

  it('clockOut_UpdatesToday_WhenSuccessful', async () => {
    // Arrange
    const finished = { ...sessionFixture, clockedOutAt: '2026-05-13T21:42:11Z' }
    mockPost.mockResolvedValue(finished)
    const store = useWorkSessionStore()

    // Act
    await store.clockOut()

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/work-sessions/clock-out', null, { params: { date: getToday() } })
    expect(store.today).toEqual(finished)
  })

  it('punch_UpdatesToday_WhenSuccessful', async () => {
    // Arrange
    const clockedIn = new Date('2026-05-13T13:03:42Z')
    const clockedOut = new Date('2026-05-13T21:42:11Z')
    const updated = { ...sessionFixture, clockedOutAt: clockedOut.toISOString() }
    mockPut.mockResolvedValue(updated)
    const store = useWorkSessionStore()

    // Act
    await store.punch(clockedIn, clockedOut)

    // Assert
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      { clockedInAt: clockedIn.toISOString(), clockedOutAt: clockedOut.toISOString() },
      { params: { date: getToday() } },
    )
    expect(store.today).toEqual(updated)
  })

  it('punch_SendsNulls_WhenTimesAreNull', async () => {
    // Arrange
    const cleared = { ...sessionFixture, clockedInAt: null, clockedOutAt: null }
    mockPut.mockResolvedValue(cleared)
    const store = useWorkSessionStore()

    // Act
    await store.punch(null, null)

    // Assert
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      { clockedInAt: null, clockedOutAt: null },
      { params: { date: getToday() } },
    )
    expect(store.today).toEqual(cleared)
  })

  it('saveReflections_PutsDraftWithExistingTimestamps_WithoutClockingOut', async () => {
    // Arrange — clocked in, not yet out
    const withDraft = { ...sessionFixture, reflections: { wins: 'Shipped', whines: null, valueAdds: null } }
    mockPut.mockResolvedValue(withDraft)
    const store = useWorkSessionStore()
    store.today = { ...sessionFixture }

    // Act
    await store.saveReflections({ wins: 'Shipped', whines: '', valueAdds: '' })

    // Assert — keeps clockedInAt, leaves clockedOutAt null (no clock-out)
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      { clockedInAt: sessionFixture.clockedInAt, clockedOutAt: null, reflections: { wins: 'Shipped', whines: '', valueAdds: '' } },
      { params: { date: getToday() } },
    )
    expect(mockPost).not.toHaveBeenCalled()
    expect(store.today).toEqual(withDraft)
  })

  it('clockOutWithReflections_SavesReflectionsBeforeClockOut', async () => {
    // Arrange
    mockPut.mockResolvedValue({ ...sessionFixture, reflections: { wins: 'Shipped', whines: null, valueAdds: null } })
    mockPost.mockResolvedValue({ ...sessionFixture, clockedOutAt: '2026-05-13T21:42:11Z' })
    const store = useWorkSessionStore()
    store.today = { ...sessionFixture }

    // Act
    await store.clockOutWithReflections({ wins: 'Shipped', whines: '', valueAdds: '' })

    // Assert — reflections PUT runs strictly before the clock-out POST
    expect(mockPut).toHaveBeenCalled()
    expect(mockPost).toHaveBeenCalledWith('/api/work-sessions/clock-out', null, { params: { date: getToday() } })
    expect(mockPut.mock.invocationCallOrder[0]).toBeLessThan(mockPost.mock.invocationCallOrder[0])
  })

  it('clockOutWithReflections_SkipsReflectionPut_WhenNull', async () => {
    // Arrange
    mockPost.mockResolvedValue({ ...sessionFixture, clockedOutAt: '2026-05-13T21:42:11Z' })
    const store = useWorkSessionStore()
    store.today = { ...sessionFixture }

    // Act
    await store.clockOutWithReflections(null)

    // Assert
    expect(mockPut).not.toHaveBeenCalled()
    expect(mockPost).toHaveBeenCalledWith('/api/work-sessions/clock-out', null, { params: { date: getToday() } })
  })
})
