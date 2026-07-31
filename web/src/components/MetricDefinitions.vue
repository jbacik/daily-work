<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkMetricsStore } from '@/stores/workMetrics'
import type { WorkMetricDefinition } from '@/types'

const store = useWorkMetricsStore()

const editingId = ref<number | null>(null)
const draft = ref('')
const suppressCommit = ref(false)
// Function ref, not a string ref: a string ref inside v-for collects an array.
const renameInputRef = ref<HTMLInputElement | null>(null)

function setRenameInput(el: unknown) {
  renameInputRef.value = (el as HTMLInputElement | null) ?? null
}

const isAdding = ref(false)
const newTitle = ref('')
const addInputRef = ref<HTMLInputElement | null>(null)

function startRename(definition: WorkMetricDefinition) {
  editingId.value = definition.id
  draft.value = definition.title
  suppressCommit.value = false
  nextTick(() => renameInputRef.value?.focus())
}

async function commitRename(definition: WorkMetricDefinition) {
  if (suppressCommit.value) {
    suppressCommit.value = false
    return
  }
  editingId.value = null
  const title = draft.value.trim()
  if (!title || title === definition.title) return
  await store.updateDefinition(definition.id, { title })
}

function cancelRename() {
  suppressCommit.value = true
  editingId.value = null
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
  if (title) await store.addDefinition(title)
}

function cancelAdd() {
  isAdding.value = false
  newTitle.value = ''
}
</script>

<template>
  <section>
    <div class="text-sm mb-3">
      <span class="text-accent">&gt;&gt;&gt;</span>
      <span class="text-muted-foreground text-xs uppercase tracking-wider ml-2">Definitions</span>
    </div>

    <div class="bg-card border border-border p-4">
      <p
        v-if="store.definitions.length === 0"
        class="text-muted-foreground text-xs italic py-1"
        data-testid="metric-definitions-empty"
      >
        &lt;no definitions&gt;
      </p>

      <div
        v-for="definition in store.definitions"
        :key="definition.id"
        class="group flex items-baseline gap-2.5 py-1.5 border-b border-dashed border-border last:border-b-0"
        data-testid="metric-definition"
      >
        <div v-if="editingId === definition.id" class="flex flex-1 items-baseline gap-1.5">
          <span class="text-accent">&gt;</span>
          <input
            :ref="setRenameInput"
            v-model="draft"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-foreground text-xs"
            data-testid="metric-definition-rename-input"
            @keydown.enter="commitRename(definition)"
            @keydown.escape="cancelRename"
            @blur="commitRename(definition)"
          />
        </div>
        <button
          v-else
          type="button"
          class="flex-1 text-left text-xs"
          :class="definition.isActive ? 'text-foreground' : 'text-muted-foreground/70 line-through'"
          data-testid="metric-definition-title"
          @click="startRename(definition)"
        >
          {{ definition.title }}
        </button>

        <span class="ml-auto inline-flex items-baseline gap-2">
          <button
            type="button"
            class="text-muted-foreground/70 hover:text-accent text-xs"
            data-testid="metric-definition-toggle"
            @click="store.updateDefinition(definition.id, { isActive: !definition.isActive })"
          >
            [{{ definition.isActive ? 'retire' : 'activate' }}]
          </button>
          <button
            type="button"
            class="text-muted-foreground/70 hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title="delete definition"
            data-testid="metric-definition-delete"
            @click="store.removeDefinition(definition.id)"
          >
            x
          </button>
        </span>
      </div>

      <div v-if="isAdding" class="flex items-baseline gap-1.5 mt-3">
        <span class="text-accent">&gt;</span>
        <input
          ref="addInputRef"
          v-model="newTitle"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-foreground text-xs"
          placeholder="definition title…"
          data-testid="metric-definition-add-input"
          @keydown.enter="handleAdd"
          @keydown.escape="cancelAdd"
          @blur="handleAdd"
        />
      </div>
      <button
        v-else
        type="button"
        class="text-muted-foreground/70 hover:text-accent text-xs mt-3"
        data-testid="metric-definition-add"
        @click="startAdding"
      >
        + add definition
      </button>
    </div>

    <p class="text-muted-foreground/70 text-xs mt-2.5 leading-relaxed">
      retired definitions stay listed (dim) and stop seeding new weeks.
    </p>
  </section>
</template>
