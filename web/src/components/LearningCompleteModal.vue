<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ReadWatchItem } from '@/types'

const { isOpen, item, mode = 'consume' } = defineProps<{
  isOpen: boolean
  item: ReadWatchItem | null
  mode?: 'consume' | 'review'
}>()

const emit = defineEmits<{
  submit: [data: { worthSharing: boolean; notes: string }]
  close: []
}>()

const worthSharing = ref<boolean | null>(null)
const notes = ref('')

const isValid = computed(() => worthSharing.value !== null && notes.value.trim().length > 0)

function resetForm() {
  if (isOpen && item) {
    if (mode === 'review' && item.worthSharing !== null) {
      worthSharing.value = item.worthSharing
      notes.value = item.notes ?? ''
    } else {
      worthSharing.value = null
      notes.value = ''
    }
  }
}

watch(() => isOpen, resetForm, { immediate: true })

function handleSubmit() {
  if (worthSharing.value === null || !notes.value.trim()) return
  emit('submit', { worthSharing: worthSharing.value, notes: notes.value.trim() })
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen) return
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && item"
      data-testid="learning-complete-modal"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

      <!-- Modal -->
      <div class="relative w-[40vw] min-w-[360px] max-h-[60vh] bg-card border border-border flex flex-col">
        <!-- Header -->
        <div class="border-b border-border p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span class="text-primary">$</span>
            <span>{{ mode === 'consume' ? 'complete' : 'review' }} --learning</span>
          </div>
          <div class="flex items-center gap-2">
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener"
              class="text-foreground hover:underline text-sm font-medium"
            >
              {{ item.title }}
            </a>
            <span v-else class="text-foreground text-sm font-medium">
              {{ item.title }}
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Worth sharing radio -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              <span class="text-muted-foreground text-xs uppercase tracking-wider">
                Worth sharing this week?
              </span>
            </div>
            <div class="flex gap-4 ml-6">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  v-model="worthSharing"
                  type="radio"
                  :value="true"
                  data-testid="worth-sharing-yes"
                  class="accent-primary"
                />
                <span class="text-foreground">Yes</span>
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  v-model="worthSharing"
                  type="radio"
                  :value="false"
                  data-testid="worth-sharing-no"
                  class="accent-primary"
                />
                <span class="text-foreground">No</span>
              </label>
            </div>
          </div>

          <!-- Notes textarea -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-accent">&gt;&gt;&gt;</span>
              <span class="text-muted-foreground text-xs uppercase tracking-wider">
                Findings / Notes
              </span>
            </div>
            <textarea
              v-model="notes"
              data-testid="notes-input"
              class="w-full bg-input border border-border text-foreground text-sm p-2 min-h-[120px] resize-y outline-none focus:border-primary"
              placeholder="What did you learn? Any key takeaways..."
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-border p-4 flex items-center justify-end gap-2">
          <button
            data-testid="cancel-btn"
            class="text-muted-foreground hover:text-foreground text-sm px-3 py-1"
            @click="emit('close')"
          >
            [cancel]
          </button>
          <button
            data-testid="submit-btn"
            :disabled="!isValid"
            :class="[
              'text-sm px-3 py-1 border border-border',
              isValid
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed',
            ]"
            @click="handleSubmit"
          >
            [{{ mode === 'consume' ? 'complete' : 'save' }}]
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
