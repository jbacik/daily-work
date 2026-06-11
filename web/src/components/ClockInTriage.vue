<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import type { WorkItem } from '@/types'
import { getToday } from '@/utils/week'

const MONDAY_LINE = 'Case of the Mondays — Go Get Stuff Done — you got this!'

const { items } = defineProps<{
  items: WorkItem[]
}>()

const store = useDailyTasksStore()
const errors = ref<Record<number, string>>({})

const today = getToday()
const todayDow = new Date(`${today}T00:00:00`).getDay()
const isMonday = todayDow === 1

function buildLaterDate(): string {
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() + (todayDow === 5 ? 3 : 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const laterDate = buildLaterDate()

const todayCount = computed(() =>
  store.items.filter(t => t.category === 'SmallThing' && t.date === today).length
)

async function handleToday(id: number) {
  delete errors.value[id]
  try {
    await store.move(id, today)
  } catch (e: any) {
    if (e?.response?.status === 422) {
      errors.value[id] = 'Today is full'
    }
  }
}

async function handleLater(id: number) {
  delete errors.value[id]
  try {
    await store.move(id, laterDate)
  } catch (e: any) {
    if (e?.response?.status === 422) {
      errors.value[id] = 'That day is full'
    }
  }
}

async function handleIgnore(id: number) {
  delete errors.value[id]
  await store.skip(id)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Section header + capacity meter -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-accent">&gt;&gt;&gt;</span>
        <span class="text-xs uppercase tracking-widest text-muted-foreground">Carryover From Yesterday</span>
      </div>
      <span class="text-xs text-muted-foreground font-mono" data-testid="capacity-meter">
        Today:
        <span :class="todayCount >= 5 ? 'text-destructive font-bold' : 'text-foreground'">{{ todayCount }}</span>/5
      </span>
    </div>

    <!-- Monday motivational (no lookback on Mondays) -->
    <div
      v-if="isMonday"
      class="flex items-center gap-2 px-3 py-2 bg-card border border-border text-sm"
      data-testid="monday-line"
    >
      <span class="text-primary">$</span>
      <span class="text-foreground">{{ MONDAY_LINE }}</span>
    </div>

    <!-- Clean-day empty state -->
    <div
      v-else-if="items.length === 0"
      class="flex items-center gap-2 px-3 py-2 bg-card border border-border text-sm"
      data-testid="triage-empty"
    >
      <span class="text-success font-bold">[✓]</span>
      <span class="text-foreground">Yesterday was a clean day — go get more done.</span>
    </div>

    <!-- Triage items -->
    <ul
      v-else
      class="flex flex-col gap-1.5"
      data-testid="triage-list"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="flex flex-col bg-card border border-border"
        :data-testid="`triage-item-${item.id}`"
      >
        <div class="flex items-center gap-3 px-3 py-2">
          <span class="text-muted-foreground">•</span>
          <span class="text-foreground text-sm flex-1">{{ item.title }}</span>
          <button
            type="button"
            class="text-xs text-accent hover:underline font-mono"
            :data-testid="`today-btn-${item.id}`"
            @click="handleToday(item.id)"
          >
            [today]
          </button>
          <button
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground font-mono"
            :data-testid="`later-btn-${item.id}`"
            @click="handleLater(item.id)"
          >
            [later]
          </button>
          <!-- [ignore]: passive let-go of yesterday's residue (clock-in moment). Divergence from [skip] is intentional — see decision 21. -->
          <button
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground font-mono"
            :data-testid="`ignore-btn-${item.id}`"
            @click="handleIgnore(item.id)"
          >
            [ignore]
          </button>
        </div>
        <div
          v-if="errors[item.id]"
          class="px-3 pb-2 text-xs text-destructive"
          :data-testid="`item-error-${item.id}`"
        >
          ! {{ errors[item.id] }}
        </div>
      </li>
    </ul>
  </div>
</template>
