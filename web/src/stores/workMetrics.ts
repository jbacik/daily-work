import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import { getWeekStart } from '@/utils/week'
import type { WorkMetricDefinition, WorkMetricEntry, WorkMetricWeekSummary } from '@/types'

function messageFrom(e: any, fallback: string): string {
  const data = e?.response?.data
  if (typeof data === 'string' && data) return data
  return data?.detail ?? e?.message ?? fallback
}

export const useWorkMetricsStore = defineStore('workMetrics', () => {
  const weekOf = ref(getWeekStart())
  // Sourced from /definitions/all — the management card lists retired ones too.
  const definitions = ref<WorkMetricDefinition[]>([])
  const entries = ref<WorkMetricEntry[]>([])
  const weeks = ref<WorkMetricWeekSummary[]>([])
  const historyEntries = ref<Record<string, WorkMetricEntry[]>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // /weeks includes the live week; the read-only listing shows only what's behind us.
  const pastWeeks = computed(() => weeks.value.filter((w) => w.weekOf !== weekOf.value))

  async function fetchAll() {
    weekOf.value = getWeekStart()
    isLoading.value = true
    error.value = null
    try {
      definitions.value = await client.get('/api/work-metrics/definitions/all') as any
      // Fetching the current week is what seeds pending entries for active definitions.
      entries.value = await client.get('/api/work-metrics/entries', {
        params: { weekOf: weekOf.value },
      }) as any
      weeks.value = await client.get('/api/work-metrics/weeks') as any
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to load work metrics')
    } finally {
      isLoading.value = false
    }
  }

  async function addDefinition(title: string) {
    error.value = null
    try {
      const created = await client.post('/api/work-metrics/definitions', { title }) as any
      definitions.value.push(created)
      // A new active definition seeds into the current week on the next read.
      entries.value = await client.get('/api/work-metrics/entries', {
        params: { weekOf: weekOf.value },
      }) as any
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to add definition')
    }
  }

  async function updateDefinition(id: number, patch: Partial<Pick<WorkMetricDefinition, 'title' | 'isActive' | 'sortOrder'>>) {
    error.value = null
    try {
      const updated = await client.put(`/api/work-metrics/definitions/${id}`, patch) as any
      const index = definitions.value.findIndex((d) => d.id === id)
      if (index !== -1) definitions.value.splice(index, 1, updated)
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to update definition')
    }
  }

  async function removeDefinition(id: number) {
    error.value = null
    try {
      await client.delete(`/api/work-metrics/definitions/${id}`)
      const index = definitions.value.findIndex((d) => d.id === id)
      if (index !== -1) definitions.value.splice(index, 1)
      // Entries survive the delete — they just become ad-hoc rows.
      entries.value = entries.value.map((e) =>
        e.definitionId === id ? { ...e, definitionId: null } : e)
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to delete definition')
    }
  }

  async function addEntry(title: string) {
    error.value = null
    try {
      const created = await client.post('/api/work-metrics/entries', {
        weekOf: weekOf.value,
        title,
        value: null,
      }) as any
      entries.value.push(created)
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to add entry')
    }
  }

  async function saveEntryValue(id: number, value: string | null) {
    error.value = null
    try {
      // An empty string clears the value back to <pending>; null would mean "leave it".
      const updated = await client.put(`/api/work-metrics/entries/${id}`, {
        value: value ?? '',
      }) as any
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) entries.value.splice(index, 1, updated)
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to save entry')
    }
  }

  async function removeEntry(id: number) {
    error.value = null
    try {
      await client.delete(`/api/work-metrics/entries/${id}`)
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) entries.value.splice(index, 1)
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to delete entry')
    }
  }

  async function loadWeekHistory(week: string) {
    if (historyEntries.value[week]) return
    error.value = null
    try {
      historyEntries.value[week] = await client.get('/api/work-metrics/entries', {
        params: { weekOf: week },
      }) as any
    } catch (e: any) {
      error.value = messageFrom(e, 'Failed to load week history')
    }
  }

  return {
    weekOf,
    definitions,
    entries,
    weeks,
    historyEntries,
    isLoading,
    error,
    pastWeeks,
    fetchAll,
    addDefinition,
    updateDefinition,
    removeDefinition,
    addEntry,
    saveEntryValue,
    removeEntry,
    loadWeekHistory,
  }
})
