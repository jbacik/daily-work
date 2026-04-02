<script setup lang="ts">
import { computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useReadWatchStore } from '@/stores/readWatch'

const tasks = useDailyTasksStore()
const readWatch = useReadWatchStore()

const stats = computed(() => {
  var totalTasks = tasks.items.length
  var completedTasks = tasks.items.filter((t) => t.isDone).length
  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '—',
    readingQueue: readWatch.activeItems.length,
    itemsLearned: readWatch.completedItems.length,
  }
})
</script>

<template>
  <div class="border border-border p-4 bg-card">
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>wc -l /stats</span>
    </div>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tasks this week:</span>
        <span class="text-foreground">{{ stats.totalTasks }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tasks completed:</span>
        <span class="text-primary">{{ stats.completedTasks }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Completion rate:</span>
        <span class="text-accent">{{ stats.completionRate }}</span>
      </div>
      <div class="border-t border-border my-2" />
      <div class="flex justify-between">
        <span class="text-muted-foreground">Reading queue:</span>
        <span class="text-foreground">{{ stats.readingQueue }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Items learned:</span>
        <span class="text-accent">{{ stats.itemsLearned }}</span>
      </div>
    </div>
  </div>
</template>
