import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import type { ReadWatchItem } from '@/types'

export const useReadWatchStore = defineStore('readWatch', () => {
  const items = ref<ReadWatchItem[]>([])

  const activeItems = computed(() => items.value.filter((i) => i.isActive && !i.isDone))
  const backlogItems = computed(() => items.value.filter((i) => !i.isActive && !i.isDone))
  const completedItems = computed(() => items.value.filter((i) => i.isDone))

  async function fetch(params?: { weekOf?: string }) {
    items.value = await client.get('/api/read-watch', { params }) as any
  }

  async function create(text: string, type: ReadWatchItem['type'] = 'Read') {
    const item: ReadWatchItem = await client.post('/api/read-watch', { text, type }) as any
    items.value.push(item)
  }

  async function update(id: number, data: { title?: string; url?: string; isActive?: boolean }) {
    const updated: ReadWatchItem = await client.put(`/api/read-watch/${id}`, data) as any
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function toggleActive(id: number) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    await update(id, { isActive: !item.isActive })
  }

  async function consume(id: number, data: { worthSharing: boolean; notes: string; weekOf: string }) {
    const updated: ReadWatchItem = await client.put(`/api/read-watch/${id}/consume`, data) as any
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function remove(id: number) {
    await client.delete(`/api/read-watch/${id}`)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, activeItems, backlogItems, completedItems, fetch, create, update, toggleActive, consume, remove }
})
