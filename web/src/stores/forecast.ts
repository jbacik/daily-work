import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { DailyForecast, ForecastStatus } from '@/types'
import { getToday } from '@/utils/week'

export const useForecastStore = defineStore('forecast', () => {
  const forecast = ref<DailyForecast | null>(null)
  const fileName = ref<string | null>(null)
  const status = ref<ForecastStatus>('missing')
  const error = ref<string | null>(null)

  async function fetchToday() {
    status.value = 'loading'
    error.value = null
    try {
      const data = await client.get('/api/forecast', { params: { date: getToday() } }) as any
      forecast.value = JSON.parse(data.json)
      fileName.value = data.fileName
      status.value = 'loaded'
    } catch (e: any) {
      forecast.value = null
      fileName.value = null
      if (e?.response?.status === 404) {
        status.value = 'missing'
      } else {
        status.value = 'error'
        error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to load forecast'
      }
    }
  }

  async function upload(content: string, name: string) {
    let parsed: DailyForecast
    try {
      parsed = JSON.parse(content)
    } catch {
      status.value = 'error'
      error.value = `'${name}' is not valid JSON`
      return
    }

    try {
      await client.post('/api/forecast', { json: content }, { params: { date: getToday() } })
      forecast.value = parsed
      fileName.value = name
      status.value = 'loaded'
      error.value = null
    } catch (e: any) {
      status.value = 'error'
      error.value = e?.response?.data?.detail ?? e?.message ?? 'Upload failed'
    }
  }

  async function unload() {
    await client.delete('/api/forecast', { params: { date: getToday() } })
    forecast.value = null
    fileName.value = null
    status.value = 'missing'
    error.value = null
  }

  return { forecast, fileName, status, error, fetchToday, upload, unload }
})
