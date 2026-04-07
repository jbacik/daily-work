<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'
import { useReadWatchStore } from '@/stores/readWatch'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useScratchPadStore } from '@/stores/scratchPad'
import { DAYS } from '@/utils/week'
import type { CommandType } from '@/types'
import BigThing from '@/components/BigThing.vue'
import DailyTasks from '@/components/DailyTasks.vue'
import DailyTasksCompact from '@/components/DailyTasksCompact.vue'
import WeekOverview from '@/components/WeekOverview.vue'
import ReadWatchList from '@/components/ReadWatchList.vue'
import ScratchPad from '@/components/ScratchPad.vue'
import StatsPanel from '@/components/StatsPanel.vue'
import SlashCommandMenu from '@/components/SlashCommandMenu.vue'
import CommandModal from '@/components/CommandModal.vue'

type ViewMode = 'daily' | 'weekly'

const workItems = useWorkItemsStore()
const readWatch = useReadWatchStore()
const dailyTasks = useDailyTasksStore()
const scratchPad = useScratchPadStore()

const launchTime = new Date()
const view = ref<ViewMode>('daily')
const activeCommand = ref<CommandType | null>(null)

const modalTitle = computed(() => {
  switch (activeCommand.value) {
    case 'standup': return '// DAILY STANDUP'
    case 'weekly': return '// WEEKLY ROUNDUP'
    default: return ''
  }
})

function handleCommand(type: CommandType) {
  activeCommand.value = type
}

const currentDayLabel = computed((): string => {
  const day = dailyTasks.currentDay
  return day >= 0 && day < 5 ? DAYS[day]! : 'N/A'
})

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

onMounted(() => {
  workItems.fetch()
  readWatch.fetch()
  dailyTasks.fetch()
  scratchPad.fetch()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <header class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 class="text-2xl text-primary flex items-center gap-2">
              <span class="text-accent">$</span>
              <span>TODO.sh</span>
              <span class="text-muted-foreground text-sm">v1.0.0</span>
            </h1>
            <p class="text-muted-foreground text-sm mt-1">
              Weekly task tracker // {{ formatDate(launchTime) }} {{ formatTime(launchTime) }}
            </p>
          </div>

          <!-- Navigation Box -->
          <div class="text-xs text-muted-foreground border border-border p-2 bg-card font-mono w-fit">
            <div>┌────────────────────────────┐</div>
            <button
              type="button"
              class="flex w-full hover:bg-secondary/50 transition-colors"
              :aria-pressed="view === 'weekly'"
              @click="view = 'weekly'"
            >
              <span class="text-accent w-4">{{ view === 'weekly' ? '~' : ' ' }}</span>
              <span> Week of: {{ dailyTasks.weekOf }}</span>
              <span class="ml-auto">│</span>
            </button>
            <button
              type="button"
              class="flex w-full hover:bg-secondary/50 transition-colors"
              :aria-pressed="view === 'daily'"
              @click="view = 'daily'"
            >
              <span class="text-accent w-4">{{ view === 'daily' ? '~' : ' ' }}</span>
              <span> Day: {{ currentDayLabel }}</span>
              <span class="ml-auto">│</span>
            </button>
            <div>└────────────────────────────┘</div>
          </div>
        </div>

        <div class="text-xs text-muted-foreground border-t border-b border-border py-2">
          <span class="text-primary">tip:</span> Click Week/Day above to switch views • Tasks auto-save locally • Press / for more actions
        </div>
      </header>

      <SlashCommandMenu @command="handleCommand" />

      <BigThing />

      <CommandModal
        :is-open="activeCommand !== null"
        :title="modalTitle"
        :command-type="activeCommand"
        :week-of="dailyTasks.weekOf"
        @close="activeCommand = null"
      />

      <!-- Daily View -->
      <main v-if="view === 'daily'" class="space-y-6 mt-6">
        <DailyTasksCompact />
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScratchPad />
          <ReadWatchList />
        </div>
      </main>

      <!-- Weekly View -->
      <main v-if="view === 'weekly'" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div class="lg:col-span-2 space-y-6">
          <WeekOverview />
          <DailyTasks />
          <ReadWatchList :default-show-all="true" />
        </div>
        <div class="space-y-6">
          <StatsPanel />
          <ScratchPad />
        </div>
      </main>

      <!-- Footer -->
      <footer class="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
        <div class="flex items-center justify-center gap-2">
          <span>───</span>
          <span>EOF</span>
          <span>───</span>
        </div>
      </footer>
    </div>
  </div>
</template>
