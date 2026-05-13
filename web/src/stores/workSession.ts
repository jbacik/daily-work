import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { WorkSession } from '@/types'

export const useWorkSessionStore = defineStore('workSession', () => {
  const today = ref<WorkSession | null>(null)

  async function fetchToday() {
    try {
      const data = await client.get('/api/work-sessions/today') as any
      today.value = data && data.id ? data as WorkSession : null
    } catch {
      today.value = null
    }
  }

  async function clockIn() {
    today.value = await client.post('/api/work-sessions/clock-in', {}) as any
  }

  async function clockOut() {
    today.value = await client.post('/api/work-sessions/clock-out', {}) as any
  }

  return { today, fetchToday, clockIn, clockOut }
})
