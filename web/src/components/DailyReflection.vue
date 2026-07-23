<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ReflectionsInput } from '@/types'

// Optional starting heights per field. Empty string keeps the default rows="2"
// sizing (used by the clock-out ceremony); the edit modal passes explicit heights.
const { initial = null, winsHeight = '', whinesHeight = '', valueAddsHeight = '' } = defineProps<{
  initial?: ReflectionsInput | null
  winsHeight?: string
  whinesHeight?: string
  valueAddsHeight?: string
}>()

const emit = defineEmits<{
  'update:reflections': [value: ReflectionsInput]
}>()

// Seed from an existing draft so reopening the ceremony restores in-progress text.
// The modal remounts this component on each open, so reading `initial` once is enough.
const wins = ref(initial?.wins ?? '')
const whines = ref(initial?.whines ?? '')
const valueAdds = ref(initial?.valueAdds ?? '')

// Decision 17: no char counter / shortcut — plain textareas, v-model up to parent.
watch([wins, whines, valueAdds], () => {
  emit('update:reflections', {
    wins: wins.value,
    whines: whines.value,
    valueAdds: valueAdds.value,
  })
})
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="daily-reflection">
    <!-- Section header -->
    <div class="flex items-center gap-2">
      <span class="text-accent">&gt;&gt;&gt;</span>
      <span class="text-xs uppercase tracking-widest text-muted-foreground">Daily Reflection</span>
      <span class="text-[10px] italic lowercase tracking-wide text-muted-foreground">(optional)</span>
    </div>

    <!-- Wins -->
    <div class="flex flex-col gap-1">
      <label class="flex items-center gap-1.5 text-xs text-foreground tracking-wide" for="reflect-wins">
        <span class="text-success">✓</span> Wins
      </label>
      <textarea
        id="reflect-wins"
        v-model="wins"
        rows="2"
        :style="winsHeight ? { height: winsHeight } : undefined"
        placeholder="What landed today?"
        class="font-mono text-sm bg-input border border-border px-3 py-2 text-foreground resize-y outline-none focus:border-primary placeholder:italic placeholder:text-muted-foreground"
        data-testid="reflect-wins"
      ></textarea>
    </div>

    <!-- Whines -->
    <div class="flex flex-col gap-1">
      <label class="flex items-center gap-1.5 text-xs text-foreground tracking-wide" for="reflect-whines">
        <span class="text-destructive">!</span> Whines
      </label>
      <textarea
        id="reflect-whines"
        v-model="whines"
        rows="2"
        :style="whinesHeight ? { height: whinesHeight } : undefined"
        placeholder="What blocked or frustrated you?"
        class="font-mono text-sm bg-input border border-border px-3 py-2 text-foreground resize-y outline-none focus:border-primary placeholder:italic placeholder:text-muted-foreground"
        data-testid="reflect-whines"
      ></textarea>
    </div>

    <!-- Value Adds -->
    <div class="flex flex-col gap-1">
      <label class="flex items-center gap-1.5 text-xs text-foreground tracking-wide" for="reflect-value-adds">
        <span class="text-accent">+</span> Value Adds
      </label>
      <textarea
        id="reflect-value-adds"
        v-model="valueAdds"
        rows="2"
        :style="valueAddsHeight ? { height: valueAddsHeight } : undefined"
        placeholder="Anything extra worth flagging for the recap?"
        class="font-mono text-sm bg-input border border-border px-3 py-2 text-foreground resize-y outline-none focus:border-primary placeholder:italic placeholder:text-muted-foreground"
        data-testid="reflect-value-adds"
      ></textarea>
    </div>
  </div>
</template>
