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
})
