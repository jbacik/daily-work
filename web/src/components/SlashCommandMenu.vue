<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { CommandType } from '@/types'

const emit = defineEmits<{
  command: [type: CommandType]
}>()

const isOpen = ref(false)
const panelRef = ref<HTMLDivElement | null>(null)

function handleCommandClick(type: CommandType) {
  isOpen.value = false
  emit('command', type)
}

function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const isInputField =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable

  if (e.key === '/' && !isInputField) {
    e.preventDefault()
    isOpen.value = !isOpen.value
    return
  }

  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault()
    isOpen.value = false
  }
}

function handleClickOutside(e: MouseEvent) {
  if (isOpen.value && panelRef.value && !panelRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="panelRef">
    <div
      class="overflow-hidden transition-all duration-200 ease-out"
      :class="isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="border border-border p-4 bg-card mt-1 mb-4" data-testid="slash-menu-panel">
        <div class="text-xs text-muted-foreground mb-3">
          <span class="text-accent">&gt;&gt;&gt;</span> slash commands
        </div>

        <div class="space-y-2">
          <button
            data-testid="cmd-standup"
            class="w-full text-left px-2 py-1 hover:bg-secondary/50 transition-colors"
            @click="handleCommandClick('standup')"
          >
            <span class="text-accent">/standup</span>
            <span class="text-muted-foreground"> - generate your daily geekbot</span>
          </button>

          <button
            data-testid="cmd-weekly"
            class="w-full text-left px-2 py-1 hover:bg-secondary/50 transition-colors"
            @click="handleCommandClick('weekly')"
          >
            <span class="text-accent">/weekly</span>
            <span class="text-muted-foreground"> - generate your weekly lattice update</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
