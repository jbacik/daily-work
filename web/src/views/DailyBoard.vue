<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'
import { useReadWatchStore } from '@/stores/readWatch'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useScratchPadStore } from '@/stores/scratchPad'
import { DAYS } from '@/utils/week'
import BigThing from '@/components/BigThing.vue'
import DailyTasks from '@/components/DailyTasks.vue'
import WeekOverview from '@/components/WeekOverview.vue'
import ReadWatchList from '@/components/ReadWatchList.vue'
import ScratchPad from '@/components/ScratchPad.vue'

const workItems = useWorkItemsStore()
const readWatch = useReadWatchStore()
const dailyTasks = useDailyTasksStore()
const scratchPad = useScratchPadStore()

const launchTime = new Date() // TODO: live clock planned for later

const currentDayLabel = computed(() => {
  const day = dailyTasks.currentDay
  return day >= 0 && day < 5 ? DAYS[day] : 'N/A'
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
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">
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
          <div class="text-xs text-muted-foreground border border-border p-2 bg-card font-mono">
            <div>┌────────────────────────┐</div>
            <div>│ Week of: {{ dailyTasks.weekOf.padEnd(13) }}│</div>
            <div>│ Day: {{ currentDayLabel.padEnd(18) }}│</div>
            <div>└────────────────────────┘</div>
          </div>
        </div>

        <div class="text-xs text-muted-foreground border-t border-b border-border py-2">
          <span class="text-primary">tip:</span> Click any field to edit • Tasks auto-save • Week resets on Monday
        </div>
      </header>

      <BigThing />
      <WeekOverview />
      <DailyTasks />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReadWatchList />
        <ScratchPad />
      </div>
    </div>
  </div>
</template>
