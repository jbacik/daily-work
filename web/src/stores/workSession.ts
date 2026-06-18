import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { ReflectionsInput, WorkSession } from '@/types'
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

  // Persist reflections onto the existing (clocked-in) session without changing
  // timestamps — used by [S]ave and Close and as the first step of clock-out.
  async function saveReflections(reflections: ReflectionsInput) {
    today.value = await client.put('/api/work-sessions', {
      clockedInAt: today.value?.clockedInAt ?? null,
      clockedOutAt: today.value?.clockedOutAt ?? null,
      reflections,
    }, { params: { date: getToday() } }) as any
  }

  async function clockOutWithReflections(reflections: ReflectionsInput | null) {
    // Save reflections first so a failed clock-out can never lose them; the
    // clock-out POST runs last, so if it succeeds nothing after it can fail.
    if (reflections) {
      await saveReflections(reflections)
    }
    await clockOut()
  }

  return { today, fetchToday, clockIn, clockOut, punch, saveReflections, clockOutWithReflections }
})
