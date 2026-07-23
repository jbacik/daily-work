import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { ReflectionsInput, WorkSession } from '@/types'
import { getToday } from '@/utils/week'

export const useWorkSessionStore = defineStore('workSession', () => {
  const today = ref<WorkSession | null>(null)

  // Date-keyed cache of sessions, shared by the weekly grid, past-week view, and
  // the daily-view yesterday spark. Every mutation merges the response back in,
  // so all three surfaces refresh from one source.
  // Keys are deleted when a date has no session, so lookups are genuinely optional.
  const sessionsByDate = ref<Record<string, WorkSession | undefined>>({})

  async function fetchWeekSessions(weekOf: string) {
    try {
      const sessions = await client.get('/api/work-sessions/week', { params: { weekOf } }) as any
      for (const s of sessions as WorkSession[]) sessionsByDate.value[s.date] = s
    } catch {
      // Leave the cache as-is; footers fall back to "no entry".
    }
  }

  async function fetchSession(date: string): Promise<WorkSession | null> {
    try {
      const data = await client.get('/api/work-sessions', { params: { date } }) as any
      if (data && data.id) {
        sessionsByDate.value[date] = data as WorkSession
        return data as WorkSession
      }
      delete sessionsByDate.value[date]
      return null
    } catch {
      return null
    }
  }

  function hasReflection(date: string): boolean {
    return sessionsByDate.value[date]?.reflections != null
  }

  // Save reflections for an arbitrary date. The PUT overwrites timestamps, so echo
  // the existing session's (nulls when the day was never clocked) to avoid clobbering.
  async function saveReflectionsForDate(date: string, reflections: ReflectionsInput) {
    // Echo the session's existing timestamps (the PUT overwrites them). Use the cache
    // if present; otherwise fetch inline WITHOUT swallowing errors — a transient GET
    // failure must abort the save, never fall through to null/null and wipe real clock
    // times. A genuine empty response (no session) leaves `existing` undefined, and
    // null/null is then correct: it creates a reflections-only day.
    let existing = sessionsByDate.value[date]
    if (!existing) {
      const data = await client.get('/api/work-sessions', { params: { date } }) as any
      existing = data && data.id ? data as WorkSession : undefined
      if (existing) sessionsByDate.value[date] = existing
    }

    const updated = await client.put('/api/work-sessions', {
      clockedInAt: existing?.clockedInAt ?? null,
      clockedOutAt: existing?.clockedOutAt ?? null,
      reflections,
    }, { params: { date } }) as any
    sessionsByDate.value[date] = updated as WorkSession
    if (date === getToday()) today.value = updated as WorkSession
  }

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

  return {
    today,
    sessionsByDate,
    fetchToday,
    clockIn,
    clockOut,
    punch,
    saveReflections,
    clockOutWithReflections,
    fetchWeekSessions,
    fetchSession,
    hasReflection,
    saveReflectionsForDate,
  }
})
