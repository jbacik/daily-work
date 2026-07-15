<script setup lang="ts">
import { computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { getCarriedDays } from '@/utils/week'
import type { WorkItem } from '@/types'

const store = useDailyTasksStore()

const tasks = computed(() => store.getTasksForDay(store.currentDay))

function carriedDays(task: WorkItem): number {
  return getCarriedDays(task.originalDate, task.date)
}
</script>

<template>
  <div class="bg-card border border-border p-4" data-testid="tasks-panel">
    <div class="flex items-baseline justify-between border-b border-dashed border-border pb-2 mb-4">
      <span class="text-accent font-bold uppercase tracking-wider">Today's Tasks</span>
      <span class="text-muted-foreground text-xs">from main view &middot; read-only</span>
    </div>

    <div v-if="tasks.length === 0" class="text-muted-foreground text-sm italic">
      &lt;no tasks for today&gt;
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(task, taskIndex) in tasks"
        :key="task.id"
        class="flex items-baseline gap-2 text-sm"
        data-testid="planning-task-row"
      >
        <span
          :class="[
            'flex-1 break-words',
            taskIndex === 0 ? 'uppercase text-accent font-bold' : '',
            task.isDone ? 'line-through text-muted-foreground' : taskIndex === 0 ? '' : 'text-foreground',
          ]"
          data-testid="planning-task-title"
        >
          {{ task.title }}
        </span>
        <span
          v-if="taskIndex === 0"
          class="flex-shrink-0 self-center text-[10.5px] leading-none whitespace-nowrap text-accent border border-accent/50 bg-accent/5 px-1.5 py-0.5"
          data-testid="one-thing-badge"
        >
          one thing
        </span>
        <span
          v-if="carriedDays(task) > 0"
          class="flex-shrink-0 self-center text-[10.5px] leading-none whitespace-nowrap text-accent border border-accent/50 bg-accent/5 px-1.5 py-0.5"
          :title="`carried ${carriedDays(task)} day${carriedDays(task) > 1 ? 's' : ''}`"
          data-testid="carry-badge"
        >
          &#8635; {{ carriedDays(task) }}d
        </span>
      </div>
    </div>

    <div class="text-xs text-muted-foreground mt-3">
      &#8635; carried over
    </div>
  </div>
</template>
