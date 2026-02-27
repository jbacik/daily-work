import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { WorkItem } from '@/types'

export const useWorkItemsStore = defineStore('workItems', () => {
  const items = ref<WorkItem[]>([])

  const bigThing = computed(() =>
    items.value.find((i) => i.category === 'BigThing') ?? null
  )

  async function fetch(date?: string) {
    const params = date ? { date } : {}
    items.value = await client.get('/api/work-items', { params }) as any
  }

  async function create(title: string) {
    const item: WorkItem = await client.post('/api/work-items', {
      title,
      category: 'BigThing'
    }) as any
    items.value.push(item)
  }

  async function update(id: number, data: { title?: string; isDone?: boolean }) {
    const updated: WorkItem = await client.put(`/api/work-items/${id}`, data) as any
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function remove(id: number) {
    await client.delete(`/api/work-items/${id}`)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, bigThing, fetch, create, update, remove }
})
