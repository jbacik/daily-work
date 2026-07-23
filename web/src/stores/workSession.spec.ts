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

  it('fetchWeekSessions_PopulatesSessionsByDate_WhenSucceeds', async () => {
    // Arrange
    const mon = { ...sessionFixture, id: 1, date: '2026-06-08' }
    const wed = { ...sessionFixture, id: 2, date: '2026-06-10' }
    mockGet.mockResolvedValue([mon, wed])
    const store = useWorkSessionStore()

    // Act
    await store.fetchWeekSessions('2026-06-08')

    // Assert
    expect(mockGet).toHaveBeenCalledWith('/api/work-sessions/week', { params: { weekOf: '2026-06-08' } })
    expect(store.sessionsByDate['2026-06-08']).toEqual(mon)
    expect(store.sessionsByDate['2026-06-10']).toEqual(wed)
  })

  it('fetchWeekSessions_LeavesMapUnchanged_WhenRequestFails', async () => {
    // Arrange
    mockGet.mockRejectedValue(new Error('network'))
    const store = useWorkSessionStore()
    store.sessionsByDate['2026-06-08'] = { ...sessionFixture, date: '2026-06-08' }

    // Act
    await store.fetchWeekSessions('2026-06-08')

    // Assert
    expect(store.sessionsByDate['2026-06-08']).toBeDefined()
  })

  it('fetchSession_StoresSession_WhenDataReturned', async () => {
    // Arrange
    const session = { ...sessionFixture, date: '2026-06-09' }
    mockGet.mockResolvedValue(session)
    const store = useWorkSessionStore()

    // Act
    const result = await store.fetchSession('2026-06-09')

    // Assert
    expect(result).toEqual(session)
    expect(store.sessionsByDate['2026-06-09']).toEqual(session)
  })

  it('fetchSession_ClearsCachedDate_WhenResponseEmpty', async () => {
    // Arrange — 204 unwraps to '' through the interceptor
    mockGet.mockResolvedValue('')
    const store = useWorkSessionStore()
    store.sessionsByDate['2026-06-09'] = { ...sessionFixture, date: '2026-06-09' }

    // Act
    const result = await store.fetchSession('2026-06-09')

    // Assert
    expect(result).toBeNull()
    expect(store.sessionsByDate['2026-06-09']).toBeUndefined()
  })

  it('hasReflection_ReturnsFalse_WhenReflectionsNull', async () => {
    // Arrange
    const store = useWorkSessionStore()
    store.sessionsByDate['2026-06-09'] = { ...sessionFixture, date: '2026-06-09', reflections: null }
    store.sessionsByDate['2026-06-10'] = {
      ...sessionFixture,
      date: '2026-06-10',
      reflections: { wins: 'Shipped', whines: null, valueAdds: null },
    }

    // Act & Assert
    expect(store.hasReflection('2026-06-09')).toBe(false)
    expect(store.hasReflection('2026-06-08')).toBe(false) // no cached session
    expect(store.hasReflection('2026-06-10')).toBe(true)
  })

  it('saveReflectionsForDate_EchoesCachedTimestamps_WhenSessionCached', async () => {
    // Arrange
    const cached = { ...sessionFixture, date: '2026-06-09', clockedInAt: '2026-06-09T13:00:00Z', clockedOutAt: '2026-06-09T21:00:00Z' }
    const updated = { ...cached, reflections: { wins: 'Backfilled', whines: null, valueAdds: null } }
    mockPut.mockResolvedValue(updated)
    const store = useWorkSessionStore()
    store.sessionsByDate['2026-06-09'] = cached

    // Act
    await store.saveReflectionsForDate('2026-06-09', { wins: 'Backfilled', whines: '', valueAdds: '' })

    // Assert
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      { clockedInAt: cached.clockedInAt, clockedOutAt: cached.clockedOutAt, reflections: { wins: 'Backfilled', whines: '', valueAdds: '' } },
      { params: { date: '2026-06-09' } },
    )
    expect(store.sessionsByDate['2026-06-09']).toEqual(updated)
  })

  it('saveReflectionsForDate_SendsNullTimestamps_WhenNoSessionExists', async () => {
    // Arrange — no cached session; the single-date GET also returns empty (204)
    mockGet.mockResolvedValue('')
    const updated = { ...sessionFixture, date: '2026-06-11', clockedInAt: null, clockedOutAt: null, reflections: { wins: 'New', whines: null, valueAdds: null } }
    mockPut.mockResolvedValue(updated)
    const store = useWorkSessionStore()

    // Act
    await store.saveReflectionsForDate('2026-06-11', { wins: 'New', whines: '', valueAdds: '' })

    // Assert
    expect(mockPut).toHaveBeenCalledWith(
      '/api/work-sessions',
      { clockedInAt: null, clockedOutAt: null, reflections: { wins: 'New', whines: '', valueAdds: '' } },
      { params: { date: '2026-06-11' } },
    )
    expect(store.sessionsByDate['2026-06-11']).toEqual(updated)
  })

  it('saveReflectionsForDate_AbortsWithoutClobbering_WhenPrefetchFails', async () => {
    // Arrange — no cached session, and the inline single-date GET fails transiently
    mockGet.mockRejectedValue(new Error('network'))
    const store = useWorkSessionStore()

    // Act & Assert — the save must reject rather than PUT null/null and wipe real
    // clock times for a day that may well have them on the server
    await expect(
      store.saveReflectionsForDate('2026-06-12', { wins: 'x', whines: '', valueAdds: '' }),
    ).rejects.toThrow('network')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('saveReflectionsForDate_SyncsTodayRef_WhenDateIsToday', async () => {
    // Arrange
    const todayStr = getToday()
    const cached = { ...sessionFixture, date: todayStr }
    const updated = { ...cached, reflections: { wins: 'Today win', whines: null, valueAdds: null } }
    mockPut.mockResolvedValue(updated)
    const store = useWorkSessionStore()
    store.sessionsByDate[todayStr] = cached

    // Act
    await store.saveReflectionsForDate(todayStr, { wins: 'Today win', whines: '', valueAdds: '' })

    // Assert
    expect(store.today).toEqual(updated)
    expect(store.sessionsByDate[todayStr]).toEqual(updated)
  })
})
