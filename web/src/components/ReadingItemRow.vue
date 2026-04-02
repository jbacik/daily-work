<script setup lang="ts">
import type { ReadWatchItem } from '@/types'

const { item, showToggle = false } = defineProps<{
  item: ReadWatchItem
  showToggle?: boolean
}>()

const emit = defineEmits<{
  toggle: [id: number]
  'toggle-active': [id: number]
  delete: [id: number]
}>()

const TYPE_STYLES = {
  read: 'text-red-400',
  watch: 'text-blue-400',
  learn: 'text-green-400',
} as const

const TYPE_LABELS = {
  read: 'READ',
  watch: 'WATCH',
  learn: 'LEARN',
} as const
</script>

<template>
  <div class="flex items-start gap-2 text-sm group py-1">
    <button class="flex-shrink-0" @click="emit('toggle', item.id)">
      <span v-if="item.isDone" class="text-primary">[x]</span>
      <span v-else class="text-muted-foreground">[ ]</span>
    </button>
    <span :class="['text-xs font-medium shrink-0', TYPE_STYLES[item.type || 'read']]">
      {{ TYPE_LABELS[item.type || 'read'] }}
    </span>
    <a
      v-if="item.url"
      :href="item.url"
      target="_blank"
      rel="noopener"
      :class="[
        'flex-1 break-words hover:underline',
        item.isDone ? 'line-through text-muted-foreground' : 'text-foreground',
      ]"
    >
      {{ item.title }}
    </a>
    <span
      v-else
      :class="[
        'flex-1 break-words',
        item.isDone ? 'line-through text-muted-foreground' : 'text-foreground',
      ]"
    >
      {{ item.title }}
    </span>
    <button
      v-if="showToggle && !item.isDone"
      class="text-muted-foreground hover:text-primary text-xs shrink-0"
      @click="emit('toggle-active', item.id)"
    >
      [{{ item.isActive ? '-' : '+' }}]
    </button>
    <button
      class="opacity-0 group-hover:opacity-100 text-destructive text-xs shrink-0"
      @click="emit('delete', item.id)"
    >
      x
    </button>
  </div>
</template>
