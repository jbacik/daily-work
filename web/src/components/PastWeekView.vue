<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { usePastWeekStore } from '@/stores/pastWeek'
import { DAYS, getDateForDayIndex, formatWeekRange } from '@/utils/week'
import StatsPanel from '@/components/StatsPanel.vue'
import type { WorkItem } from '@/types'

const { weekOf } = defineProps<{ weekOf: string }>()

const store = usePastWeekStore()

const bigThing = computed<WorkItem | null>(
  () => store.workItems.find((i) => i.category === 'BigThing') ?? null
)

function getTasksForDay(dayIndex: number): WorkItem[] {
  const date = getDateForDayIndex(dayIndex, weekOf)
  return store.workItems
    .filter((t) => t.category === 'SmallThing' && t.date === date)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

const consumedLearningsCount = computed(() => store.consumedLearnings.length)

onMounted(() => store.load(weekOf))
watch(() => weekOf, (w) => store.load(w))

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'G') return
  const target = e.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
  }
  if (store.summaryMarkdown) return
  if (store.isGenerating) return
  e.preventDefault()
  store.generateSummary()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="space-y-6 mt-6">
    <div class="text-xs text-muted-foreground">
      <span class="text-primary">$</span> cat ./archive/{{ formatWeekRange(weekOf) }}.log
      <span class="ml-2 text-accent">[readonly]</span>
    </div>

    <!-- Big Thing (read-only) -->
    <div class="border border-border p-4 bg-card" data-testid="past-big-thing">
      <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
        <span class="text-primary">$</span>
        <span>echo $WEEKLY_OBJECTIVE</span>
      </div>
      <div v-if="bigThing" class="text-accent text-lg">{{ bigThing.title }}</div>
      <div v-else class="text-muted-foreground italic text-sm">&lt;no objective set&gt;</div>
    </div>

    <!-- Stats + Tasks grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <span class="text-primary">$</span>
          <span>ls -la /week/tasks/daily/ --readonly</span>
        </div>
        <div class="grid grid-cols-5 gap-2">
          <div
            v-for="(day, dayIndex) in DAYS"
            :key="day"
            class="border border-border/50 bg-muted/30 p-3 min-h-[140px]"
          >
            <div class="text-xs mb-2 text-muted-foreground">{{ day }}</div>
            <div class="space-y-1">
              <div
                v-for="(task, taskIndex) in getTasksForDay(dayIndex)"
                :key="task.id"
                class="flex items-start gap-1 text-xs"
                data-testid="past-task"
              >
                <span
                  v-if="task.isDone"
                  class="flex-shrink-0 text-primary"
                  data-testid="past-task-done"
                >&check;</span>
                <span
                  v-else
                  class="flex-shrink-0 text-muted-foreground"
                  data-testid="past-task-pending"
                >&square;</span>
                <span
                  :class="[
                    'flex-1 break-words',
                    taskIndex === 0 ? 'uppercase text-accent font-bold' : 'text-foreground',
                  ]"
                >
                  {{ task.title }}
                </span>
              </div>
              <div
                v-if="getTasksForDay(dayIndex).length === 0"
                class="text-muted-foreground/50 text-xs"
              >
                &lt;empty&gt;
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <StatsPanel
          :items="store.workItems"
          :reading-queue-count="0"
          :items-learned-count="consumedLearningsCount"
        />
      </div>
    </div>

    <!-- Consumed Learnings -->
    <div class="border border-border p-4 bg-card">
      <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
        <span class="text-primary">$</span>
        <span>cat ./learnings/consumed.tsv</span>
      </div>
      <div v-if="store.consumedLearnings.length === 0" class="text-muted-foreground italic text-sm">
        &lt;nothing consumed this week&gt;
      </div>
      <table v-else class="w-full text-sm" data-testid="consumed-table">
        <thead>
          <tr class="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
            <th class="text-left py-2 pr-4">Title</th>
            <th class="text-left py-2 pr-4">Shareable</th>
            <th class="text-left py-2">Commentary</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in store.consumedLearnings"
            :key="item.id"
            class="border-b border-border/30"
            data-testid="consumed-row"
          >
            <td class="py-2 pr-4 align-top">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener"
                class="text-primary hover:underline"
              >{{ item.title }}</a>
              <span v-else class="text-foreground">{{ item.title }}</span>
            </td>
            <td class="py-2 pr-4 align-top text-foreground">
              {{ item.worthSharing ? 'yes' : 'no' }}
            </td>
            <td class="py-2 align-top text-muted-foreground whitespace-pre-wrap">
              {{ item.notes ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Weekly summary -->
    <div class="border border-border p-4 bg-card" data-testid="summary-section">
      <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
        <span class="text-primary">$</span>
        <span>ai --weekly-summary</span>
      </div>
      <div
        v-if="store.summaryMarkdown"
        class="text-sm text-foreground whitespace-pre-wrap"
        data-testid="summary-markdown"
      >{{ store.summaryMarkdown }}</div>
      <div
        v-else-if="store.isGenerating"
        class="text-sm text-muted-foreground"
        data-testid="summary-generating"
      >
        <span class="animate-pulse">generating weekly summary...</span>
      </div>
      <div
        v-else
        class="text-sm"
        data-testid="summary-prompt"
      >
        <span class="inline-block bg-primary/20 border border-primary px-2 py-1 animate-pulse text-primary">
          [G]enerate a weekly summary
        </span>
      </div>
      <div v-if="store.error" class="text-destructive text-xs mt-2">{{ store.error }}</div>
    </div>
  </div>
</template>
