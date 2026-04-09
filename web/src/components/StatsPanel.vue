<script setup lang="ts">
import { computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useReadWatchStore } from '@/stores/readWatch'

const tasks = useDailyTasksStore()
const readWatch = useReadWatchStore()

const stats = computed(() => {
  const bigItems = tasks.items.filter((t) => t.category === 'BigThing')
  const smallItems = tasks.items.filter((t) => t.category === 'SmallThing')
  const totalBig = bigItems.length
  const completedBig = bigItems.filter((t) => t.isDone).length
  const totalSmall = smallItems.length
  const completedSmall = smallItems.filter((t) => t.isDone).length
  return {
    totalBig,
    completedBig,
    bigSummary: totalBig > 0 ? `${completedBig}/${totalBig}` : '—',
    totalSmall,
    completedSmall,
    smallSummary: totalSmall > 0 ? `${completedSmall}/${totalSmall}` : '—',
    completionRate: totalSmall > 0 ? `${Math.round((completedSmall / totalSmall) * 100)}%` : '—',
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
        <span class="text-muted-foreground">BIG (weekly):</span>
        <span
          data-testid="big-summary"
          :class="stats.totalBig > 0 && stats.completedBig === stats.totalBig ? 'text-primary' : 'text-foreground'"
        >{{ stats.bigSummary }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">SMALL (daily):</span>
        <span data-testid="small-summary" class="text-foreground">{{ stats.smallSummary }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Daily completion:</span>
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
