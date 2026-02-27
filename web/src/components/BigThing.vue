<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'
import { useDailyTasksStore } from '@/stores/dailyTasks'

const store = useWorkItemsStore()
const dailyTasks = useDailyTasksStore()

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const newTitle = ref('')
const isAdding = ref(false)
const addInputRef = ref<HTMLInputElement | null>(null)

function startEditing() {
  if (!store.bigThing) return
  editValue.value = store.bigThing.title
  isEditing.value = true
  nextTick(() => inputRef.value?.focus())
}

async function handleSubmit() {
  if (!store.bigThing) return
  if (editValue.value.trim() && editValue.value !== store.bigThing.title) {
    await store.update(store.bigThing.id, { title: editValue.value.trim() })
  }
  isEditing.value = false
}

function handleCancel() {
  isEditing.value = false
}

function startAdding() {
  isAdding.value = true
  newTitle.value = ''
  nextTick(() => addInputRef.value?.focus())
}

async function handleAdd() {
  if (newTitle.value.trim()) {
    await store.create(newTitle.value.trim())
  }
  isAdding.value = false
  newTitle.value = ''
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
      <span>cat /week/{{ dailyTasks.weekOf }}/OBJECTIVE</span>
    </div>

    <div class="bg-card border border-border p-6">
      <!-- Internal header -->
      <div class="text-sm mb-4">
        <span class="text-accent">&gt;&gt;&gt;</span>
        <span class="text-muted-foreground ml-2">THIS WEEK'S BIG THING</span>
      </div>

      <!-- Saved state -->
      <template v-if="store.bigThing">
        <div v-if="isEditing" class="flex items-center gap-2">
          <span class="text-accent animate-pulse">_</span>
          <input
            ref="inputRef"
            v-model="editValue"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-xl text-foreground"
            placeholder="Enter your weekly objective..."
            @keydown.enter="handleSubmit"
            @keydown.escape="handleCancel"
            @blur="handleSubmit"
          />
        </div>

        <button
          v-else
          class="w-full text-left group"
          @click="startEditing"
        >
          <span class="text-xl text-foreground">{{ store.bigThing.title }}</span>
          <span class="opacity-0 group-hover:opacity-100 text-muted-foreground ml-2 text-sm">[edit]</span>
        </button>
      </template>

      <!-- Empty state -->
      <template v-else>
        <div v-if="isAdding" class="flex items-center gap-2">
          <span class="text-accent animate-pulse">_</span>
          <input
            ref="addInputRef"
            v-model="newTitle"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-xl text-foreground"
            placeholder="Enter your weekly objective..."
            @keydown.enter="handleAdd"
            @keydown.escape="cancelAdd"
            @blur="handleAdd"
          />
        </div>
        <button
          v-else
          class="w-full text-left group text-muted-foreground hover:text-foreground"
          @click="startAdding"
        >
          <span>&lt;click to set objective&gt;</span>
          <span class="opacity-0 group-hover:opacity-100 ml-2 text-sm">[edit]</span>
        </button>
      </template>
    </div>
  </section>
</template>
