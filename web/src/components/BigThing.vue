<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'

const store = useWorkItemsStore()

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
      <span>cat /week/OBJECTIVE</span>
    </div>

    <div
      v-if="store.bigThing"
      class="bg-accent/10 border-2 border-accent p-6 flex items-center gap-4"
    >
      <input
        type="checkbox"
        :checked="store.bigThing.isDone"
        class="w-5 h-5 accent-accent shrink-0"
        @change="store.update(store.bigThing!.id, { isDone: !store.bigThing!.isDone })"
      />

      <div v-if="isEditing" class="flex-1 flex items-center gap-2">
        <span class="text-accent animate-pulse">_</span>
        <input
          ref="inputRef"
          v-model="editValue"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-2xl font-bold text-accent-foreground"
          @keydown.enter="handleSubmit"
          @keydown.escape="handleCancel"
          @blur="handleSubmit"
        />
      </div>

      <button
        v-else
        class="flex-1 text-left group"
        :class="{ 'line-through opacity-50': store.bigThing.isDone }"
        @click="startEditing"
      >
        <span class="text-2xl font-bold text-accent-foreground">{{ store.bigThing.title }}</span>
        <span class="opacity-0 group-hover:opacity-100 text-accent ml-2 text-sm">[edit]</span>
      </button>

      <button
        class="text-destructive/50 hover:text-destructive text-sm"
        title="Delete"
        @click="store.remove(store.bigThing!.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div
      v-else
      class="bg-accent/5 border-2 border-dashed border-accent/50 p-6"
    >
      <div v-if="isAdding" class="flex items-center gap-2">
        <span class="text-accent animate-pulse">_</span>
        <input
          ref="addInputRef"
          v-model="newTitle"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-xl text-foreground"
          placeholder="What's your big thing for today?"
          @keydown.enter="handleAdd"
          @keydown.escape="cancelAdd"
          @blur="handleAdd"
        />
      </div>
      <button
        v-else
        class="w-full text-center text-accent/70 hover:text-accent"
        @click="startAdding"
      >
        &lt;click to set objective&gt;
      </button>
    </div>
  </section>
</template>
