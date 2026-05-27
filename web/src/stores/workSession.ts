import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { WorkSession } from '@/types'
import { getToday } from '@/utils/week'

export const useWorkSessionStore = defineStore('workSession', () => {
  const today = ref<WorkSession | null>(null)

  async function fetchToday() {
    try {
      const data = await client.get('/api/work-sessions', { params: { date: getToday() } }) as any
      today.value = data && data.id ? data as WorkSession : null
    } catch {
      today.value = null
    }
  }

  async function clockIn() {
    today.value = await client.post('/api/work-sessions/clock-in', null, { params: { date: getToday() } }) as any
  }

  async function clockOut() {
    today.value = await client.post('/api/work-sessions/clock-out', null, { params: { date: getToday() } }) as any
  }

  async function punch(clockedInAt: Date | null, clockedOutAt: Date | null) {
    today.value = await client.put('/api/work-sessions', {
      clockedInAt: clockedInAt?.toISOString() ?? null,
      clockedOutAt: clockedOutAt?.toISOString() ?? null,
    }, { params: { date: getToday() } }) as any
  }

  return { today, fetchToday, clockIn, clockOut, punch }
})
