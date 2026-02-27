import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { DailyTask } from '@/types'
import { getWeekStart, getCurrentDayIndex } from '@/utils/week'

export const useDailyTasksStore = defineStore('dailyTasks', () => {
  const items = ref<DailyTask[]>([])
  const weekOf = ref(getWeekStart())
  const currentDay = computed(() => getCurrentDayIndex())

  function getTasksForDay(day: number) {
    return items.value.filter(t => t.day === day)
  }

  async function fetch(week?: string) {
    const targetWeek = week ?? getWeekStart()
    weekOf.value = targetWeek
    console.log('🪃 Fetching tasks for week of', targetWeek);
    items.value = await client.get('/api/daily-tasks', {
      params: { weekOf: targetWeek }
    }) as any
  }

  async function create(title: string, day: number) {
    const task: DailyTask = await client.post('/api/daily-tasks', {
      title,
      day,
      weekOf: weekOf.value
    }) as any
    items.value.push(task)
  }

  async function update(id: number, data: { title?: string; isDone?: boolean; day?: number }) {
    const updated: DailyTask = await client.put(`/api/daily-tasks/${id}`, data) as any
    const idx = items.value.findIndex(t => t.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function remove(id: number) {
    await client.delete(`/api/daily-tasks/${id}`)
    items.value = items.value.filter(t => t.id !== id)
  }

  return { items, weekOf, currentDay, getTasksForDay, fetch, create, update, remove }
})
