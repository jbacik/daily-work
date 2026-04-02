<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { DAYS } from '@/utils/week'

const store = useDailyTasksStore()

const newTask = ref('')
const addingForDay = ref<number | null>(null)
const addInputRef = ref<HTMLInputElement | null>(null)

const displayDays = computed(() => {
  const day = store.currentDay
  const yesterday = day - 1
  const tomorrow = day + 1

  return [
    { index: yesterday, label: 'YESTERDAY', shortLabel: yesterday >= 0 && yesterday < 5 ? DAYS[yesterday] : null },
    { index: day, label: 'TODAY', shortLabel: day >= 0 && day < 5 ? DAYS[day] : null },
    { index: tomorrow, label: 'TOMORROW', shortLabel: tomorrow >= 0 && tomorrow < 5 ? DAYS[tomorrow] : null },
  ]
})

function isOutOfRange(index: number) {
  return index < 0 || index >= 5
}

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
      <span>ls -la /tasks/today/</span>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="{ index, label, shortLabel } in displayDays"
        :key="label"
        :class="[
          'border p-4 min-h-[160px]',
          label === 'TODAY'
            ? 'border-primary bg-primary/5'
            : label === 'YESTERDAY'
              ? 'border-border/50 bg-muted/30'
              : 'border-border bg-card',
          isOutOfRange(index) ? 'opacity-50' : '',
        ]"
      >
        <div
          :class="[
            'text-xs mb-3 flex items-center justify-between',
            label === 'TODAY' ? 'text-primary' : 'text-muted-foreground',
          ]"
        >
          <span class="flex items-center gap-1">
            <span v-if="label === 'TODAY'" class="animate-pulse">*</span>
            <span class="font-medium">{{ label }}</span>
            <span v-if="label === 'TODAY'" class="animate-pulse">*</span>
          </span>
          <span v-if="shortLabel" class="text-accent">{{ shortLabel }}</span>
        </div>

        <div v-if="isOutOfRange(index)" class="text-muted-foreground/50 text-xs italic">
          &lt;outside work week&gt;
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="task in store.getTasksForDay(index)"
            :key="task.id"
            class="flex items-start gap-2 text-sm group"
          >
            <button class="flex-shrink-0" @click="toggleTask(task.id, task.isDone)">
              <span v-if="task.isDone" class="text-primary">[x]</span>
              <span v-else class="text-muted-foreground">[ ]</span>
            </button>
            <span
              :class="[
                'flex-1 break-words',
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

          <div v-if="store.getTasksForDay(index).length < 3">
            <div v-if="addingForDay === index" class="flex items-center gap-2">
              <span class="text-primary text-sm">&gt;</span>
              <input
                ref="addInputRef"
                v-model="newTask"
                type="text"
                class="flex-1 bg-transparent border-none outline-none text-foreground text-sm w-full"
                placeholder="task..."
                @keydown.enter="handleAddTask(index)"
                @keydown.escape="cancelAdd"
                @blur="blurAdd(index)"
              />
            </div>
            <button
              v-else
              class="text-muted-foreground hover:text-primary text-sm"
              @click="startAdding(index)"
            >
              + add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
