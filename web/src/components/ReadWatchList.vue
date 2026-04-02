<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useReadWatchStore } from '@/stores/readWatch'
import ReadingItemRow from './ReadingItemRow.vue'

const { defaultShowAll = false } = defineProps<{
  defaultShowAll?: boolean
}>()

const store = useReadWatchStore()

const newTitle = ref('')
const newType = ref<'read' | 'watch' | 'learn'>('read')
const isAdding = ref(false)
const showAll = ref(defaultShowAll)
const inputRef = ref<HTMLInputElement | null>(null)

function startAdding() {
  isAdding.value = true
  nextTick(() => inputRef.value?.focus())
}

function cancelAdd() {
  newTitle.value = ''
  isAdding.value = false
}

async function handleAddItem() {
  var title = newTitle.value.trim()
  if (!title) return
  await store.create(title, '', newType.value)
  newTitle.value = ''
  isAdding.value = false
}

async function handleToggle(id: number) {
  var item = store.items.find((i) => i.id === id)
  if (item) await store.update(id, { isDone: !item.isDone })
}

function handleToggleActive(id: number) {
  store.toggleActive(id)
}

async function handleDelete(id: number) {
  await store.remove(id)
}
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>cat /queue/learning.txt | head -5</span>
    </div>

    <div class="border border-border p-4 bg-card">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-accent">&gt;&gt;&gt;</span>
          <span class="text-muted-foreground text-xs uppercase tracking-wider">
            Active Queue ({{ store.activeItems.length }}/5)
          </span>
        </div>
        <button
          class="text-xs text-muted-foreground hover:text-primary"
          @click="showAll = !showAll"
        >
          [{{ showAll ? 'hide backlog' : 'show all' }}]
        </button>
      </div>

      <div class="space-y-1 mb-4">
        <div v-if="store.activeItems.length === 0" class="text-muted-foreground text-sm italic">
          &lt;no active items&gt;
        </div>
        <ReadingItemRow
          v-for="item in store.activeItems"
          :key="item.id"
          :item="item"
          :show-toggle="true"
          @toggle="handleToggle"
          @toggle-active="handleToggleActive"
          @delete="handleDelete"
        />
      </div>

      <div v-if="isAdding" class="flex items-center gap-2 border-t border-border pt-3">
        <span class="text-primary">&gt;</span>
        <select
          v-model="newType"
          class="bg-secondary text-secondary-foreground text-xs px-1 py-0.5 border border-border"
        >
          <option value="read">READ</option>
          <option value="watch">WATCH</option>
          <option value="learn">LEARN</option>
        </select>
        <input
          ref="inputRef"
          v-model="newTitle"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-foreground text-sm"
          placeholder="Article, video, or skill..."
          @keydown.enter="handleAddItem"
          @keydown.escape="cancelAdd"
        />
      </div>
      <button
        v-else
        class="text-muted-foreground hover:text-primary text-sm"
        @click="startAdding"
      >
        + add item
      </button>

      <template v-if="showAll">
        <div v-if="store.backlogItems.length > 0" class="mt-4 pt-4 border-t border-border">
          <div class="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            ─── Backlog ({{ store.backlogItems.length }}) ───
          </div>
          <div class="space-y-1">
            <ReadingItemRow
              v-for="item in store.backlogItems"
              :key="item.id"
              :item="item"
              :show-toggle="true"
              @toggle="handleToggle"
              @toggle-active="handleToggleActive"
              @delete="handleDelete"
            />
          </div>
        </div>

        <div v-if="store.completedItems.length > 0" class="mt-4 pt-4 border-t border-border">
          <div class="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            ─── Completed ({{ store.completedItems.length }}) ───
          </div>
          <div class="space-y-1 opacity-60">
            <ReadingItemRow
              v-for="item in store.completedItems"
              :key="item.id"
              :item="item"
              :show-toggle="false"
              @toggle="handleToggle"
              @toggle-active="handleToggleActive"
              @delete="handleDelete"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
