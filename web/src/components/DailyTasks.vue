<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { DAYS } from '@/utils/week'

const store = useDailyTasksStore()

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
      </div>
    </div>
  </div>
</template>
