<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { AxiosError } from 'axios'
import { useWorkSessionStore } from '@/stores/workSession'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import ClockInTriage from '@/components/ClockInTriage.vue'
import { getToday, getPreviousWorkday } from '@/utils/week'

const EMPLOYEE_NAME = 'Jared Bacik'
const EMPLOYEE_ID = '20210628'
const COMPANY = 'VIRTUOUS'

const { isOpen, mode } = defineProps<{
  isOpen: boolean
  mode: 'in' | 'out'
}>()

const emit = defineEmits<{
  close: []
}>()

const workSessionStore = useWorkSessionStore()
const dailyTasksStore = useDailyTasksStore()

const busy = ref(false)
const terminalError = ref('')
const animState = ref<'idle' | 'running' | 'done' | 'failed'>('idle')

const today = getToday()

const todayLabel = today

const previousWorkday = getPreviousWorkday()

const triageItems = computed(() => {
  if (!previousWorkday) return []
  return dailyTasksStore.items.filter(t =>
    t.category === 'SmallThing' &&
    t.date === previousWorkday &&
    !t.isDone &&
    !t.isSkipped
  )
})

const slotLabel = computed(() => {
  if (animState.value === 'running') return 'scanning...'
  if (animState.value === 'done') return '✓ punched'
  return 'insert card'
})

function runAnimation() {
  animState.value = 'running'
}

async function finishAnimation() {
  animState.value = 'done'
  await new Promise<void>(r => setTimeout(r, 600))
}

function cancelAnimation() {
  animState.value = 'failed'
  setTimeout(() => { animState.value = 'idle' }, 250)
}

async function handleSubmit() {
  if (busy.value) return
  busy.value = true
  terminalError.value = ''
  runAnimation()
  try {
    if (mode === 'in') {
      await workSessionStore.clockIn()
    } else {
      await workSessionStore.clockOut()
    }
    await finishAnimation()
    emit('close')
  } catch (e) {
    cancelAnimation()
    const status = (e as AxiosError).response?.status ?? '?'
    terminalError.value = `! clock-${mode} failed: HTTP ${status}`
    busy.value = false
  }
}

function handleClose() {
  if (busy.value) return
  emit('close')
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    handleClose()
    return
  }
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  const key = e.key.toLowerCase()
  if (key === 'c') {
    e.preventDefault()
    handleSubmit()
  } else if (key === 'e') {
    e.preventDefault()
    handleClose()
  }
}

watch(() => isOpen, async (open) => {
  if (open) {
    terminalError.value = ''
    animState.value = 'idle'
    busy.value = false
    await dailyTasksStore.fetch()
  }
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="ceremony-overlay"
      @click.self="handleClose"
    >
      <div
        class="w-[60vw] max-h-[80vh] bg-card border-4 border-double border-primary flex flex-col"
        data-testid="ceremony-modal"
      >
        <!-- Header -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider text-xs uppercase" data-testid="ceremony-header">
            // clock-{{ mode }}.ceremony · {{ todayLabel }}
          </span>
        </div>

        <!-- Body -->
        <div class="flex-1 bg-background px-8 py-7 flex flex-col gap-6 overflow-y-auto">
          <!-- Punch card slot -->
          <div class="flex flex-col" data-testid="punch-card-slot">
            <div class="h-3 opacity-35" style="background: repeating-linear-gradient(90deg, var(--color-muted-foreground) 0px, var(--color-muted-foreground) 2px, transparent 2px, transparent 6px);"></div>
            <div class="h-10 flex items-center px-3.5 bg-card border-y border-border">
              <span
                class="text-muted-foreground text-xs uppercase tracking-widest"
                :class="{ 'animate-pulse': animState === 'running' }"
                data-testid="slot-label"
              >
                {{ slotLabel }}
              </span>
              <span class="flex-1" />
              <span class="text-muted-foreground text-xs tracking-widest">{{ EMPLOYEE_NAME }} · {{ EMPLOYEE_ID }} · {{ COMPANY }}</span>
            </div>
            <div class="h-3 opacity-35" style="background: repeating-linear-gradient(90deg, var(--color-muted-foreground) 0px, var(--color-muted-foreground) 2px, transparent 2px, transparent 6px);"></div>
          </div>

          <!-- Triage (clock-in mode) -->
          <ClockInTriage
            v-if="mode === 'in'"
            :items="triageItems"
          />

          <!-- Terminal error -->
          <div
            v-if="terminalError"
            class="text-destructive text-xs font-mono"
            data-testid="terminal-error"
          >
            {{ terminalError }}
          </div>
        </div>

        <!-- Footer action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <button
            type="button"
            class="font-mono text-sm hover:opacity-75 transition-opacity disabled:opacity-40"
            :disabled="busy"
            data-testid="submit-btn"
            @click="handleSubmit"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">C</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground">lock {{ mode === 'in' ? 'In' : 'Out' }}</span>
          </button>
          <button
            type="button"
            class="font-mono text-sm hover:opacity-75 transition-opacity"
            data-testid="exit-btn"
            @click="handleClose"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">E</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground">xit</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
