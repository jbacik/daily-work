<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useWorkSessionStore } from '@/stores/workSession'
import { DAYS, getCarriedDays, getDayLabel, getYesterday } from '@/utils/week'
import ReflectionModal from '@/components/ReflectionModal.vue'
import type { WorkItem } from '@/types'

const store = useDailyTasksStore()
const sessionStore = useWorkSessionStore()

const yesterdayDate = getYesterday()
const reflectionOpen = ref(false)

onMounted(() => sessionStore.fetchSession(yesterdayDate))

const newTask = ref('')
const addingForDay = ref<number | null>(null)
const addInputRef = ref<HTMLInputElement | null>(null)
const editingTaskId = ref<number | null>(null)
const editingValue = ref('')
const editOriginalValue = ref('')

const displayDays = computed(() => {
  const day = store.currentDay

  return [
    { index: day - 1, label: 'YESTERDAY' },
    { index: day, label: 'TODAY' },
    { index: day + 1, label: 'TOMORROW' },
  ].map(({ index, label }) => ({
    index,
    label,
    shortLabel: index >= 0 && index < 5 ? DAYS[index] : null,
    ghosts: store.getGhostTasksForDay(index),
  }))
})

function isOutOfRange(index: number) {
  return index < 0 || index >= 5
}

function isEditable(label: string) {
  return label === 'TODAY' || label === 'TOMORROW'
}

function carriedDays(task: WorkItem): number {
  return getCarriedDays(task.originalDate, task.date)
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
  if (store.getTasksForDay(day).length >= 5) return

  await store.create(newTask.value.trim(), day)
  newTask.value = ''

  // Stay in add mode if still room
  if (store.getTasksForDay(day).length < 5) {
    nextTick(() => {
      const el = addInputRef.value
      if (Array.isArray(el)) el[0]?.focus()
      else el?.focus()
    })
  } else {
    addingForDay.value = null
  }
}

async function toggleTask(id: number, currentDone: boolean) {
  await store.update(id, { isDone: !currentDone })
}

async function deleteTask(id: number) {
  if (editingTaskId.value === id) cancelEdit()
  await store.remove(id)
}

async function moveUp(id: number) {
  await store.moveUp(id)
}

async function moveDown(id: number) {
  await store.moveDown(id)
}

function startEdit(id: number, currentTitle: string) {
  editingTaskId.value = id
  editingValue.value = currentTitle
  editOriginalValue.value = currentTitle
}

const saveEditDebounced = useDebounceFn(async () => {
  if (editingTaskId.value === null) return
  await store.update(editingTaskId.value, { title: editingValue.value })
}, 500)

function onEditInput() {
  if (editingTaskId.value === null) return
  saveEditDebounced()
}

async function commitEdit() {
  if (editingTaskId.value === null) return
  const id = editingTaskId.value
  editingTaskId.value = null
  if (editingValue.value.trim()) {
    await store.update(id, { title: editingValue.value.trim() })
  }
}

function cancelEdit() {
  editingTaskId.value = null
  editingValue.value = editOriginalValue.value
}
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>ls -la /tasks/today/</span>
    </div>

    <div class="grid gap-3" style="grid-template-columns: 1fr 2fr 1fr">
      <div
        v-for="{ index, label, shortLabel, ghosts } in displayDays"
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
          <span class="flex items-center gap-1.5">
            <button
              v-if="label === 'YESTERDAY'"
              class="text-lunch hover:text-accent transition-colors"
              :title="sessionStore.hasReflection(yesterdayDate) ? 'view/edit reflection' : 'add reflection'"
              data-testid="yesterday-spark"
              @click="reflectionOpen = true"
            >
              {{ sessionStore.hasReflection(yesterdayDate) ? '✦' : '✧' }}
            </button>
            <span v-if="shortLabel" class="text-accent">{{ shortLabel }}</span>
          </span>
        </div>

        <div v-if="isOutOfRange(index)" class="text-muted-foreground/50 text-xs italic">
          &lt;outside work week&gt;
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(task, taskIndex) in store.getTasksForDay(index)"
            :key="task.id"
            class="flex items-start gap-2 text-sm group"
          >
            <button
              class="flex-shrink-0"
              data-testid="task-toggle"
              @click="toggleTask(task.id, task.isDone)"
            >
              <span v-if="task.isDone" class="text-primary">[x]</span>
              <span v-else class="text-muted-foreground">[ ]</span>
            </button>

            <!-- Inline edit input (today + tomorrow only) -->
            <input
              v-if="editingTaskId === task.id"
              v-model="editingValue"
              type="text"
              class="flex-1 bg-transparent border-none outline-none text-foreground text-sm w-full"
              data-testid="task-title-input"
              @input="onEditInput"
              @keydown.enter.prevent="commitEdit"
              @keydown.escape.prevent="cancelEdit"
              @blur="commitEdit"
            />
            <span
              v-else
              :class="[
                'flex-1 break-words',
                taskIndex === 0 ? 'uppercase text-accent font-bold' : '',
                taskIndex >= 3 ? 'text-muted-foreground/60' : task.isDone ? 'text-muted-foreground' : 'text-foreground',
                task.isDone ? 'line-through' : '',
                isEditable(label) ? 'cursor-text' : '',
              ]"
              data-testid="task-title"
              @click="isEditable(label) ? startEdit(task.id, task.title) : undefined"
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

            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <template v-if="isEditable(label)">
                <button
                  :disabled="taskIndex === 0"
                  class="text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  data-testid="task-move-up"
                  aria-label="Move task up"
                  @click="moveUp(task.id)"
                >
                  ^
                </button>
                <button
                  :disabled="taskIndex === store.getTasksForDay(index).length - 1"
                  class="text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  data-testid="task-move-down"
                  aria-label="Move task down"
                  @click="moveDown(task.id)"
                >
                  v
                </button>
              </template>
              <button
                class="text-destructive text-xs"
                data-testid="task-delete"
                @click="deleteTask(task.id)"
              >
                x
              </button>
            </div>
          </div>

          <div v-if="store.getTasksForDay(index).length < 5">
            <div v-if="addingForDay === index" class="flex items-center gap-2">
              <span class="text-primary text-sm">&gt;</span>
              <input
                ref="addInputRef"
                v-model="newTask"
                type="text"
                class="flex-1 bg-transparent border-none outline-none text-foreground text-sm w-full"
                data-testid="add-task-input"
                placeholder="task..."
                @keydown.enter.prevent="handleAddTask(index)"
                @keydown.escape="cancelAdd"
                @blur="blurAdd(index)"
              />
            </div>
            <button
              v-else
              :class="[
                'text-sm',
                store.getTasksForDay(index).length >= 3
                  ? 'text-accent hover:text-accent/80'
                  : 'text-muted-foreground hover:text-primary',
              ]"
              data-testid="add-task-btn"
              @click="startAdding(index)"
            >
              + add
            </button>
          </div>

          <!-- Carried-through breadcrumb: read-only trail of tasks passing through this column -->
          <div
            v-if="ghosts.length > 0"
            class="mt-3 pt-2 border-t border-dashed border-border"
            data-testid="ghost-section"
          >
            <div class="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/80 mb-1.5">
              carried through
            </div>
            <div
              v-for="ghost in ghosts"
              :key="`${ghost.id}-ghost`"
              class="grid grid-cols-[1fr_auto] gap-2 items-baseline pl-3.5 text-sm text-muted-foreground"
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

    <ReflectionModal
      :is-open="reflectionOpen"
      :date="yesterdayDate"
      mode="edit"
      @close="reflectionOpen = false"
    />
  </div>
</template>
