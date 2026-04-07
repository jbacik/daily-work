import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'

export const useScratchPadStore = defineStore('scratchPad', () => {
  const content = ref('')

  async function fetch() {
    try {
      const data = await client.get('/api/scratchpad') as any
      content.value = data?.content ?? ''
    } catch {
      content.value = ''
    }
  }

  async function save() {
    await client.put('/api/scratchpad', { content: content.value })
  }

  async function clean() {
    try {
      await client.post('/api/scratchpad/clean', {})
      content.value = ''
    } catch {
      // Do not clear content if the request failed
    }
  }

  function setContent(value: string) {
    content.value = value
  }

  return { content, fetch, save, clean, setContent }
})
