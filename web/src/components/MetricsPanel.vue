<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import { formatTimeAgo } from '@/utils/time'
import type { WorkMetricEntry } from '@/types'

const store = useWorkMetricsStore()

const editingId = ref<number | null>(null)
const draft = ref('')
const suppressCommit = ref(false)
// Function ref, not a string ref: a string ref inside v-for collects an array.
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function setTextarea(el: unknown) {
  textareaRef.value = (el as HTMLTextAreaElement | null) ?? null
}

const isAdding = ref(false)
const newTitle = ref('')
const addInputRef = ref<HTMLInputElement | null>(null)

// Agent provenance only reads on a value the agent actually wrote.
function isAgentWritten(entry: WorkMetricEntry): boolean {
  return entry.source === 'Agent' && entry.value !== null
}

function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function startEditing(entry: WorkMetricEntry) {
  editingId.value = entry.id
  draft.value = entry.value ?? ''
  suppressCommit.value = false
  nextTick(() => {
    textareaRef.value?.focus()
    autoGrow()
  })
}

async function commit() {
  // Escape unmounts the textarea; don't let a trailing blur resurrect the draft.
  if (suppressCommit.value) {
    suppressCommit.value = false
    return
  }
  const id = editingId.value
  if (id === null) return
  editingId.value = null
  const trimmed = draft.value.trim()
  await store.saveEntryValue(id, trimmed === '' ? null : draft.value)
}

function cancel() {
  suppressCommit.value = true
  editingId.value = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }
  // Plain Enter stays a newline — multi-line values are the norm here.
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    commit()
  }
}

function startAdding() {
  isAdding.value = true
  newTitle.value = ''
  nextTick(() => addInputRef.value?.focus())
}

async function handleAdd() {
  if (!isAdding.value) return
  isAdding.value = false
  const title = newTitle.value.trim()
  newTitle.value = ''
  if (title) await store.addEntry(title)
}

function cancelAdd() {
  isAdding.value = false
  newTitle.value = ''
}
</script>

<template>
  <section>
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>cat ./metrics/{{ store.weekOf }}.log</span>
    </div>

    <div class="bg-card border border-border p-4">
      <p v-if="store.error" class="text-destructive text-xs mb-3" data-testid="metrics-error">
        <span class="text-accent">ERR:</span> {{ store.error }}
      </p>

      <p
        v-if="store.entries.length === 0"
        class="text-muted-foreground text-sm italic"
        data-testid="metrics-empty"
      >
        &lt;no metrics this week&gt;
      </p>

      <div
        v-for="entry in store.entries"
        :key="entry.id"
        class="group py-2.5 border-b border-dashed border-border last:border-b-0"
        data-testid="metric-entry"
      >
        <div class="flex items-baseline gap-2 text-muted-foreground text-xs">
          <span class="uppercase tracking-wider font-bold" data-testid="metric-entry-title">
            {{ entry.title }}
          </span>
          <span
            v-if="entry.definitionId === null"
            class="text-muted-foreground/70 text-[10.5px]"
            data-testid="metric-entry-adhoc"
          >
            ·adhoc
          </span>
          <span class="ml-auto inline-flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              v-if="entry.definitionId === null"
              type="button"
              class="text-muted-foreground/70 hover:text-destructive text-xs"
              title="delete entry"
              data-testid="metric-entry-delete"
              @click="store.removeEntry(entry.id)"
            >
              x
            </button>
          </span>
        </div>

        <div
          class="mt-1 text-sm text-foreground"
          :class="isAgentWritten(entry) ? 'border-l-2 border-accent/50 pl-3.5' : 'pl-4'"
        >
          <div v-if="editingId === entry.id" class="relative flex items-start gap-1.5">
            <span class="text-accent">&gt;</span>
            <textarea
              :ref="setTextarea"
              v-model="draft"
              rows="1"
              class="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden text-foreground text-sm p-0"
              data-testid="metric-entry-editor"
              @input="autoGrow"
              @keydown="onKeydown"
              @blur="commit"
            />
            <span class="absolute right-0 -top-4 text-[10px] text-muted-foreground/70">
              Ctrl+↵ save · esc cancel
            </span>
          </div>

          <button
            v-else-if="entry.value === null"
            type="button"
            class="text-muted-foreground/70 italic text-left"
            data-testid="metric-entry-pending"
            @click="startEditing(entry)"
          >
            &lt;pending&gt;
          </button>

          <button
            v-else
            type="button"
            class="text-left whitespace-pre-wrap"
            data-testid="metric-entry-value"
            @click="startEditing(entry)"
          >
            {{ entry.value }}<span
              v-if="isAgentWritten(entry)"
              class="text-accent text-[10.5px]"
              data-testid="metric-entry-agent"
            > [agent]<span class="text-muted-foreground/70">{{ formatTimeAgo(entry.updatedAt) ? ` · ${formatTimeAgo(entry.updatedAt)}` : '' }}</span></span>
          </button>
        </div>
      </div>

      <div v-if="isAdding" class="flex items-baseline gap-1.5 mt-3">
        <span class="text-accent">&gt;</span>
        <input
          ref="addInputRef"
          v-model="newTitle"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-foreground text-sm"
          placeholder="entry title…"
          data-testid="metric-entry-add-input"
          @keydown.enter="handleAdd"
          @keydown.escape="cancelAdd"
          @blur="handleAdd"
        />
      </div>
      <button
        v-else
        type="button"
        class="text-muted-foreground/70 hover:text-accent text-sm mt-3"
        data-testid="metric-entry-add"
        @click="startAdding"
      >
        + add entry
      </button>
    </div>
  </section>
</template>
