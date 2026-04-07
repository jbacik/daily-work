<script setup lang="ts">
import { useScratchPadStore } from '@/stores/scratchPad'
import { useDebounceFn } from '@vueuse/core'

const store = useScratchPadStore()

const debouncedSave = useDebounceFn(() => {
  store.save()
}, 1000)

function handleInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  store.setContent(value)
  debouncedSave()
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 text-muted-foreground text-sm mb-3">
      <span class="text-primary">$</span>
      <span>vim /tmp/scratch.txt</span>
    </div>

    <div class="border border-border bg-card">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30">
        <span class="text-accent">&gt;&gt;&gt;</span>
        <span class="text-muted-foreground text-xs uppercase tracking-wider">
          Scratch Pad / Follow-ups
        </span>
      </div>

      <textarea
        :value="store.content"
        placeholder="Quick notes, follow-ups, thoughts..."
        class="w-full h-32 p-3 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground/50"
        @input="handleInput"
      />

      <div class="flex items-center justify-between px-3 py-1 border-t border-border text-xs text-muted-foreground">
        <span>-- INSERT --</span>
        <button
          type="button"
          class="text-muted-foreground hover:text-destructive transition-colors"
          @click="store.clean()"
        >
          -- CLEAN --
        </button>
        <span>{{ store.content.length }} chars</span>
      </div>
    </div>
  </div>
</template>
