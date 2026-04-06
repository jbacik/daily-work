import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { WorkItem } from '@/types'
import { getWeekStart, getCurrentDayIndex, getDateForDayIndex } from '@/utils/week'

export const useDailyTasksStore = defineStore('dailyTasks', () => {
  const items = ref<WorkItem[]>([])
  const weekOf = ref(getWeekStart())
  const currentDay = computed(() => getCurrentDayIndex())

  function getTasksForDay(day: number) {
    const date = getDateForDayIndex(day, weekOf.value)
    return items.value.filter(t => t.category === 'SmallThing' && t.date === date)
  }

  async function fetch(week?: string) {
    const targetWeek = week ?? getWeekStart()
    weekOf.value = targetWeek
    items.value = await client.get('/api/work-items', {
      params: { weekOf: targetWeek }
    }) as any
  }

  async function create(title: string, day: number) {
    const date = getDateForDayIndex(day, weekOf.value)
    const task: WorkItem = await client.post('/api/work-items', {
      title,
      date,
      category: 'SmallThing',
    }) as any
    items.value.push(task)
  }

  async function update(id: number, data: { title?: string; isDone?: boolean }) {
    const updated: WorkItem = await client.put(`/api/work-items/${id}`, data) as any
    const idx = items.value.findIndex(t => t.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function remove(id: number) {
    await client.delete(`/api/work-items/${id}`)
    items.value = items.value.filter(t => t.id !== id)
  }

  return { items, weekOf, currentDay, getTasksForDay, fetch, create, update, remove }
})
