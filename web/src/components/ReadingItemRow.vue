<script setup lang="ts">
import type { ReadWatchItem } from '@/types'

const { item, showActions = true } = defineProps<{
  item: ReadWatchItem
  showActions?: boolean
}>()

const emit = defineEmits<{
  consume: [id: number]
  'toggle-active': [id: number]
  review: [id: number]
  delete: [id: number]
}>()

const TYPE_EMOJI = {
  Read: '📔',
  Watch: '📺',
  Learn: '🎓',
  Experiment: '🧪',
} as const
</script>

<template>
  <div class="flex items-start gap-2 text-sm group py-1">
    <button
      v-if="!item.isDone && showActions"
      data-testid="consume-btn"
      class="flex-shrink-0"
      @click="emit('consume', item.id)"
    >
      <span class="text-muted-foreground">[ ]</span>
    </button>
    <span v-if="item.isDone" class="flex-shrink-0 text-primary">[x]</span>
    <span data-testid="type-emoji" class="shrink-0">
      {{ TYPE_EMOJI[item.type] || '📔' }}
    </span>
    <a
      v-if="item.url"
      :href="item.url"
      target="_blank"
      rel="noopener"
      data-testid="item-link"
      :class="[
        'flex-1 break-words hover:underline',
        item.isDone ? 'line-through text-muted-foreground' : 'text-foreground',
      ]"
    >
      {{ item.title }}
    </a>
    <span
      v-else
      data-testid="item-text"
      :class="[
        'flex-1 break-words',
        item.isDone ? 'line-through text-muted-foreground' : 'text-foreground',
      ]"
    >
      {{ item.title }}
    </span>
    <button
      v-if="item.isDone && showActions"
      data-testid="review-btn"
      class="text-muted-foreground hover:text-primary text-xs shrink-0"
      @click="emit('review', item.id)"
    >
      [review]
    </button>
    <button
      v-if="!item.isDone && showActions"
      data-testid="toggle-active-btn"
      class="text-muted-foreground hover:text-primary text-xs shrink-0"
      @click="emit('toggle-active', item.id)"
    >
      [{{ item.isActive ? 'backlog' : 'activate' }}]
    </button>
    <button
      v-if="showActions"
      data-testid="delete-btn"
      class="opacity-0 group-hover:opacity-100 text-destructive text-xs shrink-0"
      @click="emit('delete', item.id)"
    >
      x
    </button>
  </div>
</template>
