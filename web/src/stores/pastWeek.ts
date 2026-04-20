import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { WorkItem, ReadWatchItem } from '@/types'

export const usePastWeekStore = defineStore('pastWeek', () => {
  const weekOf = ref<string | null>(null)
  const workItems = ref<WorkItem[]>([])
  const consumedLearnings = ref<ReadWatchItem[]>([])
  const summaryMarkdown = ref<string | null>(null)
  const isLoading = ref(false)
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  async function load(week: string) {
    weekOf.value = week
    isLoading.value = true
    error.value = null
    summaryMarkdown.value = null
    try {
      workItems.value = await client.get('/api/work-items', { params: { weekOf: week } }) as any
      const rw = await client.get('/api/read-watch', { params: { weekOf: week } }) as any
      consumedLearnings.value = (rw as ReadWatchItem[]).filter((i) => i.isDone && i.weekConsumed === week)

      try {
        const existing = await client.get('/api/standup', {
          params: { date: week, commandType: 'weekly-summary' },
        }) as any
        summaryMarkdown.value = existing?.markdown ?? null
      } catch {
        summaryMarkdown.value = null
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load past week'
    } finally {
      isLoading.value = false
    }
  }

  async function generateSummary() {
    if (!weekOf.value || isGenerating.value) return
    isGenerating.value = true
    error.value = null
    try {
      const result = await client.post(
        `/api/standup/generate-weekly-summary?weekOf=${weekOf.value}`
      ) as any
      summaryMarkdown.value = result?.markdown ?? ''
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to generate weekly summary'
    } finally {
      isGenerating.value = false
    }
  }

  return {
    weekOf,
    workItems,
    consumedLearnings,
    summaryMarkdown,
    isLoading,
    isGenerating,
    error,
    load,
    generateSummary,
  }
})
