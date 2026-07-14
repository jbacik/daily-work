<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { DAYS, getCarriedDays, getDayLabel } from '@/utils/week'
import type { WorkItem } from '@/types'

const store = useDailyTasksStore()

// Carried-through ghost rows per day column, computed once per render.
const ghostsByDay = computed(() => DAYS.map((_, i) => store.getGhostTasksForDay(i)))

const newTask = ref('')
const addingForDay = ref<number | null>(null)
const addInputRef = ref<HTMLInputElement | null>(null)

function startAdding(day: number) {
  addingForDay.value = day
  nextTick(() => {
    const el = addInputRef.value
    if (Array.isArray(el)) el[0]?.focus()
    else el?.focus()
  })
}

function cancelAdd() {
  newTask.value = ''
  addingForDay.value = null
}

function blurAdd(day: number) {
  if (newTask.value.trim()) handleAddTask(day)
  else cancelAdd()
}

async function handleAddTask(day: number) {
  if (!newTask.value.trim()) return
  if (store.getTasksForDay(day).length >= 3) return

  await store.create(newTask.value.trim(), day)
  newTask.value = ''
  addingForDay.value = null
}

async function toggleTask(id: number, currentDone: boolean) {
  await store.update(id, { isDone: !currentDone })
}

async function deleteTask(id: number) {
  await store.remove(id)
}

function carriedDays(task: WorkItem): number {
  return getCarriedDays(task.originalDate, task.date)
}
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>ls -la /week/tasks/daily/</span>
    </div>

    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="(day, dayIndex) in DAYS"
        :key="day"
        :class="[
          'border p-3 min-h-[140px]',
          dayIndex === store.currentDay
            ? 'border-primary bg-primary/5'
            : dayIndex < store.currentDay
              ? 'border-border/50 bg-muted/30'
              : 'border-border bg-card',
        ]"
      >
        <div
          :class="[
            'text-xs mb-2 flex items-center gap-1',
            dayIndex === store.currentDay ? 'text-primary' : 'text-muted-foreground',
          ]"
        >
          <span v-if="dayIndex === store.currentDay" class="animate-pulse">*</span>
          <span>{{ day }}</span>
          <span v-if="dayIndex === store.currentDay" class="animate-pulse">*</span>
        </div>

        <div class="space-y-1">
          <div
            v-for="(task, taskIndex) in store.getTasksForDay(dayIndex)"
            :key="task.id"
            class="flex items-start gap-1 text-sm group"
          >
            <button class="flex-shrink-0 w-4 text-left" @click="toggleTask(task.id, task.isDone)">
              <span v-if="task.isDone" class="text-primary">[x]</span>
              <span v-else class="text-muted-foreground">[ ]</span>
            </button>
            <span
              :class="[
                'flex-1 break-words text-xs',
                taskIndex === 0 ? 'uppercase text-accent font-bold' : '',
                task.isDone ? 'line-through text-muted-foreground' : 'text-foreground',
              ]"
            >
              {{ task.title }}
            </span>
            <span
              v-if="carriedDays(task) > 0"
              class="flex-shrink-0 self-center text-[10.5px] leading-none whitespace-nowrap text-accent border border-accent/50 bg-accent/5 px-1.5 py-0.5"
              :title="`carried ${carriedDays(task)} day${carriedDays(task) > 1 ? 's' : ''}`"
              data-testid="carry-badge"
            >
              &#8635; {{ carriedDays(task) }}d
            </span>
            <button
              class="opacity-0 group-hover:opacity-100 text-destructive text-xs"
              @click="deleteTask(task.id)"
            >
              x
            </button>
          </div>

          <div v-if="store.getTasksForDay(dayIndex).length < 3">
            <div v-if="addingForDay === dayIndex" class="flex items-center gap-1">
              <span class="text-primary text-xs">&gt;</span>
              <input
                ref="addInputRef"
                v-model="newTask"
                type="text"
                class="flex-1 bg-transparent border-none outline-none text-foreground text-xs w-full"
                placeholder="task..."
                @keydown.enter="handleAddTask(dayIndex)"
                @keydown.escape="cancelAdd"
                @blur="blurAdd(dayIndex)"
              />
            </div>
            <button
              v-else
              class="text-muted-foreground hover:text-primary text-xs"
              @click="startAdding(dayIndex)"
            >
              + add
            </button>
          </div>
        </div>

        <!-- Carried-through breadcrumb: read-only trail of tasks passing through this day -->
        <div
          v-if="ghostsByDay[dayIndex].length > 0"
          class="mt-3 pt-2 border-t border-dashed border-border"
          data-testid="ghost-section"
        >
          <div class="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/80 mb-1.5">
            carried through
          </div>
          <div
            v-for="ghost in ghostsByDay[dayIndex]"
            :key="`${ghost.id}-ghost`"
            class="grid grid-cols-[1fr_auto] gap-1.5 items-baseline pl-3.5 text-xs text-muted-foreground"
            data-testid="ghost-row"
          >
            <span class="break-words">
              <span class="text-muted-foreground/70">&middot;</span> {{ ghost.title }}
            </span>
            <span class="text-[10.5px] opacity-80 whitespace-nowrap">
              &rarr; {{ getDayLabel(ghost.date) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
