<script setup lang="ts">
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { DAYS } from '@/utils/week'

const store = useDailyTasksStore()

function getStats(day: number) {
  const dayTasks = store.getTasksForDay(day)
  return {
    completed: dayTasks.filter(t => t.isDone).length,
    total: dayTasks.length,
  }
}

function getStatus(i: number): string {
  const { completed, total } = getStats(i)
  const isPast = i < store.currentDay
  const isToday = i === store.currentDay

  if (isPast) {
    if (total === 0) return '\u2500'
    if (completed === total) return '\u25CF'
    return '\u25D0'
  }
  if (isToday) {
    return total > 0 ? (completed === total ? '\u25CF' : '\u25D0') : '\u25CB'
  }
  return '\u25CB'
}

function getStatusClass(i: number): string {
  const { completed, total } = getStats(i)
  const isPast = i < store.currentDay
  const isToday = i === store.currentDay

  if (isPast) {
    if (total === 0) return 'text-muted-foreground/50'
    if (completed === total) return 'text-primary'
    return 'text-accent'
  }
  if (isToday) return 'text-primary animate-pulse'
  return 'text-muted-foreground'
}
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>./status.sh --week</span>
    </div>

    <div class="border border-border p-4 bg-card">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-accent">&gt;&gt;&gt;</span>
        <span class="text-muted-foreground text-xs uppercase tracking-wider">
          Week at a Glance
        </span>
      </div>

      <div class="flex gap-1 mb-4">
        <div
          v-for="(day, i) in DAYS"
          :key="day"
          :class="[
            'flex-1 text-center py-2 border',
            i === store.currentDay
              ? 'border-primary bg-primary/10'
              : 'border-border',
          ]"
        >
          <div :class="['text-xs', i === store.currentDay ? 'text-primary' : 'text-muted-foreground']">
            {{ day }}
          </div>
          <div :class="['text-lg', getStatusClass(i)]">
            {{ getStatus(i) }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ getStats(i).total > 0 ? `${getStats(i).completed}/${getStats(i).total}` : '\u2014' }}
          </div>
        </div>
      </div>

      <div class="text-xs text-muted-foreground space-y-1">
        <div class="flex items-center gap-4">
          <span><span class="text-primary">&#9679;</span> complete</span>
          <span><span class="text-accent">&#9680;</span> partial</span>
          <span><span class="text-muted-foreground">&#9675;</span> pending</span>
          <span><span class="text-muted-foreground/50">&#9472;</span> empty</span>
        </div>
      </div>
    </div>
  </div>
</template>
