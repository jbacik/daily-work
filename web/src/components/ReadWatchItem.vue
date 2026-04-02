<script setup lang="ts">
import type { ReadWatchItem } from '@/types'
import { useReadWatchStore } from '@/stores/readWatch'

const { item } = defineProps<{ item: ReadWatchItem }>()
const store = useReadWatchStore()

const TYPE_STYLES = {
  read: 'bg-red-100 text-red-700',
  watch: 'bg-blue-100 text-blue-700',
  learn: 'bg-green-100 text-green-700',
} as const

const TYPE_LABELS = {
  read: 'READ',
  watch: 'WATCH',
  learn: 'LEARN',
} as const
</script>

<template>
  <div class="flex items-center gap-3 py-2">
    <input
      type="checkbox"
      :checked="item.isDone"
      class="w-4 h-4 accent-primary shrink-0"
      @change="store.update(item.id, { isDone: !item.isDone })"
    />
    <span
      :class="[
        'text-xs font-medium px-1.5 py-0.5 shrink-0',
        TYPE_STYLES[item.type || 'read']
      ]"
    >
      {{ TYPE_LABELS[item.type || 'read'] }}
    </span>
    <a
      :href="item.url"
      target="_blank"
      rel="noopener"
      class="flex-1 text-primary hover:underline truncate"
      :class="{ 'line-through opacity-50': item.isDone }"
    >
      {{ item.title }}
    </a>
    <button
      class="text-destructive/50 hover:text-destructive"
      title="Delete"
      @click="store.remove(item.id)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>
