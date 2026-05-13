<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useWorkSessionStore } from '@/stores/workSession'
import { getToday } from '@/utils/week'

const { isOpen } = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useWorkSessionStore()

const startHH = ref('')
const startMM = ref('')
const endHH = ref('')
const endMM = ref('')
const errorMsg = ref('')
const startHHRef = ref<HTMLInputElement | null>(null)

function isoToLocalParts(iso: string | null | undefined): { hh: string; mm: string } {
  if (!iso) return { hh: '', mm: '' }
  const d = new Date(iso)
  return {
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  }
}

function populate() {
  const start = isoToLocalParts(store.today?.clockedInAt)
  const end = isoToLocalParts(store.today?.clockedOutAt)
  startHH.value = start.hh
  startMM.value = start.mm
  endHH.value = end.hh
  endMM.value = end.mm
  errorMsg.value = ''
}

function clearStart() {
  startHH.value = ''
  startMM.value = ''
}

function clearEnd() {
  endHH.value = ''
  endMM.value = ''
}

function buildLocalDate(hhStr: string, mmStr: string): Date {
  const hh = parseInt(hhStr, 10)
  const mm = parseInt(mmStr, 10)
  const [y, mo, d] = getToday().split('-').map(Number)
  return new Date(y!, mo! - 1, d!, hh, mm, 0, 0)
}

function validate(): string | null {
  const sHH = startHH.value.trim()
  const sMM = startMM.value.trim()
  const eHH = endHH.value.trim()
  const eMM = endMM.value.trim()

  const hasStart = sHH !== '' || sMM !== ''
  const hasEnd = eHH !== '' || eMM !== ''

  if (hasStart && (sHH === '' || sMM === '')) return 'Enter both start hour and minute'
  if (hasEnd && (eHH === '' || eMM === '')) return 'Enter both end hour and minute'

  if (hasStart) {
    const h = parseInt(sHH, 10)
    const m = parseInt(sMM, 10)
    if (isNaN(h) || h < 0 || h > 23) return 'Start hour must be 00–23'
    if (isNaN(m) || m < 0 || m > 59) return 'Start minute must be 00–59'
  }

  if (hasEnd) {
    if (!hasStart) return 'Cannot set end time without a start time'
    const sh = parseInt(sHH, 10)
    const sm = parseInt(sMM, 10)
    const eh = parseInt(eHH, 10)
    const em = parseInt(eMM, 10)
    if (isNaN(eh) || eh < 0 || eh > 23) return 'End hour must be 00–23'
    if (isNaN(em) || em < 0 || em > 59) return 'End minute must be 00–59'
    if (eh < sh || (eh === sh && em <= sm)) return 'End time must be after start time'
  }

  return null
}

async function handleUpdate() {
  const err = validate()
  if (err) {
    errorMsg.value = err
    return
  }

  const sHH = startHH.value.trim()
  const sMM = startMM.value.trim()
  const eHH = endHH.value.trim()
  const eMM = endMM.value.trim()

  const clockedIn = sHH !== '' && sMM !== '' ? buildLocalDate(sHH, sMM) : null
  const clockedOut = eHH !== '' && eMM !== '' ? buildLocalDate(eHH, eMM) : null

  await store.punch(clockedIn, clockedOut)
  emit('close')
}

watch(() => isOpen, (open) => {
  if (open) {
    populate()
    setTimeout(() => startHHRef.value?.focus(), 50)
  }
}, { immediate: true })

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="punch-modal-overlay"
    >
      <div class="w-[480px] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider" data-testid="punch-modal-title">// PUNCH CLOCK</span>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Start Time -->
          <div>
            <div class="text-xs text-muted-foreground mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              Start Time
            </div>
            <div class="flex items-center gap-2">
              <span class="text-primary">$</span>
              <input
                ref="startHHRef"
                v-model="startHH"
                type="text"
                maxlength="2"
                placeholder="HH"
                class="w-12 bg-input border border-border px-2 py-1 text-center text-foreground focus:outline-none focus:border-primary font-mono"
                data-testid="start-hh"
              />
              <span class="text-muted-foreground">:</span>
              <input
                v-model="startMM"
                type="text"
                maxlength="2"
                placeholder="mm"
                class="w-12 bg-input border border-border px-2 py-1 text-center text-foreground focus:outline-none focus:border-primary font-mono"
                data-testid="start-mm"
              />
              <button
                type="button"
                class="text-xs text-muted-foreground hover:text-destructive transition-colors ml-2"
                data-testid="clear-start"
                @click="clearStart"
              >
                [clear]
              </button>
            </div>
          </div>

          <!-- End Time -->
          <div>
            <div class="text-xs text-muted-foreground mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              End Time
            </div>
            <div class="flex items-center gap-2">
              <span class="text-primary">$</span>
              <input
                v-model="endHH"
                type="text"
                maxlength="2"
                placeholder="HH"
                class="w-12 bg-input border border-border px-2 py-1 text-center text-foreground focus:outline-none focus:border-primary font-mono"
                data-testid="end-hh"
              />
              <span class="text-muted-foreground">:</span>
              <input
                v-model="endMM"
                type="text"
                maxlength="2"
                placeholder="mm"
                class="w-12 bg-input border border-border px-2 py-1 text-center text-foreground focus:outline-none focus:border-primary font-mono"
                data-testid="end-mm"
              />
              <button
                type="button"
                class="text-xs text-muted-foreground hover:text-destructive transition-colors ml-2"
                data-testid="clear-end"
                @click="clearEnd"
              >
                [clear]
              </button>
            </div>
          </div>

          <!-- Error -->
          <div
            v-if="errorMsg"
            class="text-destructive text-xs"
            data-testid="punch-error"
          >
            <span class="text-accent">ERR:</span>
            {{ errorMsg }}
          </div>
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <button
            type="button"
            class="hover:text-primary transition-colors"
            data-testid="punch-update-btn"
            @click="handleUpdate"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">Update</span>
            <span class="text-accent">]</span>
          </button>
          <button
            type="button"
            class="hover:text-primary transition-colors"
            data-testid="punch-cancel-btn"
            @click="$emit('close')"
          >
            <span class="text-accent">[</span>
            <span class="text-muted-foreground">Cancel</span>
            <span class="text-accent">]</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
