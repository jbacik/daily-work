<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useWorkSessionStore } from '@/stores/workSession'
import DailyReflection from '@/components/DailyReflection.vue'
import type { ReflectionsInput } from '@/types'

const { isOpen, date, mode = 'view' } = defineProps<{
  isOpen: boolean
  date: string
  mode?: 'view' | 'edit'
}>()

const emit = defineEmits<{ close: [] }>()

const store = useWorkSessionStore()

const loading = ref(false)
const draft = ref<ReflectionsInput>({ wins: '', whines: '', valueAdds: '' })
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const error = ref<string | null>(null)

const session = computed(() => store.sessionsByDate[date] ?? null)

// Map the stored reflection (nulls) into the input shape ('') the editor expects.
const initialReflections = computed<ReflectionsInput>(() => ({
  wins: session.value?.reflections?.wins ?? '',
  whines: session.value?.reflections?.whines ?? '',
  valueAdds: session.value?.reflections?.valueAdds ?? '',
}))

// Fetch fresh on every open so the modal reflects the latest saved state, and only
// render the body once loaded so DailyReflection (which reads `initial` once) seeds
// from real data.
async function load() {
  loading.value = true
  error.value = null
  saveState.value = 'idle'
  await store.fetchSession(date)
  draft.value = { ...initialReflections.value }
  loading.value = false
}

watch(() => isOpen, (open) => {
  if (open) load()
}, { immediate: true })

async function handleSave() {
  if (saveState.value === 'saving') return
  saveState.value = 'saving'
  error.value = null
  try {
    await store.saveReflectionsForDate(date, draft.value)
    saveState.value = 'saved'
    window.setTimeout(() => emit('close'), 1200)
  } catch (e) {
    saveState.value = 'idle'
    error.value = e instanceof Error ? e.message : 'Failed to save reflection'
  }
}

function isTyping(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen) return
  const key = e.key.toLowerCase()

  if (key === 'escape') {
    e.preventDefault()
    emit('close')
    return
  }

  if (isTyping()) return

  if (key === 'e') {
    e.preventDefault()
    emit('close')
  } else if (key === 's' && mode === 'edit') {
    e.preventDefault()
    handleSave()
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
      data-testid="reflection-modal-overlay"
    >
      <div class="w-[640px] max-w-[90vw] max-h-[80vh] bg-card border-4 border-double border-primary flex flex-col">
        <!-- Title bar -->
        <div class="border-b-4 border-double border-primary px-4 py-2 flex items-center justify-center gap-2">
          <span class="text-primary font-bold tracking-wider" data-testid="reflection-modal-title">
            // DAILY REFLECTION
          </span>
          <span class="text-muted-foreground text-sm">&middot; {{ date }}</span>
        </div>

        <!-- Content area -->
        <div class="flex-1 p-6 overflow-auto">
          <div v-if="loading" class="text-muted-foreground text-sm" data-testid="reflection-modal-loading">
            <span class="animate-pulse">loading reflection...</span>
          </div>

          <!-- Edit mode -->
          <DailyReflection
            v-else-if="mode === 'edit'"
            :initial="initialReflections"
            wins-height="150px"
            whines-height="250px"
            value-adds-height="150px"
            @update:reflections="draft = $event"
          />

          <!-- View mode -->
          <div v-else class="flex flex-col gap-4" data-testid="reflection-view">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5 text-xs text-foreground tracking-wide">
                <span class="text-success">&check;</span> Wins
              </div>
              <div
                v-if="session?.reflections?.wins"
                class="whitespace-pre-wrap text-sm text-foreground"
                data-testid="reflection-view-wins"
              >
                {{ session.reflections.wins }}
              </div>
              <span v-else class="text-muted-foreground italic text-sm" data-testid="reflection-no-entry">
                &lt;no entry&gt;
              </span>
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5 text-xs text-foreground tracking-wide">
                <span class="text-destructive">!</span> Whines
              </div>
              <div
                v-if="session?.reflections?.whines"
                class="whitespace-pre-wrap text-sm text-foreground"
                data-testid="reflection-view-whines"
              >
                {{ session.reflections.whines }}
              </div>
              <span v-else class="text-muted-foreground italic text-sm" data-testid="reflection-no-entry">
                &lt;no entry&gt;
              </span>
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5 text-xs text-foreground tracking-wide">
                <span class="text-accent">+</span> Value Adds
              </div>
              <div
                v-if="session?.reflections?.valueAdds"
                class="whitespace-pre-wrap text-sm text-foreground"
                data-testid="reflection-view-value-adds"
              >
                {{ session.reflections.valueAdds }}
              </div>
              <span v-else class="text-muted-foreground italic text-sm" data-testid="reflection-no-entry">
                &lt;no entry&gt;
              </span>
            </div>
          </div>

          <div v-if="error" class="text-destructive text-xs mt-4" data-testid="reflection-modal-error">
            <span class="text-accent">ERR:</span> {{ error }}
          </div>
        </div>

        <!-- Action bar -->
        <div class="border-t-4 border-double border-primary px-4 py-3 flex items-center justify-center gap-8">
          <span class="animate-pulse text-accent">_</span>
          <button
            v-if="mode === 'edit'"
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
            data-testid="cmd-exit"
            class="hover:text-primary transition-colors"
            @click="emit('close')"
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
