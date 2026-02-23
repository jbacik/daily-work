<script setup lang="ts">
import { ref } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'
import SmallThingItem from './SmallThingItem.vue'

const store = useWorkItemsStore()
const newTitle = ref('')

async function add() {
  const title = newTitle.value.trim()
  if (!title) return
  await store.create(title)
  newTitle.value = ''
}
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold text-slate-700 mb-3">Small Things</h2>

    <div class="bg-white border border-slate-200 rounded-lg">
      <div v-if="store.smallThings.length" class="divide-y divide-slate-100 px-4">
        <SmallThingItem
          v-for="item in store.smallThings"
          :key="item.id"
          :item="item"
        />
      </div>
      <p v-else class="px-4 py-3 text-slate-400 text-sm">No small things yet.</p>

      <form @submit.prevent="add" class="flex gap-2 p-3 border-t border-slate-100">
        <input
          v-model="newTitle"
          type="text"
          placeholder="Add a small thing..."
          class="flex-1 px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="submit"
          class="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-800"
        >
          Add
        </button>
      </form>
    </div>
  </section>
</template>
