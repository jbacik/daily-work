<script setup lang="ts">
import { computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useReadWatchStore } from '@/stores/readWatch'

const tasks = useDailyTasksStore()
const readWatch = useReadWatchStore()

const stats = computed(() => {
  const smallItems = tasks.items.filter((t) => t.category === 'SmallThing')

  const minSortOrderByDate = new Map<string, number>()
  for (const item of smallItems) {
    const current = minSortOrderByDate.get(item.date)
    if (current === undefined || item.sortOrder < current)
      minSortOrderByDate.set(item.date, item.sortOrder)
  }

  const oneThings = smallItems.filter((t) => t.sortOrder === minSortOrderByDate.get(t.date))
  const smallerThings = smallItems.filter((t) => t.sortOrder !== minSortOrderByDate.get(t.date))

  const totalOneThings = oneThings.length
  const completedOneThings = oneThings.filter((t) => t.isDone).length
  const totalSmallerThings = smallerThings.length
  const completedSmallerThings = smallerThings.filter((t) => t.isDone).length

  return {
    oneThingSummary: totalOneThings > 0 ? `${completedOneThings}/${totalOneThings}` : '—',
    smallerThingsSummary: totalSmallerThings > 0 ? `${completedSmallerThings}/${totalSmallerThings}` : '—',
    completionRate: totalOneThings > 0 ? `${Math.round((completedOneThings / totalOneThings) * 100)}%` : '—',
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
        <span class="text-muted-foreground">Daily One Things:</span>
        <span data-testid="one-thing-summary" class="text-foreground">{{ stats.oneThingSummary }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Daily Smaller Things:</span>
        <span data-testid="smaller-things-summary" class="text-foreground">{{ stats.smallerThingsSummary }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">One Thing rate:</span>
        <span data-testid="completion-rate" class="text-accent">{{ stats.completionRate }}</span>
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
