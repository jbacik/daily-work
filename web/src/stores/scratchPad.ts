import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import { getWeekStart } from '@/utils/week'

export const useScratchPadStore = defineStore('scratchPad', () => {
  const content = ref('')
  const weekOf = ref(getWeekStart())

  async function fetch(week?: string) {
    const targetWeek = week ?? getWeekStart()
    weekOf.value = targetWeek
    try {
      const data = await client.get('/api/scratchpad', {
        params: { weekOf: targetWeek }
      }) as any
      content.value = data?.content ?? ''
    } catch {
      content.value = ''
    }
  }

  async function save() {
    await client.put('/api/scratchpad', {
      content: content.value,
      weekOf: weekOf.value
    })
  }

  function setContent(value: string) {
    content.value = value
  }

  return { content, weekOf, fetch, save, setContent }
})
