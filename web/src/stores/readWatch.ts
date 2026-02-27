import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import type { ReadWatchItem } from '@/types'

export const useReadWatchStore = defineStore('readWatch', () => {
  const items = ref<ReadWatchItem[]>([])

  async function fetch(date?: string) {
    const params = date ? { date } : {}
    items.value = await client.get('/api/read-watch', { params }) as any
  }

  async function create(title: string, url: string, type: 'read' | 'watch' | 'learn' = 'read') {
    const item: ReadWatchItem = await client.post('/api/read-watch', { title, url, type }) as any
    items.value.push(item)
  }

  async function update(id: number, data: { title?: string; url?: string; type?: 'read' | 'watch' | 'learn'; isDone?: boolean }) {
    const updated: ReadWatchItem = await client.put(`/api/read-watch/${id}`, data) as any
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }

  async function remove(id: number) {
    await client.delete(`/api/read-watch/${id}`)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, fetch, create, update, remove }
})
