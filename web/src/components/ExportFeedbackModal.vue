<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import client from '@/api/client'
import { getToday, shiftDate } from '@/utils/week'
import type { FeedbackPair } from '@/types'

const { isOpen } = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

type Preset = '2w' | '4w' | 'month' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: '2w', label: 'last 2 weeks' },
  { key: '4w', label: 'last 4 weeks' },
  { key: 'month', label: 'this month' },
  { key: 'custom', label: 'custom' },
]

const preset = ref<Preset>('2w')
const customFrom = ref('')
const customTo = ref('')
const loading = ref(false)
const errorMsg = ref('')
const pairs = ref<FeedbackPair[] | null>(null)

const range = computed((): { from: string; to: string } => {
  const today = getToday()
  switch (preset.value) {
    case '2w': return { from: shiftDate(today, -14), to: today }
    case '4w': return { from: shiftDate(today, -28), to: today }
    case 'month': return { from: `${today.slice(0, 8)}01`, to: today }
    default: return { from: customFrom.value, to: customTo.value }
  }
})

const editedCount = computed(() =>
  pairs.value?.filter((p) => p.generatedMarkdown.trim() !== p.submittedMarkdown.trim()).length ?? 0)

const variantCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of pairs.value ?? []) counts[p.promptVariant] = (counts[p.promptVariant] ?? 0) + 1
  return Object.entries(counts)
})

function selectPreset(key: Preset) {
  preset.value = key
  pairs.value = null
  errorMsg.value = ''
}

function downloadJson(data: FeedbackPair[], from: string, to: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `standup-pairs-${from}_${to}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function handleDownload() {
  if (loading.value) return
  const { from, to } = range.value
  if (!from || !to) {
    errorMsg.value = 'Enter both from and to dates'
    return
  }
  if (from > to) {
    errorMsg.value = 'From date must be on or before to date'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const data = await client.get('/api/standup/feedback-pairs', { params: { from, to } }) as any as FeedbackPair[]
    pairs.value = data
    if (data.length > 0) downloadJson(data, from, to)
  } catch (e: any) {
    pairs.value = null
    errorMsg.value = e?.response?.status === 404
      ? 'Feedback capture is off — set Features:StandupFeedbackCapture to true and restart the API'
      : e?.response?.data ?? e?.message ?? 'Export failed'
  } finally {
    loading.value = false
  }
}

watch(() => isOpen, (open) => {
  if (!open) return
  preset.value = '2w'
  customFrom.value = ''
  customTo.value = ''
  pairs.value = null
  errorMsg.value = ''
})

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return

  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }

  if ((e.target as HTMLElement).tagName === 'INPUT') return

  const key = e.key.toLowerCase()
  if (key === 'd') {
    e.preventDefault()
    handleDownload()
  } else if (key === 'e') {
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
      data-testid="export-feedback-overlay"
    >
      <div class="w-[560px] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider">// EXPORT FEEDBACK</span>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6 text-sm">
          <div class="flex items-center gap-2 text-muted-foreground">
            <span class="text-primary">$</span>
            <span>cat /standup/drafts.diff --from={{ range.from || '?' }} --to={{ range.to || '?' }}</span>
          </div>

          <!-- Range presets -->
          <div>
            <div class="text-xs text-muted-foreground mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              <span class="uppercase tracking-wider"> Date Range</span>
            </div>
            <div class="flex flex-wrap gap-4">
              <button
                v-for="p in PRESETS"
                :key="p.key"
                type="button"
                class="text-xs transition-colors hover:text-primary"
                :class="preset === p.key ? 'text-accent' : 'text-muted-foreground'"
                :data-testid="`preset-${p.key}`"
                @click="selectPreset(p.key)"
              >
                [{{ preset === p.key ? 'x' : ' ' }}] {{ p.label }}
              </button>
            </div>

            <div v-if="preset === 'custom'" class="flex items-center gap-2 mt-3">
              <span class="text-primary">&gt;</span>
              <input
                v-model="customFrom"
                type="date"
                class="bg-input border border-border px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                data-testid="custom-from"
              />
              <span class="text-muted-foreground text-xs">to</span>
              <input
                v-model="customTo"
                type="date"
                class="bg-input border border-border px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                data-testid="custom-to"
              />
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="text-muted-foreground text-xs" data-testid="export-loading">
            Exporting<span class="inline-block w-[0.5em] h-[0.9em] bg-foreground align-text-bottom ml-1 animate-blink"></span>
          </div>

          <!-- Summary -->
          <div v-else-if="pairs" data-testid="export-summary">
            <div class="text-xs text-muted-foreground mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              <span class="uppercase tracking-wider"> Summary</span>
            </div>
            <div v-if="pairs.length === 0" class="text-muted-foreground italic" data-testid="export-empty">
              &lt;no pairs in range — generate a standup, then save it from the modal&gt;
            </div>
            <div v-else class="space-y-1">
              <div>
                <span class="text-accent font-bold" data-testid="export-total">{{ pairs.length }}</span>
                <span class="text-muted-foreground"> pairs exported, </span>
                <span class="text-accent font-bold" data-testid="export-edited">{{ editedCount }}</span>
                <span class="text-muted-foreground"> edited</span>
              </div>
              <div class="text-xs text-muted-foreground">
                <span v-for="([variant, count], i) in variantCounts" :key="variant">
                  {{ variant }}: {{ count }}<span v-if="i < variantCounts.length - 1"> · </span>
                </span>
              </div>
              <div class="text-xs text-muted-foreground pt-2">
                <span class="text-primary">tip:</span> run /export-feedback in Claude Code to analyze your edits
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="text-destructive text-xs" data-testid="export-error">
            <span class="text-accent">ERR:</span>
            {{ errorMsg }}
          </div>
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <button
            type="button"
            class="hover:text-primary transition-colors"
            data-testid="export-download-btn"
            @click="handleDownload"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">D</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground">ownload</span>
          </button>
          <button
            type="button"
            class="hover:text-primary transition-colors"
            data-testid="export-exit-btn"
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
