<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import client from '@/api/client'
import { getToday } from '@/utils/week'
import type { CommandType } from '@/types'

const { isOpen, title, commandType = null, weekOf = '' } = defineProps<{
  isOpen: boolean
  title: string
  commandType?: CommandType | null
  weekOf?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const contentRef = ref<HTMLDivElement | null>(null)
const copied = ref(false)
const loading = ref(false)
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const error = ref<string | null>(null)
const sections = ref<{ question: string; answer: string }[]>([])
const copiedSection = ref<number | null>(null)
const hasSaved = ref(false)
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
      commandType: commandType ?? 'standup',
    })
    hasSaved.value = true
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

async function loadSaved(): Promise<boolean> {
  try {
    const data = await client.get('/api/standup', { params: { date: getToday(), commandType: commandType ?? 'standup' } }) as any
    if (data?.markdown) {
      sections.value = parseMarkdown(data.markdown)
      hasSaved.value = true
      return true
    }
  } catch {
    // 404 or error — no saved entry, proceed to generate
  }
  return false
}

async function generate() {
  if (!commandType || !weekOf) return

  loading.value = true
  error.value = null
  sections.value = []
  hasSaved.value = false
  startDotAnimation()

  try {
    const params: Record<string, string> = { weekOf }
    if (commandType === 'weekly') params.commandType = 'weekly'

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

async function handleOpen() {
  if (!commandType || !weekOf) return

  loading.value = true
  error.value = null
  sections.value = []
  startDotAnimation()

  const loaded = await loadSaved()
  if (loaded) {
    loading.value = false
    stopDotAnimation()
    await nextTick()
    placeCursorAtEnd()
    return
  }

  loading.value = false
  stopDotAnimation()
  await generate()
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

watch(() => isOpen, (open) => {
  if (open) {
    handleOpen()
  } else {
    stopDotAnimation()
    sections.value = []
    error.value = null
    loading.value = false
    hasSaved.value = false
    saveState.value = 'idle'
  }
}, { immediate: true })

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return

  const key = e.key.toLowerCase()
  const activeElement = document.activeElement
  const isEditingContent = contentRef.value?.contains(activeElement) ?? false

  if (!isEditingContent) {
    if (key === 's') {
      e.preventDefault()
      handleSave()
    } else if (key === 'c') {
      e.preventDefault()
      handleCopyAll()
    } else if (key === 'r' && !loading.value && sections.value.length > 0) {
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
      data-testid="command-modal-overlay"
    >
      <div class="w-[80vw] h-[80vh] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center">
          <span class="text-primary font-bold tracking-wider" data-testid="command-modal-title">{{ title }}</span>
        </div>

        <!-- Content area -->
        <div class="flex-1 p-6 overflow-auto">
          <!-- Loading state -->
          <div v-if="loading" class="text-muted-foreground" data-testid="command-modal-loading">
            <span>Generating</span>
            <span v-for="i in 3" :key="i" :class="dotIndex >= i ? 'text-accent' : 'text-muted-foreground/30'">.</span>
            <span class="inline-block w-2 bg-accent animate-blink ml-0.5">&nbsp;</span>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="text-destructive" data-testid="command-modal-error">
            <span class="text-accent">ERR:</span> {{ error }}
          </div>

          <!-- Generated content -->
          <div
            v-else
            ref="contentRef"
            contenteditable="true"
            class="min-h-full w-full bg-transparent text-foreground focus:outline-none leading-relaxed"
            data-testid="command-modal-content"
          >
            <div v-for="(section, i) in sections" :key="i" class="mb-8">
              <div class="flex items-start gap-2 group">
                <div class="flex-1">
                  <div class="text-accent text-lg font-bold">{{ section.question }}</div>
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

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
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
