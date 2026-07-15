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
import { useForecastStore } from './forecast'
import { getToday } from '@/utils/week'

const mockGet = (client as any).get as Mock
const mockPost = (client as any).post as Mock
const mockDelete = (client as any).delete as Mock

const forecastJson = '{"date":"2026-07-14","dayOfWeek":"Tuesday","workdayWindow":"08:00-17:00 ET"}'

describe('useForecastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchToday_SetsLoadedForecast_WhenApiReturnsJson', async () => {
    // Arrange
    mockGet.mockResolvedValue({ json: forecastJson, fileName: 'daily-forecast-2026-07-14.json', source: 'file' })
    const store = useForecastStore()

    // Act
    await store.fetchToday()

    // Assert
    expect(mockGet).toHaveBeenCalledWith('/api/forecast', { params: { date: getToday() } })
    expect(store.status).toBe('loaded')
    expect(store.fileName).toBe('daily-forecast-2026-07-14.json')
    expect(store.forecast?.date).toBe('2026-07-14')
  })

  it('fetchToday_SetsMissing_WhenApiReturns404', async () => {
    // Arrange
    mockGet.mockRejectedValue({ response: { status: 404 } })
    const store = useForecastStore()

    // Act
    await store.fetchToday()

    // Assert
    expect(store.status).toBe('missing')
    expect(store.forecast).toBeNull()
    expect(store.error).toBeNull()
  })

  it('fetchToday_SetsError_WhenRequestFails', async () => {
    // Arrange
    mockGet.mockRejectedValue({ message: 'Network Error' })
    const store = useForecastStore()

    // Act
    await store.fetchToday()

    // Assert
    expect(store.status).toBe('error')
    expect(store.error).toBe('Network Error')
  })

  it('upload_PostsJsonAndSetsLoaded_WhenContentValid', async () => {
    // Arrange
    mockPost.mockResolvedValue({ json: forecastJson, fileName: 'daily-forecast-2026-07-14.json', source: 'upload' })
    const store = useForecastStore()

    // Act
    await store.upload(forecastJson, 'my-forecast.json')

    // Assert
    expect(mockPost).toHaveBeenCalledWith('/api/forecast', { json: forecastJson }, { params: { date: getToday() } })
    expect(store.status).toBe('loaded')
    expect(store.fileName).toBe('my-forecast.json')
    expect(store.forecast?.date).toBe('2026-07-14')
  })

  it('upload_SetsErrorWithoutPosting_WhenContentInvalidJson', async () => {
    // Arrange
    const store = useForecastStore()

    // Act
    await store.upload('{ not json', 'bad.json')

    // Assert
    expect(mockPost).not.toHaveBeenCalled()
    expect(store.status).toBe('error')
    expect(store.error).toContain('bad.json')
  })

  it('unload_ClearsStateAndCallsDelete_WhenCalled', async () => {
    // Arrange
    mockGet.mockResolvedValue({ json: forecastJson, fileName: 'daily-forecast-2026-07-14.json', source: 'file' })
    mockDelete.mockResolvedValue('')
    const store = useForecastStore()
    await store.fetchToday()

    // Act
    await store.unload()

    // Assert
    expect(mockDelete).toHaveBeenCalledWith('/api/forecast', { params: { date: getToday() } })
    expect(store.status).toBe('missing')
    expect(store.forecast).toBeNull()
    expect(store.fileName).toBeNull()
  })
})
