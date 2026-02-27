<script setup lang="ts">
import { ref } from 'vue'
import { useReadWatchStore } from '@/stores/readWatch'
import ReadWatchItem from './ReadWatchItem.vue'

const store = useReadWatchStore()
const newTitle = ref('')
const newUrl = ref('')
const newType = ref<'read' | 'watch' | 'learn'>('read')

async function add() {
  const title = newTitle.value.trim()
  const url = newUrl.value.trim()
  if (!title || !url) return
  await store.create(title, url, newType.value)
  newTitle.value = ''
  newUrl.value = ''
  newType.value = 'read'
}
</script>

<template>
  <section>
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>cat /queue/reading.txt</span>
    </div>

    <div class="bg-card border border-border">
      <div v-if="store.items.length" class="divide-y divide-border px-4">
        <ReadWatchItem
          v-for="item in store.items"
          :key="item.id"
          :item="item"
        />
      </div>
      <p v-else class="px-4 py-3 text-muted-foreground text-sm">No links yet. Add up to 5.</p>

      <form
        v-if="store.items.length < 5"
        @submit.prevent="add"
        class="flex gap-2 p-3 border-t border-border"
      >
        <select
          v-model="newType"
          class="px-2 py-1.5 border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="read">Read</option>
          <option value="watch">Watch</option>
          <option value="learn">Learn</option>
        </select>
        <input
          v-model="newTitle"
          type="text"
          placeholder="Title"
          class="flex-1 px-3 py-1.5 border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          v-model="newUrl"
          type="url"
          placeholder="https://..."
          class="flex-1 px-3 py-1.5 border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          class="px-3 py-1.5 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
        >
          Add
        </button>
      </form>
    </div>
  </section>
</template>
