<script setup lang="ts">
import { ref } from 'vue'
import { useReadWatchStore } from '@/stores/readWatch'
import ReadWatchItem from './ReadWatchItem.vue'

const store = useReadWatchStore()
const newTitle = ref('')
const newUrl = ref('')

async function add() {
  const title = newTitle.value.trim()
  const url = newUrl.value.trim()
  if (!title || !url) return
  await store.create(title, url)
  newTitle.value = ''
  newUrl.value = ''
}
</script>

<template>
  <section>
    <h2 class="text-lg font-semibold text-indigo-700 mb-3">Read / Watch</h2>

    <div class="bg-white border border-indigo-200 rounded-lg">
      <div v-if="store.items.length" class="divide-y divide-indigo-50 px-4">
        <ReadWatchItem
          v-for="item in store.items"
          :key="item.id"
          :item="item"
        />
      </div>
      <p v-else class="px-4 py-3 text-indigo-300 text-sm">No links yet. Add up to 5.</p>

      <form
        v-if="store.items.length < 5"
        @submit.prevent="add"
        class="flex gap-2 p-3 border-t border-indigo-100"
      >
        <input
          v-model="newTitle"
          type="text"
          placeholder="Title"
          class="flex-1 px-3 py-1.5 border border-indigo-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          v-model="newUrl"
          type="url"
          placeholder="https://..."
          class="flex-1 px-3 py-1.5 border border-indigo-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          type="submit"
          class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
        >
          Add
        </button>
      </form>
    </div>
  </section>
</template>
