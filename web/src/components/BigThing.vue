<script setup lang="ts">
import { useWorkItemsStore } from '@/stores/workItems'

const store = useWorkItemsStore()
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold text-amber-700 mb-3">Big Thing</h2>

    <div
      v-if="store.bigThing"
      class="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 flex items-center gap-4"
    >
      <input
        type="checkbox"
        :checked="store.bigThing.isDone"
        class="w-5 h-5 accent-amber-500 shrink-0"
        @change="store.update(store.bigThing!.id, { isDone: !store.bigThing!.isDone })"
      />
      <span
        class="text-2xl font-bold text-amber-900 flex-1"
        :class="{ 'line-through opacity-50': store.bigThing.isDone }"
      >
        {{ store.bigThing.title }}
      </span>
      <button
        class="text-amber-400 hover:text-amber-600 text-sm"
        title="Demote to Small Thing"
        @click="store.demote(store.bigThing!.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        class="text-red-300 hover:text-red-500 text-sm"
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
      class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-6 text-center text-amber-400"
    >
      No Big Thing set for today. Promote a Small Thing!
    </div>
  </section>
</template>
