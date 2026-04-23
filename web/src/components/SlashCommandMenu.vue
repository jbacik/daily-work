<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { CommandType } from '@/types'
import { getRecentWeekStarts, formatWeekRange, getWeekStart } from '@/utils/week'

const emit = defineEmits<{
  command: [type: CommandType]
  archive: [weekOf: string]
}>()

const isOpen = ref(false)
const archiveOpen = ref(false)
const panelRef = ref<HTMLDivElement | null>(null)

const currentWeekStart = getWeekStart()
const recentWeeks = getRecentWeekStarts(5)

function weekLabel(index: number): string {
  if (index === 0) return 'This Week [current]'
  if (index === 1) return 'Last Week'
  return `${index} Weeks Ago`
}

function handleCommandClick(type: CommandType) {
  isOpen.value = false
  archiveOpen.value = false
  emit('command', type)
}

function toggleArchive() {
  archiveOpen.value = !archiveOpen.value
}

function selectWeek(weekOf: string) {
  isOpen.value = false
  archiveOpen.value = false
  emit('archive', weekOf)
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
    if (!isOpen.value) archiveOpen.value = false
    return
  }

  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault()
    isOpen.value = false
    archiveOpen.value = false
  }
}

function handleClickOutside(e: MouseEvent) {
  if (isOpen.value && panelRef.value && !panelRef.value.contains(e.target as Node)) {
    isOpen.value = false
    archiveOpen.value = false
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
      :class="isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'"
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

          <button
            data-testid="cmd-evaluate-my-week"
            class="w-full text-left px-2 py-1 hover:bg-secondary/50 transition-colors"
            @click="handleCommandClick('evaluate-my-week')"
          >
            <span class="text-accent">/evaluate-my-week</span>
            <span class="text-muted-foreground"> - analyze your calendar week with AI</span>
          </button>

          <button
            data-testid="cmd-archive"
            class="w-full text-left px-2 py-1 hover:bg-secondary/50 transition-colors"
            @click="toggleArchive"
          >
            <span class="text-accent">/archive</span>
            <span class="text-muted-foreground"> - browse past weeks</span>
          </button>

          <!-- Archive submenu -->
          <div
            v-if="archiveOpen"
            class="ml-2 mt-1 border-l border-border pl-3 space-y-1"
            data-testid="archive-submenu"
          >
            <div class="text-muted-foreground mb-2 font-mono text-xs">
              <span class="text-primary">$</span> ls -la ./weeks/<br>
              <span class="text-muted-foreground">drwxr-xr-x archives/</span>
            </div>
            <button
              v-for="(week, i) in recentWeeks"
              :key="week"
              class="w-full text-left px-1 py-0.5 hover:bg-secondary/50 transition-colors flex items-center gap-2 font-mono text-xs"
              :data-testid="`archive-week-${i}`"
              @click="selectWeek(week)"
            >
              <span class="text-accent w-2">{{ i === 0 ? '>' : ' ' }}</span>
              <span :class="i === 0 ? 'text-foreground' : 'text-muted-foreground'">
                {{ formatWeekRange(week) }}
              </span>
              <span class="ml-auto" :class="i === 0 ? 'text-accent' : 'text-muted-foreground'">
                {{ weekLabel(i) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
