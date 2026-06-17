<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkSessionStore } from '@/stores/workSession'
import ClockCeremonyModal from '@/components/ClockCeremonyModal.vue'

const store = useWorkSessionStore()

const ceremonyOpen = ref(false)
const ceremonyMode = ref<'in' | 'out'>('in')

const state = computed<'not-in' | 'in' | 'out'>(() => {
  const session = store.today
  if (!session || (session.clockedInAt === null && session.clockedOutAt === null)) return 'not-in'
  if (session.clockedOutAt !== null) return 'out'
  return 'in'
})

const clockedInTime = computed(() => formatTime(store.today?.clockedInAt ?? null))
const clockedOutTime = computed(() => formatTime(store.today?.clockedOutAt ?? null))

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function handleClockIn() {
  if (state.value !== 'not-in') return
  ceremonyMode.value = 'in'
  ceremonyOpen.value = true
}

function handleClockOut() {
  if (state.value !== 'in') return
  ceremonyMode.value = 'out'
  ceremonyOpen.value = true
}

function handleCeremonyClose() {
  ceremonyOpen.value = false
}

onMounted(() => {
  store.fetchToday()
})
</script>

<template>
  <button
    v-if="state === 'not-in'"
    type="button"
    class="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
    data-testid="clock-status-not-in"
    @click="handleClockIn"
  >
    <span class="text-primary">$</span>
    <span>clock-in</span>
    <span class="inline-block w-[0.5em] h-[0.9em] bg-foreground align-text-bottom ml-1 animate-blink"></span>
  </button>

  <div
    v-else-if="state === 'in'"
    class="flex items-center gap-2 text-muted-foreground text-sm"
    data-testid="clock-status-in"
  >
    <span class="text-primary">$</span>
    <span>Grind started @</span>
    <span class="text-accent" data-testid="clock-status-in-time">{{ clockedInTime }}</span>
    <button
      type="button"
      class="text-primary hover:text-foreground ml-2"
      data-testid="clock-out-btn"
      @click="handleClockOut"
    >
      <span class="text-muted-foreground">[</span> clock out <span class="text-muted-foreground">]</span>
    </button>
  </div>

  <div
    v-else
    class="flex items-center gap-2 text-muted-foreground text-sm"
    data-testid="clock-status-out"
  >
    <span class="text-primary">$</span>
    <span>Nice work</span>
    <span class="text-muted-foreground">—</span>
    <span v-if="clockedInTime" class="text-accent" data-testid="clock-status-out-in-time">{{ clockedInTime }}</span>
    <span v-if="clockedInTime" class="text-muted-foreground">→</span>
    <span class="text-accent" data-testid="clock-status-out-time">{{ clockedOutTime }}</span>
  </div>

  <ClockCeremonyModal
    :is-open="ceremonyOpen"
    :mode="ceremonyMode"
    @close="handleCeremonyClose"
  />
</template>
