import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { ReadWatchItem } from '@/types'

export const useReadWatchStore = defineStore('readWatch', () => {
  const items = ref<ReadWatchItem[]>([])

  const activeItems = computed(() => items.value.filter((i) => i.isActive && !i.isDone))
  const backlogItems = computed(() => items.value.filter((i) => !i.isActive && !i.isDone))
  const completedItems = computed(() => items.value.filter((i) => i.isDone))

  async function fetch(date?: string) {
    const params = date ? { date } : {}
    items.value = await client.get('/api/read-watch', { params }) as any
  }

  async function create(title: string, url: string, type: 'read' | 'watch' | 'learn' = 'read') {
    const item: ReadWatchItem = await client.post('/api/read-watch', { title, url, type }) as any
    item.isActive = activeItems.value.length < 5
    items.value.push(item)
  }

  async function update(id: number, data: { title?: string; url?: string; type?: 'read' | 'watch' | 'learn'; isDone?: boolean }) {
    const updated: ReadWatchItem = await client.put(`/api/read-watch/${id}`, data) as any
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) {
      updated.isActive = items.value[idx]!.isActive
      if (data.isDone) updated.isActive = false
      items.value[idx] = updated
    }
  }

  async function remove(id: number) {
    await client.delete(`/api/read-watch/${id}`)
    items.value = items.value.filter((i) => i.id !== id)
  }

  function toggleActive(id: number) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    if (item.isActive) {
      item.isActive = false
    } else if (activeItems.value.length < 5) {
      item.isActive = true
    }
  }

  return { items, activeItems, backlogItems, completedItems, fetch, create, update, remove, toggleActive }
})
