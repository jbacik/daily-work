<script setup lang="ts">
import { ref } from 'vue'
import type { ForecastStatus } from '@/types'

const { status, fileName = null, error = null } = defineProps<{
  status: ForecastStatus
  fileName?: string | null
  error?: string | null
}>()

const emit = defineEmits<{
  pick: [content: string, name: string]
  unload: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const content = await readFileText(file)
  emit('pick', content, file.name)
  input.value = ''
}
</script>

<template>
  <div class="flex items-center gap-3 text-sm flex-wrap" data-testid="forecast-loader">
    <span class="text-accent">&#9656;</span>
    <span class="text-muted-foreground text-xs uppercase tracking-wider">forecast</span>

    <span v-if="status === 'loading'" class="text-muted-foreground" data-testid="forecast-scanning">
      scanning local filesystem<span class="inline-block w-2 bg-accent animate-blink ml-0.5">&nbsp;</span>
    </span>

    <span v-else-if="status === 'loaded'" class="inline-flex items-center gap-2 flex-1 min-w-0">
      <span class="text-primary font-bold">&#10003; loaded</span>
      <span class="text-muted-foreground">daily forecast</span>
      <code
        class="border border-border bg-secondary px-1.5 text-xs text-foreground"
        data-testid="forecast-filename"
      >{{ fileName }}</code>
      <button
        class="ml-auto text-muted-foreground hover:text-destructive text-xs"
        title="Unload this forecast"
        data-testid="forecast-unload"
        @click="emit('unload')"
      >
        &#10005;
      </button>
    </span>

    <span v-else class="inline-flex items-center gap-3 flex-wrap">
      <span class="text-destructive" data-testid="forecast-missing">&#9888; no forecast file found for today</span>
      <button
        class="text-muted-foreground hover:text-primary text-xs"
        data-testid="forecast-pick"
        @click="fileInputRef?.click()"
      >
        [&#8981; locate forecast file&hellip;]
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json,application/json"
        class="hidden"
        data-testid="forecast-file-input"
        @change="onFileChange"
      />
      <span v-if="error" class="text-destructive text-xs" data-testid="forecast-error">
        <span class="text-accent">ERR:</span> {{ error }}
      </span>
    </span>
  </div>
</template>
