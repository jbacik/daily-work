<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import client from '@/api/client'

const { isOpen } = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

type Phase = 'input' | 'loading' | 'result' | 'error'

const phase = ref<Phase>('input')
const fileName = ref(defaultFileName())
const markdown = ref('')
const errorMsg = ref('')
const copied = ref(false)
const dotIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const resultRef = ref<HTMLDivElement | null>(null)
let dotInterval: ReturnType<typeof setInterval> | null = null

function defaultFileName(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}_calendar.json`
}

const renderedHtml = computed(() => marked(markdown.value))

function startDots() {
  dotIndex.value = 0
  dotInterval = setInterval(() => {
    dotIndex.value = (dotIndex.value + 1) % 4
  }, 300)
}

function stopDots() {
  if (dotInterval) {
    clearInterval(dotInterval)
    dotInterval = null
  }
}

async function handleSubmit() {
  if (!fileName.value.trim()) return

  phase.value = 'loading'
  startDots()

  try {
    const data = await client.post('/api/calendar/evaluate', { fileName: fileName.value.trim() }) as any
    markdown.value = data?.markdown ?? ''
    phase.value = 'result'
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.detail ?? e?.response?.data ?? e?.message ?? 'Evaluation failed'
    phase.value = 'error'
  } finally {
    stopDots()
  }
}

function handleCopy() {
  const text = resultRef.value?.innerText ?? markdown.value
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function reset() {
  phase.value = 'input'
  fileName.value = defaultFileName()
  markdown.value = ''
  errorMsg.value = ''
  copied.value = false
  stopDots()
}

watch(() => isOpen, (open) => {
  if (open) {
    reset()
    setTimeout(() => inputRef.value?.focus(), 50)
  }
}, { immediate: true })

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return

  const key = e.key.toLowerCase()
  const isInInput = document.activeElement === inputRef.value

  if (key === 'escape') {
    e.preventDefault()
    emit('close')
    return
  }

  if (phase.value === 'input' && key === 'enter' && isInInput) {
    e.preventDefault()
    handleSubmit()
    return
  }

  if (!isInInput && phase.value === 'result') {
    if (key === 'c') {
      e.preventDefault()
      handleCopy()
    } else if (key === 'e') {
      e.preventDefault()
      emit('close')
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  stopDots()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="evaluate-modal-overlay"
    >
      <div class="w-[80vw] h-[80vh] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider" data-testid="evaluate-modal-title">// EVALUATE MY WEEK</span>
        </div>

        <!-- Content area -->
        <div class="flex-1 p-6 overflow-auto">
          <!-- Input phase -->
          <div v-if="phase === 'input'" data-testid="evaluate-input-phase">
            <div class="text-muted-foreground mb-4">
              <span class="text-accent">&gt;&gt;&gt;</span> enter calendar JSON file name
            </div>
            <div class="flex items-center gap-3">
              <span class="text-primary">$</span>
              <input
                ref="inputRef"
                v-model="fileName"
                type="text"
                class="flex-1 bg-input border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                placeholder="2026-04-07_calendar.json"
                data-testid="evaluate-file-input"
              />
              <button
                class="border border-border px-4 py-2 hover:bg-secondary/50 transition-colors"
                :disabled="!fileName.trim()"
                data-testid="evaluate-run-btn"
                @click="handleSubmit"
              >
                <span class="text-accent">[</span>
                <span class="text-primary font-bold">Run</span>
                <span class="text-accent">]</span>
              </button>
            </div>
            <div class="text-xs text-muted-foreground mt-3">
              File should be located in <span class="text-accent">api/src/Resources/</span> on the server. Press Enter to run.
            </div>
          </div>

          <!-- Loading phase -->
          <div v-else-if="phase === 'loading'" class="text-muted-foreground" data-testid="evaluate-loading">
            <span>Analyzing</span>
            <span v-for="i in 3" :key="i" :class="dotIndex >= i ? 'text-accent' : 'text-muted-foreground/30'">.</span>
            <span class="inline-block w-2 bg-accent animate-blink ml-0.5">&nbsp;</span>
          </div>

          <!-- Error phase -->
          <div v-else-if="phase === 'error'" class="text-destructive" data-testid="evaluate-error">
            <span class="text-accent">ERR:</span> {{ errorMsg }}
          </div>

          <!-- Result phase -->
          <div
            v-else-if="phase === 'result'"
            ref="resultRef"
            class="prose prose-invert max-w-none text-foreground [&_h2]:text-primary [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2 [&_strong]:text-accent [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1 [&_th]:bg-secondary [&_th]:text-primary [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1 [&_li]:text-foreground [&_p]:text-foreground"
            data-testid="evaluate-result"
            v-html="renderedHtml"
          />
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <button
            v-if="phase === 'result'"
            data-testid="evaluate-copy"
            class="hover:text-primary transition-colors"
            @click="handleCopy"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">C</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground">{{ copied ? 'opied!' : 'opy All' }}</span>
          </button>
          <button
            data-testid="evaluate-exit"
            class="hover:text-primary transition-colors"
            @click="$emit('close')"
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
