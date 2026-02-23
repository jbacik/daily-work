<script setup lang="ts">
import type { ReadWatchItem } from '@/types'
import { useReadWatchStore } from '@/stores/readWatch'

defineProps<{ item: ReadWatchItem }>()
const store = useReadWatchStore()
</script>

<template>
  <div class="flex items-center gap-3 py-2">
    <input
      type="checkbox"
      :checked="item.isDone"
      class="w-4 h-4 accent-indigo-500 shrink-0"
      @change="store.update(item.id, { isDone: !item.isDone })"
    />
    <a
      :href="item.url"
      target="_blank"
      rel="noopener"
      class="flex-1 text-indigo-600 hover:underline truncate"
      :class="{ 'line-through opacity-50': item.isDone }"
    >
      {{ item.title }}
    </a>
    <button
      class="text-red-300 hover:text-red-500"
      title="Delete"
      @click="store.remove(item.id)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>
