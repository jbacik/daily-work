<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useWorkSessionStore } from '@/stores/workSession'
import { DAYS, getDateForDayIndex } from '@/utils/week'
import ReflectionModal from '@/components/ReflectionModal.vue'

const store = useDailyTasksStore()
const sessionStore = useWorkSessionStore()

const reflectionDate = ref<string | null>(null)

function dayDate(i: number): string {
  return getDateForDayIndex(i, store.weekOf)
}

onMounted(() => sessionStore.fetchWeekSessions(store.weekOf))

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

          <div class="border-t border-dashed border-border mt-2 pt-1 text-xs">
            <button
              v-if="sessionStore.hasReflection(dayDate(i))"
              class="text-lunch hover:text-accent transition-colors"
              data-testid="reflection-footer"
              @click="reflectionDate = dayDate(i)"
            >
              &#10022; reflection
            </button>
            <span
              v-else
              class="text-muted-foreground"
              data-testid="reflection-footer-empty"
            >
              &mdash; no entry
            </span>
          </div>
        </div>
      </div>

      <div class="text-xs text-muted-foreground space-y-1">
        <div class="flex items-center gap-4">
          <span><span class="text-primary">&#9679;</span> complete</span>
          <span><span class="text-accent">&#9680;</span> partial</span>
          <span><span class="text-muted-foreground">&#9675;</span> pending</span>
          <span><span class="text-muted-foreground/50">&#9472;</span> empty</span>
          <span><span class="text-lunch">&#10022;</span> reflection saved</span>
        </div>
      </div>
    </div>

    <ReflectionModal
      :is-open="reflectionDate !== null"
      :date="reflectionDate ?? ''"
      mode="view"
      @close="reflectionDate = null"
    />
  </div>
</template>
