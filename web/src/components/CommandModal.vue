<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const { isOpen, title } = defineProps<{
  isOpen: boolean
  title: string
}>()

const emit = defineEmits<{
  save: [content: string]
  close: []
}>()

const contentRef = ref<HTMLDivElement | null>(null)
const copied = ref(false)

function getContent(): string {
  return contentRef.value?.innerText ?? ''
}

function handleSave() {
  emit('save', getContent())
  emit('close')
}

function handleCopy() {
  navigator.clipboard.writeText(getContent())
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

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
      handleCopy()
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
          <div
            ref="contentRef"
            contenteditable="true"
            class="min-h-full w-full bg-transparent text-foreground focus:outline-none leading-relaxed whitespace-pre-wrap"
            data-testid="command-modal-content"
          >
            <span class="text-muted-foreground">Generating</span><span class="animate-pulse text-accent">...</span>
          </div>
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <button
            data-testid="cmd-save"
            class="hover:text-primary transition-colors"
            @click="handleSave"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">S</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground">ave</span>
          </button>
          <button
            data-testid="cmd-copy"
            class="hover:text-primary transition-colors"
            @click="handleCopy"
          >
            <span class="text-accent">[</span>
            <span class="text-primary font-bold">C</span>
            <span class="text-accent">]</span>
            <span class="text-muted-foreground" data-testid="copy-label">{{ copied ? 'opied!' : 'opy' }}</span>
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
