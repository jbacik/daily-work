<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import type { WorkItem } from '@/types'
import { DAYS, getToday, getCurrentDayIndex, getDateForDayIndex } from '@/utils/week'

interface DayOption {
  label: string
  date: string
  count: number
  full: boolean
}

const { items } = defineProps<{
  items: WorkItem[]
}>()

const store = useDailyTasksStore()
const errors = ref<Record<number, string>>({})
const openPicker = ref<Record<number, boolean>>({})

const today = getToday()
const currentDay = getCurrentDayIndex()

function titleCase(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase()
}

function capacityFor(date: string): { count: number; full: boolean } {
  const count = store.items.filter(t => t.category === 'SmallThing' && t.date === date).length
  return { count, full: count >= 5 }
}

// Forward target days: remaining weekdays this week, plus Mon-next on Friday/weekend.
const dayOptions = computed<DayOption[]>(() => {
  const opts: DayOption[] = []
  if (currentDay >= 0 && currentDay < 4) {
    for (let i = currentDay + 1; i <= 4; i++) {
      const date = getDateForDayIndex(i, store.weekOf)
      opts.push({ label: titleCase(DAYS[i]), date, ...capacityFor(date) })
    }
  }
  if (currentDay >= 4 || currentDay < 0) {
    const date = getDateForDayIndex(7, store.weekOf) // Monday next week
    opts.push({ label: 'Mon next', date, ...capacityFor(date) })
  }
  return opts
})

// [tomorrow] target: next weekday (Mon-next when today is Friday).
const tomorrowDate = computed(() => {
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() + (d.getDay() === 5 ? 3 : 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

async function moveTo(id: number, date: string) {
  delete errors.value[id]
  try {
    await store.move(id, date)
    openPicker.value[id] = false
  } catch (e: any) {
    if (e?.response?.status === 422) {
      errors.value[id] = 'Day is full — rearrange first'
    }
  }
}

function handleTomorrow(id: number) {
  moveTo(id, tomorrowDate.value)
}

function handleDay(id: number, date: string) {
  moveTo(id, date)
}

// [skip]: active decision on today's residue (clock-out moment). Divergence from [ignore] is intentional — see decision 21.
async function handleSkip(id: number) {
  delete errors.value[id]
  await store.skip(id)
}

function togglePicker(id: number) {
  openPicker.value[id] = !openPicker.value[id]
}
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="clock-out-triage">
    <!-- Section header -->
    <div class="flex items-center gap-2">
      <span class="text-accent">&gt;&gt;&gt;</span>
      <span class="text-xs uppercase tracking-widest text-muted-foreground">Leftovers From Today</span>
    </div>

    <!-- Empty state -->
    <div
      v-if="items.length === 0"
      class="flex items-center gap-2 px-3 py-2 bg-card border border-border text-sm"
      data-testid="out-triage-empty"
    >
      <span class="text-success font-bold">[✓]</span>
      <span class="text-foreground">All today's items wrapped. Nice work.</span>
    </div>

    <!-- Triage items -->
    <ul
      v-else
      class="flex flex-col gap-1.5"
      data-testid="out-triage-list"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="flex flex-col bg-card border border-border"
        :data-testid="`out-triage-item-${item.id}`"
      >
        <div class="flex items-center gap-3 px-3 py-2">
          <span class="text-muted-foreground">•</span>
          <span class="text-foreground text-sm flex-1">{{ item.title }}</span>

          <button
            type="button"
            class="text-xs text-accent hover:underline font-mono"
            :data-testid="`tomorrow-btn-${item.id}`"
            @click="handleTomorrow(item.id)"
          >
            [tomorrow]
          </button>

          <!-- Single forward option collapses to a direct button (decision 15) -->
          <button
            v-if="dayOptions.length === 1"
            type="button"
            class="text-xs font-mono"
            :class="dayOptions[0].full ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'"
            :disabled="dayOptions[0].full"
            :data-testid="`day-btn-${item.id}`"
            @click="handleDay(item.id, dayOptions[0].date)"
          >
            [{{ dayOptions[0].label }}]
          </button>
          <button
            v-else
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground font-mono"
            :data-testid="`day-btn-${item.id}`"
            @click="togglePicker(item.id)"
          >
            [day...]
          </button>

          <!-- [skip]: active decision on today's residue (clock-out moment). Divergence from [ignore] is intentional — see decision 21. -->
          <button
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground font-mono"
            :data-testid="`skip-btn-${item.id}`"
            @click="handleSkip(item.id)"
          >
            [skip]
          </button>
        </div>

        <!-- Day picker chip strip -->
        <div
          v-if="openPicker[item.id] && dayOptions.length > 1"
          class="flex flex-wrap items-center gap-2 px-3 pb-2"
          :data-testid="`day-picker-${item.id}`"
        >
          <button
            v-for="(opt, i) in dayOptions"
            :key="opt.date"
            type="button"
            class="text-xs font-mono px-2 py-1 border"
            :class="opt.full
              ? 'border-border text-muted-foreground/40 cursor-not-allowed'
              : 'border-border text-foreground hover:border-primary'"
            :disabled="opt.full"
            :data-testid="`day-chip-${item.id}-${i}`"
            @click="handleDay(item.id, opt.date)"
          >
            {{ opt.label }}
            <span :class="opt.count >= 5 ? 'text-accent font-bold' : 'text-muted-foreground'">{{ opt.count }}/5</span>
          </button>
        </div>

        <!-- Inline soft-refuse error -->
        <div
          v-if="errors[item.id]"
          class="px-3 pb-2 text-xs text-destructive"
          :data-testid="`out-item-error-${item.id}`"
        >
          ! {{ errors[item.id] }}
        </div>
      </li>
    </ul>

    <!-- Week capacity preview -->
    <div
      v-if="items.length > 0 && dayOptions.length > 0"
      class="flex flex-wrap gap-7 px-3 py-2 bg-card border border-border text-sm text-muted-foreground"
      data-testid="week-capacity"
    >
      <span
        v-for="(opt, i) in dayOptions"
        :key="opt.date"
        :data-testid="`week-cap-day-${i}`"
      >
        {{ opt.label }}
        <span :class="opt.count >= 5 ? 'text-accent font-bold' : 'text-foreground'">{{ opt.count }}</span>
      </span>
    </div>
  </div>
</template>
