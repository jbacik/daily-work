<script setup lang="ts">
import { ref } from 'vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import { formatWeekRange } from '@/utils/week'

const store = useWorkMetricsStore()

// Single open week — an inline accordion, not a master/detail split.
const openWeek = ref<string | null>(null)

async function toggle(weekOf: string) {
  if (openWeek.value === weekOf) {
    openWeek.value = null
    return
  }
  openWeek.value = weekOf
  await store.loadWeekHistory(weekOf)
}
</script>

<template>
  <section>
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>ls -la ./metrics/ --readonly</span>
    </div>

    <div class="bg-card border border-border px-4 py-1">
      <p
        v-if="store.pastWeeks.length === 0"
        class="text-muted-foreground text-sm italic py-3"
        data-testid="metrics-history-empty"
      >
        &lt;no prior weeks&gt;
      </p>

      <div
        v-for="week in store.pastWeeks"
        :key="week.weekOf"
        class="border-b border-dashed border-border last:border-b-0"
        data-testid="metrics-history-week"
      >
        <button
          type="button"
          class="group flex w-full items-baseline gap-3 py-2.5 text-left"
          data-testid="metrics-history-toggle"
          @click="toggle(week.weekOf)"
        >
          <span class="text-muted-foreground/70 w-[3ch]">[{{ openWeek === week.weekOf ? '−' : '+' }}]</span>
          <span class="text-foreground text-sm group-hover:text-accent transition-colors">
            {{ formatWeekRange(week.weekOf) }}
          </span>
          <span class="ml-auto text-muted-foreground/70 text-xs">
            {{ week.filledCount }}/{{ week.entryCount }} filled
          </span>
        </button>

        <div v-if="openWeek === week.weekOf" class="pl-[3ch] pb-3.5" data-testid="metrics-history-body">
          <div class="text-muted-foreground/70 text-[10.5px] tracking-wide mb-1.5">
            [readonly]
          </div>
          <div
            v-for="entry in store.historyEntries[week.weekOf] ?? []"
            :key="entry.id"
            class="py-2 border-b border-dashed border-border last:border-b-0"
            data-testid="metrics-history-entry"
          >
            <div class="text-muted-foreground text-xs uppercase tracking-wider font-bold">
              {{ entry.title }}
            </div>
            <div class="mt-1 pl-4 text-sm text-foreground">
              <span v-if="entry.value === null" class="text-muted-foreground/70 italic">
                &lt;pending&gt;
              </span>
              <span v-else class="whitespace-pre-wrap">
                {{ entry.value }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
