<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkItemsStore } from '@/stores/workItems'
import { useReadWatchStore } from '@/stores/readWatch'
import BigThing from '@/components/BigThing.vue'
import SmallThingsList from '@/components/SmallThingsList.vue'
import ReadWatchList from '@/components/ReadWatchList.vue'

const workItems = useWorkItemsStore()
const readWatch = useReadWatchStore()

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

onMounted(() => {
  workItems.fetch()
  readWatch.fetch()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header class="text-center">
        <h1 class="text-3xl font-bold text-slate-800">Daily Work</h1>
        <p class="text-slate-500 mt-1">{{ today }}</p>
      </header>

      <BigThing />
      <SmallThingsList />
      <ReadWatchList />
    </div>
  </div>
</template>
