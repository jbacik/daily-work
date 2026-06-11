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
const cardState = ref<'' | 'inserting' | 'ejecting' | 'cancelling'>('')
const scanning = ref(false)
const scanPass = ref(0)
const litUpTo = ref(-1)
const isFlashing = ref(false)
// Bumped to abort any in-flight animation sequence (retry, cancel, reopen)
let animToken = 0
let runPromise: Promise<void> | null = null

const HOLE_PATTERN = [1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,
                      1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,0,1]

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
  // While running/failed the card occupies the slot — no label
  if (animState.value === 'running' || animState.value === 'failed') return ''
  if (animState.value === 'done') return '✓ punched'
  return 'insert card'
})

const employeeNameFormatted = computed(() => {
  const parts = EMPLOYEE_NAME.trim().split(' ')
  const last = parts.pop()!.toUpperCase()
  const first = parts.join(' ').toUpperCase()
  return `${last}, ${first} · ${COMPANY}`
})

const cardStyle = computed(() => {
  switch (cardState.value) {
    case 'inserting':
      return { transform: 'translateY(-50%) translateX(0)', transition: 'transform 0.65s cubic-bezier(0.3, 0, 0.2, 1)' }
    case 'ejecting':
      return { transform: 'translateY(-50%) translateX(-120vw)', transition: 'transform 0.45s cubic-bezier(0.6, 0, 1, 0.4)' }
    case 'cancelling':
      // Decision 20: ~250ms ease-out, card returns to slot
      return { transform: 'translateY(-50%) translateX(120vw)', transition: 'transform 0.25s ease-out' }
    default:
      return { transform: 'translateY(-50%) translateX(120vw)', transition: 'none' }
  }
})

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function runAnimation() {
  const token = ++animToken
  animState.value = 'running'
  cardState.value = ''
  litUpTo.value = -1
  await wait(40)
  if (token !== animToken) return
  cardState.value = 'inserting'
  await wait(680)
  if (token !== animToken) return
  scanning.value = true
  for (let pass = 0; pass < 3; pass++) {
    scanPass.value++
    litUpTo.value = Math.floor((pass / 2) * HOLE_PATTERN.length)
    await wait(200)
    if (token !== animToken) return
  }
  scanning.value = false
  litUpTo.value = -1
}

async function finishAnimation() {
  // Optimistic timing (decision 12): save resolved while the card was
  // inserting/scanning — let the run sequence complete before ejecting
  if (runPromise) await runPromise
  animToken++
  scanning.value = false
  litUpTo.value = -1
  animState.value = 'done'
  cardState.value = 'ejecting'
  await wait(480)
  isFlashing.value = true
  await wait(220)
}

function cancelAnimation() {
  animToken++
  scanning.value = false
  litUpTo.value = -1
  animState.value = 'failed'
  cardState.value = 'cancelling'
  setTimeout(() => {
    animState.value = 'idle'
    cardState.value = ''
  }, 250)
}

async function handleSubmit() {
  if (busy.value) return
  busy.value = true
  terminalError.value = ''
  isFlashing.value = false
  runPromise = runAnimation()
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
    animToken++
    terminalError.value = ''
    animState.value = 'idle'
    cardState.value = ''
    scanning.value = false
    litUpTo.value = -1
    isFlashing.value = false
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
        <div
          class="flex-1 bg-background px-8 py-7 flex flex-col gap-6 overflow-y-auto"
          :class="{ 'animate-success-flash': isFlashing }"
        >
          <!-- Punch card slot -->
          <div class="flex flex-col" data-testid="punch-card-slot">
            <div class="h-3 opacity-35" style="background: repeating-linear-gradient(90deg, var(--color-muted-foreground) 0px, var(--color-muted-foreground) 2px, transparent 2px, transparent 6px);"></div>
            <div class="relative h-12 flex items-center px-3.5 bg-card border-y border-border overflow-hidden">
              <span class="text-muted-foreground text-xs uppercase tracking-widest" data-testid="slot-label">
                {{ slotLabel }}
              </span>
              <span class="flex-1" />
              <span class="text-muted-foreground text-xs tracking-widest">{{ EMPLOYEE_NAME }} · {{ EMPLOYEE_ID }} · {{ COMPANY }}</span>

              <!-- Scan beam -->
              <div
                v-if="scanning"
                :key="scanPass"
                class="absolute inset-y-0 w-[3px] bg-accent z-30 animate-scan-sweep"
                data-testid="scan-beam"
              ></div>

              <!-- Punch card -->
              <div class="absolute inset-0 pointer-events-none z-20">
                <div
                  class="absolute top-1/2 left-[60px] w-[420px] h-10 bg-card border border-border flex items-stretch overflow-hidden"
                  :style="cardStyle"
                  data-testid="punch-card"
                >
                  <div class="w-2.5 bg-background border-r border-border shrink-0"></div>
                  <div class="flex flex-col justify-between px-2 py-[3px] flex-1 overflow-hidden">
                    <div class="text-[9px] tracking-wider text-accent whitespace-nowrap">
                      EMP-ID: {{ EMPLOYEE_ID }} · {{ COMPANY }} · 2026
                    </div>
                    <div class="flex gap-[3px] items-center">
                      <div
                        v-for="(punched, i) in HOLE_PATTERN"
                        :key="i"
                        class="w-[5px] h-2 border shrink-0 transition-colors"
                        :class="punched
                          ? (litUpTo >= i ? 'bg-accent border-accent' : 'bg-foreground border-foreground')
                          : 'bg-transparent border-border'"
                      ></div>
                    </div>
                    <div class="text-[9px] text-muted-foreground whitespace-nowrap tracking-wide">
                      {{ employeeNameFormatted }}
                    </div>
                  </div>
                </div>
              </div>
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
