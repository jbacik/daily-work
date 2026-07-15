<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import client from '@/api/client'
import { getToday } from '@/utils/week'
import { useForecastStore } from '@/stores/forecast'
import ForecastLoader from '@/components/ForecastLoader.vue'
import StandupShapePanel from '@/components/StandupShapePanel.vue'
import StandupTasksPanel from '@/components/StandupTasksPanel.vue'

const { isOpen, weekOf = '' } = defineProps<{
  isOpen: boolean
  weekOf?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const forecastStore = useForecastStore()
const forecastLoaded = computed(() => forecastStore.status === 'loaded')

const contentRef = ref<HTMLDivElement | null>(null)
const copied = ref(false)
const loading = ref(false)
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const error = ref<string | null>(null)
const sections = ref<{ question: string; answer: string }[]>([])
const copiedSection = ref<number | null>(null)
const checkedSaved = ref(false)
const dotIndex = ref(0)
let dotInterval: ReturnType<typeof setInterval> | null = null

function getContent(): string {
  return contentRef.value?.innerText ?? ''
}

function sectionsToMarkdown(): string {
  return sections.value
    .map((s) => `### ${s.question}\n${s.answer}`)
    .join('\n\n')
}

async function handleSave() {
  const markdown = sectionsToMarkdown().trim()
  if (!markdown || saveState.value === 'saving') return

  saveState.value = 'saving'
  try {
    await client.post('/api/standup', {
      markdown,
      date: getToday(),
      commandType: 'standup',
    })
    saveState.value = 'saved'
    setTimeout(() => { saveState.value = 'idle' }, 3000)
  } catch (e: any) {
    error.value = e?.response?.data ?? e?.message ?? 'Save failed'
    saveState.value = 'idle'
  }
}

function handleCopyAll() {
  navigator.clipboard.writeText(getContent())
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function handleCopySection(index: number) {
  const section = sections.value[index]
  if (!section) return
  navigator.clipboard.writeText(section.answer)
  copiedSection.value = index
  setTimeout(() => { copiedSection.value = null }, 1500)
}

function renderBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function parseMarkdown(markdown: string): { question: string; answer: string }[] {
  const blocks = markdown.split(/^###\s+/m).filter(Boolean)
  return blocks.map((block) => {
    const newline = block.indexOf('\n')
    const question = newline >= 0 ? block.slice(0, newline).trim() : block.trim()
    const answer = newline >= 0 ? block.slice(newline + 1).trim() : ''
    return { question, answer }
  })
}

function startDotAnimation() {
  dotIndex.value = 0
  dotInterval = setInterval(() => {
    dotIndex.value = (dotIndex.value + 1) % 4
  }, 300)
}

function stopDotAnimation() {
  if (dotInterval) {
    clearInterval(dotInterval)
    dotInterval = null
  }
}

async function loadSaved() {
  try {
    const data = await client.get('/api/standup', { params: { date: getToday(), commandType: 'standup' } }) as any
    if (data?.markdown) {
      sections.value = parseMarkdown(data.markdown)
    }
  } catch {
    // 404 or error — no saved entry, the generate button stays visible
  }
  checkedSaved.value = true
}

async function generate() {
  if (!weekOf) return

  loading.value = true
  error.value = null
  sections.value = []
  startDotAnimation()

  try {
    const params: Record<string, string> = { weekOf, today: getToday() }
    const data = await client.post('/api/standup/generate', null, { params }) as any
    const markdown = data?.markdown ?? ''
    sections.value = parseMarkdown(markdown)
  } catch (e: any) {
    error.value = e?.response?.data ?? e?.message ?? 'Generation failed'
  } finally {
    loading.value = false
    stopDotAnimation()
    await nextTick()
    placeCursorAtEnd()
  }
}

function placeCursorAtEnd() {
  if (!contentRef.value) return
  contentRef.value.focus()
  const range = document.createRange()
  range.selectNodeContents(contentRef.value)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

async function handleOpen() {
  await forecastStore.fetchToday()
  if (forecastStore.status === 'loaded') {
    await loadSaved()
  }
}

function handlePick(content: string, name: string) {
  forecastStore.upload(content, name).then(() => {
    if (forecastStore.status === 'loaded' && !checkedSaved.value) {
      loadSaved()
    }
  })
}

function handleUnload() {
  forecastStore.unload()
}

watch(() => isOpen, (open) => {
  if (open) {
    handleOpen()
  } else {
    stopDotAnimation()
    sections.value = []
    error.value = null
    loading.value = false
    saveState.value = 'idle'
    checkedSaved.value = false
  }
}, { immediate: true })

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return

  const key = e.key.toLowerCase()
  const activeElement = document.activeElement
  const isEditingContent = contentRef.value?.contains(activeElement) ?? false

  if (!isEditingContent) {
    if (key === 's' && forecastLoaded.value) {
      e.preventDefault()
      handleSave()
    } else if (key === 'c' && forecastLoaded.value) {
      e.preventDefault()
      handleCopyAll()
    } else if (key === 'r' && forecastLoaded.value && !loading.value && sections.value.length > 0) {
      e.preventDefault()
      generate()
    } else if (key === 'e') {
      e.preventDefault()
      emit('close')
    }
  }

  if (key === 'escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  stopDotAnimation()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="planning-modal-overlay"
    >
      <div class="w-[80vw] h-[80vh] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider" data-testid="planning-modal-title">// DAILY STANDUP</span>
        </div>

        <!-- Content area -->
        <div class="flex-1 p-6 overflow-auto space-y-6">
          <ForecastLoader
            :status="forecastStore.status"
            :file-name="forecastStore.fileName"
            :error="forecastStore.error"
            @pick="handlePick"
            @unload="handleUnload"
          />

          <template v-if="forecastLoaded && forecastStore.forecast">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StandupShapePanel :forecast="forecastStore.forecast" />
              <StandupTasksPanel />
            </div>

            <!-- Standup questions -->
            <div class="bg-card border border-border p-4" data-testid="questions-panel">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-accent">&gt;&gt;&gt;</span>
                <span class="text-muted-foreground text-xs uppercase tracking-wider">Standup Questions</span>
                <span
                  v-if="sections.length > 0"
                  class="ml-auto text-muted-foreground text-xs"
                >generated &middot; editable before save</span>
              </div>

              <!-- Loading state -->
              <div v-if="loading" class="text-muted-foreground" data-testid="planning-modal-loading">
                <span>Generating</span>
                <span v-for="i in 3" :key="i" :class="dotIndex >= i ? 'text-accent' : 'text-muted-foreground/30'">.</span>
                <span class="inline-block w-2 bg-accent animate-blink ml-0.5">&nbsp;</span>
              </div>

              <!-- Error state -->
              <div v-else-if="error" class="text-destructive" data-testid="planning-modal-error">
                <span class="text-accent">ERR:</span> {{ error }}
              </div>

              <!-- Generate affordance -->
              <div v-else-if="sections.length === 0" class="flex items-center gap-3">
                <button
                  class="border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors text-sm px-4 py-1.5 tracking-wide"
                  data-testid="generate-standup-btn"
                  @click="generate"
                >
                  &#9656; generate standup
                </button>
                <span class="text-muted-foreground text-xs">
                  drafts answers from today's tasks &amp; forecast PTO
                </span>
              </div>

              <!-- Generated content -->
              <div
                v-else
                ref="contentRef"
                contenteditable="true"
                class="w-full bg-transparent text-foreground text-sm focus:outline-none leading-relaxed"
                data-testid="planning-modal-content"
              >
                <div v-for="(section, i) in sections" :key="i" class="mb-6">
                  <div class="flex items-start gap-2 group">
                    <div class="flex-1">
                      <div class="text-accent font-bold">{{ section.question }}</div>
                      <div class="whitespace-pre-wrap mt-1" v-html="renderBold(section.answer)"></div>
                    </div>
                    <button
                      contenteditable="false"
                      class="shrink-0 mt-1 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      :data-testid="`copy-section-${i}`"
                      @click.stop="handleCopySection(i)"
                    >
                      <span v-if="copiedSection === i" class="text-accent text-xs">copied!</span>
                      <span v-else class="text-xs">[cp]</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div
            v-else-if="forecastStore.status !== 'loading'"
            class="flex items-center justify-center py-16"
          >
            <span class="text-muted-foreground text-sm italic" data-testid="no-forecast-placeholder">
              &lt;no forecast loaded&gt;
            </span>
          </div>
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <template v-if="forecastLoaded">
            <button
              data-testid="cmd-save"
              class="hover:text-primary transition-colors"
              :disabled="saveState === 'saving'"
              @click="handleSave"
            >
              <span class="text-accent">[</span>
              <span class="text-primary font-bold">S</span>
              <span class="text-accent">]</span>
              <span v-if="saveState === 'saving'" class="text-muted-foreground">aving...</span>
              <span v-else-if="saveState === 'saved'" class="text-accent">aved!</span>
              <span v-else class="text-muted-foreground">ave</span>
            </button>
            <button
              data-testid="cmd-copy"
              class="hover:text-primary transition-colors"
              @click="handleCopyAll"
            >
              <span class="text-accent">[</span>
              <span class="text-primary font-bold">C</span>
              <span class="text-accent">]</span>
              <span class="text-muted-foreground" data-testid="copy-label">{{ copied ? 'opied!' : 'opy All' }}</span>
            </button>
            <button
              v-if="!loading && sections.length > 0"
              data-testid="cmd-regenerate"
              class="hover:text-primary transition-colors"
              @click="generate"
            >
              <span class="text-accent">[</span>
              <span class="text-primary font-bold">R</span>
              <span class="text-accent">]</span>
              <span class="text-muted-foreground">egenerate</span>
            </button>
          </template>
          <button
            data-testid="cmd-exit"
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
